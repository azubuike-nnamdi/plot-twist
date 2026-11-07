import "server-only"

import { randomInt } from "node:crypto"

import { Prisma } from "@prisma/client"

import { answerError } from "@/features/answers/rules"
import { guessError } from "@/features/guesses/rules"
import { createRoomCode, formatRoomCode } from "@/features/rooms/codes"
import { adultPackError } from "@/features/rooms/audience"
import { choosePrompt } from "@/features/rooms/prompts"
import {
  canTransitionRoom,
  canTransitionRound,
  chooseNextHost,
  phaseNeedsAdvance,
} from "@/features/rooms/transitions"
import { buildRoomView, type ViewInput } from "@/features/rooms/view"
import { CORRECT_GUESS_POINTS, tallyRound } from "@/features/scoring/score"
import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import { publishRoomChanges } from "@/lib/realtime/publish"
import { env } from "@/lib/env"
import { sendReportNotice } from "@/lib/mail/messages"
import { AppError } from "@/lib/errors"
import { isAvatar, isUploadAvatar, uploadOwnerId } from "@/lib/avatars"
import { guessTimerFor, REACTIONS } from "@/lib/game/options"
import { canReuseView, presenceIsStale } from "@/features/rooms/poll"
import type { RoomPollUnchanged, RoomPreview, RoomView } from "@/types/room"

type Tx = Prisma.TransactionClient
type PrismaClient = Prisma.DefaultPrismaClient

const roomTransaction = { timeout: 15_000, maxWait: 10_000 } as const

// Rooms each transaction locked, with their newest version. Published only
// after commit, so nobody is told about a write that rolled back.
const lockedInTransaction = new WeakMap<Tx, Map<string, number>>()

async function runRoomTransaction<T>(fn: (tx: Tx) => Promise<T>) {
  let changed: Map<string, number> | undefined
  const result = await prisma.$transaction(async (tx) => {
    const value = await fn(tx)
    changed = lockedInTransaction.get(tx)
    return value
  }, roomTransaction)
  if (changed) {
    publishRoomChanges([...changed].map(([code, version]) => ({ code, version })))
  }
  return result
}

const roomInclude = Prisma.validator<Prisma.RoomInclude>()({
  players: { include: { user: { select: { isAnonymous: true } } } },
  categories: { include: { category: true } },
  // Only the current round. Hot actions (answers, votes) run under the room
  // lock, so they must not drag every past round through it. Code that needs
  // older rounds queries them directly (usedPackQuestionIds, roomHistory).
  rounds: {
    orderBy: { roundNumber: "desc" },
    take: 1,
    include: {
      answers: { include: { guesses: true } },
      question: { include: { category: true } },
      roomPrompt: { include: { player: { select: { displayName: true } } } },
      reactions: true,
    },
  },
})

type LoadedRoom = Prisma.RoomGetPayload<{ include: typeof roomInclude }>

function activePlayers(room: LoadedRoom) {
  return room.players.filter(
    (player) => player.status === "JOINED" || player.status === "READY"
  )
}

function latestRound(room: LoadedRoom) {
  return room.rounds[0] ?? null
}

function hostCandidates(
  room: LoadedRoom,
  patch?: {
    userId: string
    status: "JOINED" | "READY" | "LEFT" | "REMOVED"
    lastSeenAt: number
  }
) {
  return room.players.map((player) => ({
    userId: player.userId,
    joinedAt: player.joinedAt.getTime(),
    lastSeenAt:
      patch?.userId === player.userId ? patch.lastSeenAt : player.lastSeenAt.getTime(),
    status: patch?.userId === player.userId ? patch.status : player.status,
    canHost: !player.user.isAnonymous,
  }))
}

async function applyHostSeat(tx: Tx, room: LoadedRoom, now: Date) {
  const nextHost = chooseNextHost(hostCandidates(room), room.hostId, now.getTime())
  if (nextHost === room.hostId) return room
  if (!nextHost) {
    if (room.status !== "CLOSED" && canTransitionRoom(room.status, "CLOSED")) {
      await tx.room.update({
        where: { id: room.id },
        data: { status: "CLOSED" },
      })
    }
    return loadRoom(tx, room.id)
  }
  await tx.room.update({
    where: { id: room.id },
    data: { hostId: nextHost },
  })
  return loadRoom(tx, room.id)
}

// Takes the room row lock and bumps the version in one statement. Every write
// to room state goes through here, so a poll can tell whether anything changed.
// If the transaction rolls back, the bump rolls back with it.
async function lockRoom(tx: Tx, roomId: string) {
  const rows = await tx.$queryRaw<Array<{ roomCode: string; version: number }>>`
    UPDATE "Room"
    SET "version" = "version" + 1, "updatedAt" = NOW()
    WHERE "id" = ${roomId}
    RETURNING "roomCode", "version"
  `
  const row = rows[0]
  if (rows.length !== 1 || !row) throw new AppError("Room not found.", "NOT_FOUND")
  const locked = lockedInTransaction.get(tx) ?? new Map<string, number>()
  locked.set(row.roomCode, Number(row.version))
  lockedInTransaction.set(tx, locked)
}

async function loadRoom(db: Tx | PrismaClient, roomId: string): Promise<LoadedRoom> {
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

async function usedPackQuestionIds(tx: Tx, roomId: string) {
  const rounds = await tx.round.findMany({
    where: { roomId, questionId: { not: null } },
    select: { questionId: true },
  })
  return rounds.flatMap((round) => (round.questionId ? [round.questionId] : []))
}

/** Every vote in the match, for leaderboard stats. Small rows, no answer text. */
function roomHistory(db: Tx | PrismaClient, roomId: string) {
  return db.guess.findMany({
    where: { answer: { round: { roomId } } },
    select: {
      guesserId: true,
      isCorrect: true,
      pointsAwarded: true,
      answer: { select: { playerId: true } },
    },
  })
}

type RoomHistory = Awaited<ReturnType<typeof roomHistory>>

async function drawPrompt(tx: Tx, room: LoadedRoom, exclude: string[]) {
  const categoryIds = room.categories.map((item) => item.categoryId)
  const packQuestions = await tx.question.findMany({
    where: {
      isActive: true,
      categoryId: { in: categoryIds },
      id: { notIn: exclude },
      ...(room.cleanFilter
        ? { isAdult: false, category: { isAdult: false } }
        : {}),
    },
    select: { id: true, text: true, category: { select: { name: true } } },
  })
  const userIds = activePlayers(room).map((player) => player.userId)
  const seenRows =
    userIds.length === 0 || packQuestions.length === 0
      ? []
      : await tx.round.findMany({
        where: {
          questionId: { in: packQuestions.map((question) => question.id) },
          room: { players: { some: { userId: { in: userIds } } } },
        },
        select: { questionId: true },
      })
  const seenIds = new Set(
    seenRows.flatMap((row) => (row.questionId ? [row.questionId] : []))
  )
  const drawn = choosePrompt(
    {
      unseenPackIds: packQuestions
        .filter((question) => !seenIds.has(question.id))
        .map((question) => question.id),
      seenPackIds: packQuestions
        .filter((question) => seenIds.has(question.id))
        .map((question) => question.id),
    },
    randomInt
  )
  if (!drawn) return null
  const picked = packQuestions.find((question) => question.id === drawn.id)
  if (!picked) return null
  return {
    questionId: picked.id,
    questionText: picked.text,
    questionPack: picked.category.name,
    isReplay: drawn.isReplay,
  }
}

async function scoreRound(tx: Tx, round: LoadedRoom["rounds"][number]) {
  const tally = tallyRound(
    round.answers.flatMap((answer) =>
      answer.guesses.map((guess) => ({
        id: guess.id,
        guesserId: guess.guesserId,
        authorId: answer.playerId,
        guessedPlayerId: guess.guessedPlayerId,
        pointsAwarded: guess.pointsAwarded,
      }))
    )
  )
  if (tally.correctIds.length > 0) {
    await tx.guess.updateMany({
      where: { id: { in: tally.correctIds } },
      data: { isCorrect: true, pointsAwarded: CORRECT_GUESS_POINTS },
    })
  }
  if (tally.wrongIds.length > 0) {
    await tx.guess.updateMany({
      where: { id: { in: tally.wrongIds } },
      data: { isCorrect: false, pointsAwarded: 0 },
    })
  }
  for (const award of tally.playerPoints) {
    await tx.roomPlayer.update({
      where: { id: award.playerId },
      data: { score: { increment: award.points } },
    })
  }
}

// Moves the current round forward when its timer ran out or everyone acted.
// It reloads the room only after it writes, so a no-op costs one load.
async function advanceLocked(tx: Tx, roomId: string, now: Date) {
  await lockRoom(tx, roomId)
  const room = await applyHostSeat(tx, await loadRoom(tx, roomId), now)
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
    if (!timedOut && !everyoneAnswered) return room
    if (!canTransitionRound("ANSWERING", "GUESSING")) {
      throw new AppError("That round cannot move to guessing.", "CONFLICT")
    }
    if (round.answers.length === 0) {
      await tx.round.update({
        where: { id: round.id },
        data: { status: "REVEAL", phaseDeadlineAt: null },
      })
      return loadRoom(tx, roomId)
    }
    // Shuffle in one statement instead of one update per answer.
    await tx.$executeRaw`
      UPDATE "Answer"
      SET "sortKey" = 1 + floor(random() * 999999)::int
      WHERE "roundId" = ${round.id}
    `
    await tx.round.update({
      where: { id: round.id },
      data: {
        status: "GUESSING",
        phaseDeadlineAt: new Date(now.getTime() + room.guessingTimer * 1000),
      },
    })
    return loadRoom(tx, roomId)
  }
  if (round.status === "GUESSING") {
    const finished =
      round.answers.length === 0 ||
      active.every((player) =>
        round.answers
          .filter((answer) => answer.playerId !== player.id)
          .every((answer) =>
            answer.guesses.some((guess) => guess.guesserId === player.id)
          )
      )
    if (!finished && !timedOut) return room
    if (!canTransitionRound("GUESSING", "REVEAL")) {
      throw new AppError("That round cannot be revealed.", "CONFLICT")
    }
    await scoreRound(tx, round)
    await tx.round.update({
      where: { id: round.id },
      data: { status: "REVEAL", phaseDeadlineAt: null },
    })
    return loadRoom(tx, roomId)
  }
  return room
}

export async function advanceRoom(roomId: string, now = new Date()) {
  return runRoomTransaction((tx) => advanceLocked(tx, roomId, now))
}

function toView(
  room: LoadedRoom,
  history: RoomHistory,
  viewerUserId: string,
  now: Date
): RoomView {
  const round = latestRound(room)
  const viewerIsGuest =
    room.players.find((player) => player.userId === viewerUserId)?.user.isAnonymous === true
  const input: ViewInput = {
    now: now.toISOString(),
    version: room.version,
    code: room.roomCode,
    name: room.name,
    status: room.status,
    hostId: room.hostId,
    viewerUserId,
    viewerIsGuest,
    categoryIds: room.categories.map((item) => item.categoryId),
    cleanFilter: room.cleanFilter,
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
        question: round.questionText ?? round.roomPrompt?.text ?? round.question?.text ?? "",
        categoryName: round.questionPack ?? round.question?.category.name ?? "Room question",
        askedBy: round.roomPrompt?.player.displayName ?? null,
        isReplay: round.isReplay,
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
    history: history.map((guess) => ({
      guesserId: guess.guesserId,
      authorId: guess.answer.playerId,
      isCorrect: guess.isCorrect,
      pointsAwarded: guess.pointsAwarded,
    })),
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

function assertSeated(player: { status: string } | undefined) {
  if (!player || player.status === "REMOVED" || player.status === "LEFT") {
    throw new AppError("Join this room before opening it.", "FORBIDDEN")
  }
}

async function buildFreshView(roomId: string, userId: string, now: Date) {
  let room = await loadRoom(prisma, roomId)
  const round = latestRound(room)
  const nextHost = chooseNextHost(hostCandidates(room), room.hostId, now.getTime())
  const needsAdvance =
    nextHost !== room.hostId ||
    phaseNeedsAdvance({
      status: room.status,
      roundStatus: round?.status ?? null,
      deadlineAt: round?.phaseDeadlineAt?.getTime() ?? null,
      now: now.getTime(),
      activePlayerIds: activePlayers(room).map((player) => player.id),
      answers: (round?.answers ?? []).map((answer) => ({
        playerId: answer.playerId,
        guesses: answer.guesses.map((guess) => ({ guesserId: guess.guesserId })),
      })),
    })
  if (needsAdvance) room = await advanceRoom(roomId, now)
  return toView(room, await roomHistory(prisma, roomId), userId, now)
}

/** Full room view. Used for the first page render. */
export async function getRoomView(code: string, userId: string) {
  const result = await pollRoom(code, userId, null)
  if ("unchanged" in result) throw new AppError("Room view missing.", "CONFLICT")
  return result
}

/**
 * The hot path behind the room poll. It reads a small snapshot (version, latest
 * round deadline, seats) and returns `unchanged` when the client's copy at
 * `knownVersion` is still current. It only loads the whole room when something
 * changed or a timer or host hand-off needs the room to advance.
 */
export async function pollRoom(
  code: string,
  userId: string,
  knownVersion: number | null
): Promise<RoomView | RoomPollUnchanged> {
  const now = new Date()
  const snapshot = await prisma.room.findUnique({
    where: { roomCode: code },
    select: {
      id: true,
      version: true,
      status: true,
      hostId: true,
      players: {
        select: {
          id: true,
          userId: true,
          status: true,
          joinedAt: true,
          lastSeenAt: true,
          user: { select: { isAnonymous: true } },
        },
      },
      rounds: {
        orderBy: { roundNumber: "desc" },
        take: 1,
        select: { status: true, phaseDeadlineAt: true },
      },
    },
  })
  if (!snapshot) throw new AppError("We couldn't find that room.", "NOT_FOUND")
  const membership = snapshot.players.find((player) => player.userId === userId)
  assertSeated(membership)
  if (membership && presenceIsStale(membership.lastSeenAt.getTime(), now.getTime())) {
    // Presence is a heartbeat, not room state, so it does not bump the version.
    await prisma.roomPlayer.update({
      where: { id: membership.id },
      data: { lastSeenAt: now },
    })
    membership.lastSeenAt = now
  }
  const nextHost = chooseNextHost(
    snapshot.players.map((player) => ({
      userId: player.userId,
      joinedAt: player.joinedAt.getTime(),
      lastSeenAt: player.lastSeenAt.getTime(),
      status: player.status,
      canHost: !player.user.isAnonymous,
    })),
    snapshot.hostId,
    now.getTime()
  )
  const round = snapshot.rounds[0] ?? null
  if (
    canReuseView({
      knownVersion,
      version: snapshot.version,
      status: snapshot.status,
      roundStatus: round?.status ?? null,
      deadlineAt: round?.phaseDeadlineAt?.getTime() ?? null,
      now: now.getTime(),
      hostChanges: nextHost !== snapshot.hostId,
    })
  ) {
    return { unchanged: true, version: snapshot.version, serverNow: now.toISOString() }
  }
  return buildFreshView(snapshot.id, userId, now)
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
  adultConfirmed: boolean
}) {
  const config = await settings(prisma)
  const categories = await prisma.category.findMany({
    where: { id: { in: input.categoryIds }, isActive: true },
  })
  if (categories.length !== input.categoryIds.length) {
    throw new AppError("Choose active prompt packs.", "VALIDATION")
  }
  const audience = adultPackError({
    cleanFilter: input.cleanFilter,
    adultConfirmed: input.adultConfirmed,
    hasAdultPack: categories.some((category) => category.isAdult),
  })
  if (audience) throw new AppError(audience, "VALIDATION")
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
  if (isUploadAvatar(input.avatar)) {
    const owner = uploadOwnerId(input.avatar)
    const photo = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { avatar: true, avatarData: true },
    })
    if (owner !== input.userId || photo?.avatar !== input.avatar || !photo.avatarData) {
      throw new AppError("Choose an avatar.", "VALIDATION")
    }
  }
  const displayName = input.displayName.trim()
  if (displayName.length < 2 || displayName.length > 18) {
    throw new AppError("Display names are 2 to 18 characters.", "VALIDATION")
  }
  const roomId = await roomIdForCode(input.code)
  await runRoomTransaction(async (tx) => {
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
  await runRoomTransaction(async (tx) => {
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
  await runRoomTransaction(async (tx) => {
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
      hostCandidates(room, { userId, status: "LEFT", lastSeenAt: 0 }),
      room.hostId,
      now.getTime()
    )
    if (nextHost === room.hostId) return
    if (!nextHost) {
      if (room.status !== "CLOSED" && canTransitionRoom(room.status, "CLOSED")) {
        await tx.room.update({ where: { id: room.id }, data: { status: "CLOSED" } })
      }
      return
    }
    await tx.room.update({ where: { id: room.id }, data: { hostId: nextHost } })
  })
}

export async function removePlayer(hostId: string, code: string, playerId: string) {
  const roomId = await roomIdForCode(code)
  await runRoomTransaction(async (tx) => {
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
  await runRoomTransaction(async (tx) => {
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
    const drawn = await drawPrompt(tx, room, [])
    if (!drawn) throw new AppError("No questions are available.", "CONFLICT")
    const now = new Date()
    await tx.round.create({
      data: {
        roomId: room.id,
        roundNumber: 1,
        questionId: drawn.questionId,
        questionText: drawn.questionText,
        questionPack: drawn.questionPack,
        isReplay: drawn.isReplay,
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
  await runRoomTransaction(async (tx) => {
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
  await runRoomTransaction(async (tx) => {
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
  await runRoomTransaction(async (tx) => {
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
  await runRoomTransaction(async (tx) => {
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
    const drawn = await drawPrompt(tx, room, await usedPackQuestionIds(tx, room.id))
    if (!drawn) throw new AppError("No questions left to draw.", "CONFLICT")
    const now = new Date()
    await tx.round.create({
      data: {
        roomId: room.id,
        roundNumber: room.currentRound + 1,
        questionId: drawn.questionId,
        questionText: drawn.questionText,
        questionPack: drawn.questionPack,
        isReplay: drawn.isReplay,
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
  await runRoomTransaction(async (tx) => {
    const room = await advanceLocked(tx, roomId, new Date())
    assertHost(hostId, room.hostId)
    const round = latestRound(room)
    if (!round || round.status !== "ANSWERING") {
      throw new AppError("You can skip a question while players are answering.", "CONFLICT")
    }
    const drawn = await drawPrompt(tx, room, await usedPackQuestionIds(tx, room.id))
    if (!drawn) throw new AppError("No replacement question is available.", "CONFLICT")
    await tx.answer.deleteMany({ where: { roundId: round.id } })
    await tx.round.update({
      where: { id: round.id },
      data: {
        questionId: drawn.questionId,
        questionText: drawn.questionText,
        questionPack: drawn.questionPack,
        roomPromptId: null,
        isReplay: drawn.isReplay,
        phaseDeadlineAt: new Date(Date.now() + room.answerTimer * 1000),
      },
    })
  })
}

export async function endGame(hostId: string, code: string) {
  const roomId = await roomIdForCode(code)
  await runRoomTransaction(async (tx) => {
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
  await runRoomTransaction(async (tx) => {
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

export async function updateRoomSettings(input: {
  hostId: string
  code: string
  categoryIds: string[]
  totalRounds: number
  maxPlayers: number
  answerTimer: number
  guessingTimer: number
  cleanFilter: boolean
  adultConfirmed: boolean
}) {
  if (guessTimerFor(input.answerTimer) !== input.guessingTimer) {
    throw new AppError("Choose a valid room setup.", "VALIDATION")
  }
  if (input.categoryIds.length < 1) {
    throw new AppError("Pick at least one prompt pack.", "VALIDATION")
  }
  const roomId = await roomIdForCode(input.code)
  await runRoomTransaction(async (tx) => {
    await lockRoom(tx, roomId)
    const room = await loadRoom(tx, roomId)
    assertHost(input.hostId, room.hostId)
    if (room.status !== "WAITING") {
      throw new AppError("Room setup can only change before the game starts.", "CONFLICT")
    }
    if (input.maxPlayers < activePlayers(room).length) {
      throw new AppError("Capacity cannot drop below the players already seated.", "VALIDATION")
    }
    const categories = await tx.category.findMany({
      where: { id: { in: input.categoryIds }, isActive: true },
    })
    if (categories.length !== new Set(input.categoryIds).size) {
      throw new AppError("Choose active prompt packs.", "VALIDATION")
    }
    const audience = adultPackError({
      cleanFilter: input.cleanFilter,
      adultConfirmed: input.adultConfirmed,
      hasAdultPack: categories.some((category) => category.isAdult),
    })
    if (audience) throw new AppError(audience, "VALIDATION")
    await tx.roomCategory.deleteMany({ where: { roomId: room.id } })
    await tx.roomCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({
        roomId: room.id,
        categoryId,
      })),
    })
    await tx.room.update({
      where: { id: room.id },
      data: {
        totalRounds: input.totalRounds,
        maxPlayers: input.maxPlayers,
        answerTimer: input.answerTimer,
        guessingTimer: input.guessingTimer,
        cleanFilter: input.cleanFilter,
      },
    })
  })
}

export async function rematch(hostId: string, code: string) {
  const roomId = await roomIdForCode(code)
  return runRoomTransaction(async (tx) => {
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
  const player = await prisma.roomPlayer.findUnique({
    where: { roomId_userId: { roomId, userId: input.userId } },
    select: { id: true },
  })
  if (!player) throw new AppError("You are not in this room.", "FORBIDDEN")
  const answer = await prisma.answer.findFirst({
    where: { id: input.answerId, round: { roomId } },
    select: { id: true },
  })
  if (!answer) throw new AppError("Answer not found.", "NOT_FOUND")
  await prisma.report.create({
    data: {
      reporterId: input.userId,
      targetType: "ANSWER",
      targetId: answer.id,
      reason,
    },
  })
  if (!env.ADMIN_EMAIL) return
  try {
    await sendReportNotice({
      to: env.ADMIN_EMAIL,
      roomCode: formatRoomCode(input.code),
      reportsUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/reports`,
    })
  } catch {
    console.error("Report notice could not be sent")
  }
}
