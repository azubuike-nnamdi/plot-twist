import "server-only"

import { randomInt } from "node:crypto"

import { Prisma, type PrismaClient } from "@prisma/client"

import { answerError } from "@/features/answers/rules"
import { guessError } from "@/features/guesses/rules"
import { createRoomCode } from "@/features/rooms/codes"
import {
  canTransitionRoom,
  canTransitionRound,
  chooseNextHost,
  type RoundStatus,
} from "@/features/rooms/transitions"
import { buildRoomView, type ViewInput } from "@/features/rooms/view"
import { guessesToScore } from "@/features/scoring/score"
import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import { AppError } from "@/lib/errors"
import { isAvatar, REACTIONS } from "@/lib/game/options"
import type { RoomPreview, RoomView } from "@/types/room"

type Tx = Prisma.TransactionClient

const roomInclude = {
  players: true,
  categories: { include: { category: true } },
  rounds: {
    include: {
      answers: { include: { guesses: true } },
      question: { include: { category: true } },
      reactions: true,
    },
  },
} satisfies Prisma.RoomInclude

type LoadedRoom = Prisma.RoomGetPayload<{ include: typeof roomInclude }>

function activePlayers(room: LoadedRoom) {
  return room.players.filter(
    (player) => player.status === "JOINED" || player.status === "READY"
  )
}

function latestRound(room: LoadedRoom) {
  return [...room.rounds].sort((left, right) => right.roundNumber - left.roundNumber)[0] ?? null
}

async function lockRoom(tx: Tx, roomId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Room" WHERE "id" = ${roomId} FOR UPDATE
  `
  if (rows.length !== 1) throw new AppError("Room not found.", "NOT_FOUND")
}

async function loadRoom(db: Tx | PrismaClient, roomId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: roomInclude,
  })
  if (!room) throw new AppError("Room not found.", "NOT_FOUND")
  return room
}

function assertHost(userId: string, hostId: string) {
  if (userId !== hostId) {
    throw new AppError("Only the host can do that.", "FORBIDDEN")
  }
}

function assertOpen(room: LoadedRoom) {
  if (room.status === "CLOSED") {
    throw new AppError("This room is closed.", "CONFLICT")
  }
  if (room.expiresAt.getTime() < Date.now() && room.status === "WAITING") {
    throw new AppError("This room has expired.", "CONFLICT")
  }
}

async function settings(db: Tx | PrismaClient) {
  return db.platformSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  })
}

async function pickQuestion(
  tx: Tx,
  room: LoadedRoom,
  exclude: string[]
) {
  const categoryIds = room.categories.map((item) => item.categoryId)
  const questions = await tx.question.findMany({
    where: {
      isActive: true,
      categoryId: { in: categoryIds },
      id: { notIn: exclude },
      ...(room.cleanFilter
        ? { isAdult: false, category: { isAdult: false } }
        : {}),
    },
    select: { id: true },
  })
  if (questions.length === 0) return null
  return questions[randomInt(questions.length)]?.id ?? null
}

async function scoreRound(tx: Tx, round: LoadedRoom["rounds"][number]) {
  const pending = round.answers.flatMap((answer) =>
    answer.guesses.map((guess) => ({
      id: guess.id,
      guesserId: guess.guesserId,
      isCorrect: guess.guessedPlayerId === answer.playerId,
      pointsAwarded: guess.pointsAwarded,
    }))
  )
  const updates = guessesToScore(pending)
  for (const update of updates) {
    const source = pending.find((guess) => guess.id === update.id)
    if (!source) continue
    await tx.guess.update({
      where: { id: update.id },
      data: {
        isCorrect: update.isCorrect,
        pointsAwarded: update.pointsAwarded,
      },
    })
    if (update.pointsAwarded > 0) {
      await tx.roomPlayer.update({
        where: { id: source.guesserId },
        data: { score: { increment: update.pointsAwarded } },
      })
    }
  }
}

async function advanceLocked(tx: Tx, roomId: string, now: Date) {
  await lockRoom(tx, roomId)
  let room = await loadRoom(tx, roomId)
  const nextHost = chooseNextHost(
    room.players.map((player) => ({
      userId: player.userId,
      joinedAt: player.joinedAt.getTime(),
      lastSeenAt: player.lastSeenAt.getTime(),
      status: player.status,
    })),
    room.hostId,
    now.getTime()
  )
  if (nextHost && nextHost !== room.hostId) {
    await tx.room.update({
      where: { id: room.id },
      data: { hostId: nextHost },
    })
    room = await loadRoom(tx, roomId)
  }
  if (room.status !== "IN_PROGRESS") return room
  const round = latestRound(room)
  if (!round) return room
  const active = activePlayers(room)
  const deadline = round.phaseDeadlineAt?.getTime() ?? null
  const timedOut = deadline !== null && now.getTime() >= deadline
  if (round.status === "ANSWERING") {
    const everyoneAnswered =
      active.length > 0 &&
      active.every((player) =>
        round.answers.some((answer) => answer.playerId === player.id)
      )
    if (timedOut || everyoneAnswered) {
      if (!canTransitionRound("ANSWERING", "GUESSING")) {
        throw new AppError("That round cannot move to guessing.", "CONFLICT")
      }
      for (const answer of round.answers) {
        await tx.answer.update({
          where: { id: answer.id },
          data: { sortKey: randomInt(1, 1_000_000) },
        })
      }
      const nextStatus: RoundStatus =
        round.answers.length === 0 ? "REVEAL" : "GUESSING"
      if (nextStatus === "REVEAL" && !canTransitionRound("GUESSING", "REVEAL")) {
        throw new AppError("That round cannot be revealed.", "CONFLICT")
      }
      await tx.round.update({
        where: { id: round.id },
        data: {
          status: "GUESSING",
          phaseDeadlineAt: new Date(now.getTime() + room.guessingTimer * 1000),
        },
      })
      if (round.answers.length === 0) {
        await tx.round.update({
          where: { id: round.id },
          data: { status: "REVEAL", phaseDeadlineAt: null },
        })
      }
    }
  }
  room = await loadRoom(tx, roomId)
  const guessing = latestRound(room)
  if (room.status === "IN_PROGRESS" && guessing?.status === "GUESSING") {
    const guessers = activePlayers(room)
    const answers = guessing.answers
    const finished =
      answers.length === 0 ||
      guessers.every((player) =>
        answers
          .filter((answer) => answer.playerId !== player.id)
          .every((answer) =>
            answer.guesses.some((guess) => guess.guesserId === player.id)
          )
      )
    const guessDeadline = guessing.phaseDeadlineAt?.getTime() ?? null
    const guessTimedOut = guessDeadline !== null && now.getTime() >= guessDeadline
    if (finished || guessTimedOut) {
      if (!canTransitionRound("GUESSING", "REVEAL")) {
        throw new AppError("That round cannot be revealed.", "CONFLICT")
      }
      await scoreRound(tx, guessing)
      await tx.round.update({
        where: { id: guessing.id },
        data: { status: "REVEAL", phaseDeadlineAt: null },
      })
    }
  }
  return loadRoom(tx, roomId)
}

export async function advanceRoom(roomId: string, now = new Date()) {
  await prisma.$transaction((tx) => advanceLocked(tx, roomId, now))
}

function toView(room: LoadedRoom, viewerUserId: string, now: Date): RoomView {
  const round = latestRound(room)
  const input: ViewInput = {
    now: now.toISOString(),
    code: room.roomCode,
    name: room.name,
    status: room.status,
    hostId: room.hostId,
    viewerUserId,
    maxPlayers: room.maxPlayers,
    totalRounds: room.totalRounds,
    currentRound: room.currentRound,
    answerSeconds: room.answerTimer,
    guessingSeconds: room.guessingTimer,
    categories: room.categories.map((item) => item.category.name),
    players: room.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      displayName: player.displayName,
      avatar: player.avatar,
      score: player.score,
      status: player.status,
      joinedAt: player.joinedAt.toISOString(),
    })),
    round: round
      ? {
          status: round.status,
          deadlineAt: round.phaseDeadlineAt?.toISOString() ?? null,
          question: round.question.text,
          categoryName: round.question.category.name,
          answers: round.answers.map((answer) => ({
            id: answer.id,
            playerId: answer.playerId,
            text: answer.answerText,
            removed: answer.removed,
            sortKey: answer.sortKey,
            guesses: answer.guesses.map((guess) => ({
              guesserId: guess.guesserId,
              guessedPlayerId: guess.guessedPlayerId,
              isCorrect: guess.isCorrect,
              pointsAwarded: guess.pointsAwarded,
            })),
          })),
          reactions: round.reactions.map((reaction) => ({
            emoji: reaction.emoji,
            playerId: reaction.playerId,
          })),
        }
      : null,
    history: room.rounds.flatMap((item) =>
      item.answers.flatMap((answer) =>
        answer.guesses.map((guess) => ({
          guesserId: guess.guesserId,
          isCorrect: guess.isCorrect,
          pointsAwarded: guess.pointsAwarded,
        }))
      )
    ),
  }
  return buildRoomView(input)
}

async function roomIdForCode(code: string) {
  const room = await prisma.room.findUnique({
    where: { roomCode: code },
    select: { id: true },
  })
  if (!room) throw new AppError("We couldn't find that room.", "NOT_FOUND")
  return room.id
}

export async function getRoomView(code: string, userId: string) {
  const roomId = await roomIdForCode(code)
  const membership = await prisma.roomPlayer.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  if (!membership || membership.status === "REMOVED" || membership.status === "LEFT") {
    throw new AppError("Join this room before opening it.", "FORBIDDEN")
  }
  await prisma.roomPlayer.update({
    where: { id: membership.id },
    data: { lastSeenAt: new Date() },
  })
  const now = new Date()
  await advanceRoom(roomId, now)
  const room = await loadRoom(prisma, roomId)
  return toView(room, userId, now)
}

export async function previewRoom(code: string): Promise<RoomPreview> {
  const room = await prisma.room.findUnique({
    where: { roomCode: code },
    include: { players: true, categories: { include: { category: true } } },
  })
  if (!room) throw new AppError("We couldn't find that room.", "NOT_FOUND")
  return {
    code: room.roomCode,
    name: room.name,
    status: room.status,
    playerCount: room.players.filter(
      (player) => player.status === "JOINED" || player.status === "READY"
    ).length,
    maxPlayers: room.maxPlayers,
    categories: room.categories.map((item) => item.category.name),
    expired: room.expiresAt.getTime() < Date.now(),
  }
}

export async function createRoom(input: {
  hostId: string
  hostName: string
  avatar: string
  name: string
  categoryIds: string[]
  totalRounds: number
  maxPlayers: number
  answerTimer: number
  guessingTimer: number
  cleanFilter: boolean
}) {
  const config = await settings(prisma)
  const categories = await prisma.category.findMany({
    where: { id: { in: input.categoryIds }, isActive: true },
  })
  if (categories.length !== input.categoryIds.length) {
    throw new AppError("Choose active prompt packs.", "VALIDATION")
  }
  if (input.cleanFilter && categories.every((category) => category.isAdult)) {
    throw new AppError("Turn off the clean filter or pick an all-ages pack.", "VALIDATION")
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = createRoomCode()
    try {
      const room = await prisma.room.create({
        data: {
          roomCode,
          name: input.name,
          hostId: input.hostId,
          maxPlayers: input.maxPlayers,
          totalRounds: input.totalRounds,
          answerTimer: input.answerTimer,
          guessingTimer: input.guessingTimer,
          cleanFilter: input.cleanFilter,
          expiresAt: new Date(Date.now() + config.roomLifetimeMinutes * 60_000),
          categories: {
            create: input.categoryIds.map((categoryId) => ({ categoryId })),
          },
          players: {
            create: {
              userId: input.hostId,
              displayName: input.hostName,
              avatar: input.avatar,
              playerRole: "HOST",
              status: "READY",
            },
          },
        },
      })
      return room.roomCode
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue
      }
      throw error
    }
  }
  throw new AppError("Could not create a room code. Try again.", "CONFLICT")
}

export async function joinRoom(input: {
  userId: string
  code: string
  displayName: string
  avatar: string
}) {
  if (!isAvatar(input.avatar)) {
    throw new AppError("Choose an avatar.", "VALIDATION")
  }
  const displayName = input.displayName.trim()
  if (displayName.length < 2 || displayName.length > 18) {
    throw new AppError("Display names are 2 to 18 characters.", "VALIDATION")
  }
  const roomId = await roomIdForCode(input.code)
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId)
    const room = await loadRoom(tx, roomId)
    assertOpen(room)
    if (room.status !== "WAITING") {
      throw new AppError("This room is no longer accepting players.", "CONFLICT")
    }
    const existing = room.players.find((player) => player.userId === input.userId)
    const active = activePlayers(room)
    if (!existing && active.length >= room.maxPlayers) {
      throw new AppError("This room is full.", "CONFLICT")
    }
    if (existing?.status === "REMOVED") {
      throw new AppError("The host removed you from this room.", "FORBIDDEN")
    }
    if (existing && (existing.status === "JOINED" || existing.status === "READY")) {
      throw new AppError("You are already in this room.", "CONFLICT")
    }
    if (existing) {
      await tx.roomPlayer.update({
        where: { id: existing.id },
        data: {
          status: "JOINED",
          displayName,
          avatar: input.avatar,
          lastSeenAt: new Date(),
        },
      })
      return
    }
    await tx.roomPlayer.create({
      data: {
        roomId,
        userId: input.userId,
        displayName,
        avatar: input.avatar,
        status: "JOINED",
      },
    })
  })
}

export async function setReady(userId: string, code: string, ready: boolean) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId)
    const room = await loadRoom(tx, roomId)
    if (room.status !== "WAITING") {
      throw new AppError("The game has already started.", "CONFLICT")
    }
    const player = room.players.find((item) => item.userId === userId)
    if (!player || player.status === "REMOVED" || player.status === "LEFT") {
      throw new AppError("You are not in this room.", "FORBIDDEN")
    }
    await tx.roomPlayer.update({
      where: { id: player.id },
      data: { status: ready ? "READY" : "JOINED", lastSeenAt: new Date() },
    })
  })
}

export async function leaveRoom(userId: string, code: string) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId)
    const room = await loadRoom(tx, roomId)
    const player = room.players.find((item) => item.userId === userId)
    if (!player) throw new AppError("You are not in this room.", "FORBIDDEN")
    await tx.roomPlayer.update({
      where: { id: player.id },
      data: { status: "LEFT", lastSeenAt: new Date() },
    })
    const now = new Date()
    const nextHost = chooseNextHost(
      room.players.map((item) => ({
        userId: item.userId,
        joinedAt: item.joinedAt.getTime(),
        lastSeenAt: item.userId === userId ? 0 : item.lastSeenAt.getTime(),
        status: item.userId === userId ? "LEFT" : item.status,
      })),
      room.hostId,
      now.getTime()
    )
    if (nextHost && nextHost !== room.hostId) {
      await tx.room.update({ where: { id: room.id }, data: { hostId: nextHost } })
    }
  })
}

export async function removePlayer(hostId: string, code: string, playerId: string) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    const room = await advanceLocked(tx, roomId, new Date())
    assertHost(hostId, room.hostId)
    const player = room.players.find((item) => item.id === playerId)
    if (!player) throw new AppError("Player not found.", "NOT_FOUND")
    if (player.userId === hostId) {
      throw new AppError("The host cannot remove themselves.", "VALIDATION")
    }
    await tx.roomPlayer.update({
      where: { id: player.id },
      data: { status: "REMOVED" },
    })
  })
}

export async function startGame(hostId: string, code: string) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    const room = await advanceLocked(tx, roomId, new Date())
    assertOpen(room)
    assertHost(hostId, room.hostId)
    if (!canTransitionRoom(room.status, "IN_PROGRESS")) {
      throw new AppError("This room cannot be started.", "CONFLICT")
    }
    const config = await settings(tx)
    if (activePlayers(room).length < config.minPlayers) {
      throw new AppError(
        `At least ${config.minPlayers} players are required.`,
        "CONFLICT"
      )
    }
    const questionId = await pickQuestion(tx, room, [])
    if (!questionId) throw new AppError("No questions are available.", "CONFLICT")
    const now = new Date()
    await tx.round.create({
      data: {
        roomId: room.id,
        roundNumber: 1,
        questionId,
        status: "ANSWERING",
        phaseDeadlineAt: new Date(now.getTime() + room.answerTimer * 1000),
        startedAt: now,
      },
    })
    await tx.room.update({
      where: { id: room.id },
      data: { status: "IN_PROGRESS", currentRound: 1 },
    })
  })
}

export async function submitAnswer(userId: string, code: string, text: string) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    const now = new Date()
    const room = await advanceLocked(tx, roomId, now)
    const round = latestRound(room)
    const player = activePlayers(room).find((item) => item.userId === userId)
    const error = answerError({
      phase: round?.status ?? "PENDING",
      isActiveMember: Boolean(player),
      alreadySubmitted: Boolean(
        player && round?.answers.some((answer) => answer.playerId === player.id)
      ),
      text,
      now: now.getTime(),
      deadline: round?.phaseDeadlineAt?.getTime() ?? null,
    })
    if (error || !player || !round) throw new AppError(error ?? "Answer rejected.")
    await tx.answer.create({
      data: {
        roundId: round.id,
        playerId: player.id,
        answerText: text.trim(),
      },
    })
    await advanceLocked(tx, roomId, now)
  })
}

export async function submitGuess(input: {
  userId: string
  code: string
  answerId: string
  guessedPlayerId: string
}) {
  const roomId = await roomIdForCode(input.code)
  await prisma.$transaction(async (tx) => {
    const now = new Date()
    const room = await advanceLocked(tx, roomId, now)
    const round = latestRound(room)
    const player = activePlayers(room).find((item) => item.userId === input.userId)
    const answer = round?.answers.find((item) => item.id === input.answerId)
    if (!answer || !round) throw new AppError("Answer not found.", "NOT_FOUND")
    const error = guessError({
      phase: round.status,
      isActiveMember: Boolean(player),
      guesserPlayerId: player?.id ?? "",
      authorPlayerId: answer.playerId,
      guessedPlayerId: input.guessedPlayerId,
      activePlayerIds: activePlayers(room).map((item) => item.id),
      alreadyGuessed: answer.guesses.some((guess) => guess.guesserId === player?.id),
      now: now.getTime(),
      deadline: round.phaseDeadlineAt?.getTime() ?? null,
    })
    if (error || !player) throw new AppError(error ?? "Guess rejected.")
    await tx.guess.create({
      data: {
        answerId: answer.id,
        guesserId: player.id,
        guessedPlayerId: input.guessedPlayerId,
      },
    })
    await advanceLocked(tx, roomId, now)
  })
}

export async function reactToRound(userId: string, code: string, emoji: string) {
  if (!REACTIONS.includes(emoji as (typeof REACTIONS)[number])) {
    throw new AppError("That reaction is not available.", "VALIDATION")
  }
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    const room = await advanceLocked(tx, roomId, new Date())
    const round = latestRound(room)
    const player = activePlayers(room).find((item) => item.userId === userId)
    if (!player || !round || round.status !== "REVEAL") {
      throw new AppError("Reactions are open during the reveal.", "CONFLICT")
    }
    const recent = await tx.reaction.count({
      where: {
        playerId: player.id,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
    })
    if (recent >= 20) {
      throw new AppError("Slow down on those reactions.", "RATE_LIMIT")
    }
    await tx.reaction.create({
      data: { roundId: round.id, playerId: player.id, emoji },
    })
  })
}

export async function nextRound(hostId: string, code: string) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    const room = await advanceLocked(tx, roomId, new Date())
    assertHost(hostId, room.hostId)
    const round = latestRound(room)
    if (!round || round.status !== "REVEAL") {
      throw new AppError("Finish the reveal before the next round.", "CONFLICT")
    }
    if (!canTransitionRound(round.status, "COMPLETED")) {
      throw new AppError("That round cannot be completed.", "CONFLICT")
    }
    await tx.round.update({
      where: { id: round.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    })
    if (room.currentRound >= room.totalRounds) {
      if (!canTransitionRoom(room.status, "COMPLETED")) {
        throw new AppError("This game cannot be completed.", "CONFLICT")
      }
      await tx.room.update({
        where: { id: room.id },
        data: { status: "COMPLETED" },
      })
      return
    }
    const used = room.rounds.map((item) => item.questionId)
    const questionId = await pickQuestion(tx, room, used)
    if (!questionId) throw new AppError("No questions left in these packs.", "CONFLICT")
    const now = new Date()
    await tx.round.create({
      data: {
        roomId: room.id,
        roundNumber: room.currentRound + 1,
        questionId,
        status: "ANSWERING",
        phaseDeadlineAt: new Date(now.getTime() + room.answerTimer * 1000),
        startedAt: now,
      },
    })
    await tx.room.update({
      where: { id: room.id },
      data: { currentRound: room.currentRound + 1 },
    })
  })
}

export async function skipQuestion(hostId: string, code: string) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    const room = await advanceLocked(tx, roomId, new Date())
    assertHost(hostId, room.hostId)
    const round = latestRound(room)
    if (!round || round.status !== "ANSWERING") {
      throw new AppError("You can skip a question while players are answering.", "CONFLICT")
    }
    const questionId = await pickQuestion(tx, room, [
      ...room.rounds.map((item) => item.questionId),
      round.questionId,
    ])
    if (!questionId) throw new AppError("No replacement question is available.", "CONFLICT")
    await tx.answer.deleteMany({ where: { roundId: round.id } })
    await tx.round.update({
      where: { id: round.id },
      data: {
        questionId,
        phaseDeadlineAt: new Date(Date.now() + room.answerTimer * 1000),
      },
    })
  })
}

export async function endGame(hostId: string, code: string) {
  const roomId = await roomIdForCode(code)
  await prisma.$transaction(async (tx) => {
    const room = await advanceLocked(tx, roomId, new Date())
    assertHost(hostId, room.hostId)
    if (!canTransitionRoom(room.status, "COMPLETED")) {
      throw new AppError("This game cannot be ended.", "CONFLICT")
    }
    const round = latestRound(room)
    if (round && round.status !== "COMPLETED") {
      if (round.status === "ANSWERING") {
        await tx.round.update({
          where: { id: round.id },
          data: { status: "GUESSING" },
        })
      }
      if (round.status === "ANSWERING" || round.status === "GUESSING") {
        await scoreRound(tx, round)
        await tx.round.update({
          where: { id: round.id },
          data: { status: "REVEAL" },
        })
      }
      await tx.round.update({
        where: { id: round.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          phaseDeadlineAt: null,
        },
      })
    }
    await tx.room.update({
      where: { id: room.id },
      data: { status: "COMPLETED" },
    })
  })
}

export async function closeRoom(input: {
  actorId: string
  code: string
  asStaff?: boolean
  reason?: string
}) {
  const roomId = await roomIdForCode(input.code)
  await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId)
    const room = await loadRoom(tx, roomId)
    if (!input.asStaff) assertHost(input.actorId, room.hostId)
    if (room.status === "CLOSED") return
    if (!canTransitionRoom(room.status, "CLOSED")) {
      throw new AppError("This room cannot be closed.", "CONFLICT")
    }
    await tx.room.update({ where: { id: room.id }, data: { status: "CLOSED" } })
  })
  if (input.asStaff) {
    await writeAudit({
      actorId: input.actorId,
      action: "room.close",
      targetType: "ROOM",
      targetId: roomId,
      metadata: { reason: input.reason ?? "" },
    })
  }
}

export async function rematch(hostId: string, code: string) {
  const roomId = await roomIdForCode(code)
  return prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId)
    const room = await loadRoom(tx, roomId)
    assertHost(hostId, room.hostId)
    if (room.status !== "COMPLETED") {
      throw new AppError("Finish the game before a rematch.", "CONFLICT")
    }
    const config = await settings(tx)
    const players = activePlayers(room)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const created = await tx.room.create({
          data: {
            roomCode: createRoomCode(),
            name: room.name,
            hostId,
            maxPlayers: room.maxPlayers,
            totalRounds: room.totalRounds,
            answerTimer: room.answerTimer,
            guessingTimer: room.guessingTimer,
            cleanFilter: room.cleanFilter,
            expiresAt: new Date(Date.now() + config.roomLifetimeMinutes * 60_000),
            categories: {
              create: room.categories.map((item) => ({
                categoryId: item.categoryId,
              })),
            },
            players: {
              create: players.map((player) => ({
                userId: player.userId,
                displayName: player.displayName,
                avatar: player.avatar,
                playerRole: player.userId === hostId ? "HOST" : "PLAYER",
                status: "JOINED" as const,
              })),
            },
          },
        })
        return created.roomCode
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue
        }
        throw error
      }
    }
    throw new AppError("Could not start a rematch. Try again.", "CONFLICT")
  })
}

export async function reportAnswer(input: {
  userId: string
  code: string
  answerId: string
  reason: string
}) {
  const reason = input.reason.trim()
  if (reason.length < 4 || reason.length > 500) {
    throw new AppError("Describe the report in 4 to 500 characters.", "VALIDATION")
  }
  const roomId = await roomIdForCode(input.code)
  const room = await loadRoom(prisma, roomId)
  const player = room.players.find((item) => item.userId === input.userId)
  if (!player) throw new AppError("You are not in this room.", "FORBIDDEN")
  const answer = room.rounds
    .flatMap((round) => round.answers)
    .find((item) => item.id === input.answerId)
  if (!answer) throw new AppError("Answer not found.", "NOT_FOUND")
  await prisma.report.create({
    data: {
      reporterId: input.userId,
      targetType: "ANSWER",
      targetId: answer.id,
      reason,
    },
  })
}
