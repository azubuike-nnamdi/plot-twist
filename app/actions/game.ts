"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  closeRoom,
  createRoom,
  endGame,
  joinRoom,
  leaveRoom,
  nextRound,
  reactToRound,
  rematch,
  removePlayer,
  updateRoomSettings,
  reportAnswer,
  setReady,
  skipQuestion,
  startGame,
  submitAnswer,
  submitGuess,
  submitRoomPrompt,
  reviewRoomPrompt,
} from "@/features/rooms/engine"
import { auth } from "@/lib/auth/auth"
import { isUploadAvatar } from "@/lib/avatars"
import { getCurrentUser, requireUser, requestIp } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { AppError, errorMessage } from "@/lib/errors"
import {
  ANSWER_TIMERS,
  CAPACITY_CHOICES,
  GUESS_TIMERS,
  ROUND_CHOICES,
  guessTimerFor,
  isAvatar,
} from "@/lib/game/options"
import { assertRateLimit } from "@/lib/security/rate-limit"
import { parseRoomCode } from "@/features/rooms/codes"

export type ActionState = { error?: string; success?: string } | null

function fail(error: unknown): ActionState {
  return { error: errorMessage(error, "Something went wrong. Try again.") }
}

async function avatarFor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true, username: true, name: true },
  })
  return {
    avatar: user?.avatar && isAvatar(user.avatar) ? user.avatar : "cipher",
    name: user?.username || user?.name || "Player",
  }
}

export async function createRoomAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser()
    if (user.isAnonymous) {
      throw new AppError("Create an account to host a room.", "FORBIDDEN")
    }
    await assertRateLimit(`create:${user.id}`, 10, 60 * 60 * 1000)
    const name = String(formData.get("name") ?? "").trim()
    const categoryIds = formData.getAll("categoryId").map(String)
    const totalRounds = Number(formData.get("totalRounds"))
    const maxPlayers = Number(formData.get("maxPlayers"))
    const answerTimer = Number(formData.get("answerTimer"))
    const guessingTimer = Number(formData.get("guessingTimer"))
    if (name.length < 2 || name.length > 32) {
      throw new AppError("Room names are 2 to 32 characters.")
    }
    if (
      !ROUND_CHOICES.includes(totalRounds as (typeof ROUND_CHOICES)[number]) ||
      !CAPACITY_CHOICES.includes(maxPlayers as (typeof CAPACITY_CHOICES)[number]) ||
      !ANSWER_TIMERS.includes(answerTimer as (typeof ANSWER_TIMERS)[number]) ||
      !GUESS_TIMERS.includes(guessingTimer as (typeof GUESS_TIMERS)[number])
    ) {
      throw new AppError("Choose a valid room setup.")
    }
    if (categoryIds.length < 1) throw new AppError("Pick at least one prompt pack.")
    const profile = await avatarFor(user.id)
    const code = await createRoom({
      hostId: user.id,
      hostName: profile.name.slice(0, 18),
      avatar: profile.avatar,
      name,
      categoryIds,
      totalRounds,
      maxPlayers,
      answerTimer,
      guessingTimer,
      cleanFilter: formData.get("cleanFilter") === "on",
      adultConfirmed: formData.get("adultConfirmed") === "on",
    })
    redirect(`/room/${code}`)
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error
    return fail(error)
  }
}

export async function joinRoomAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const code = parseRoomCode(String(formData.get("code") ?? ""))
    if (code.length !== 8) throw new AppError("Enter the full room code.")
    const displayName = String(formData.get("displayName") ?? "").trim()
    const avatar = String(formData.get("avatar") ?? "")
    const current = await getCurrentUser()
    let userId = current?.id ?? ""
    if (!current) {
      await assertRateLimit(`join-guest:${await requestIp()}`, 40, 15 * 60 * 1000)
      const created = await auth.api.signInAnonymous({ headers: await headers() })
      userId = created.user.id
    } else {
      if (current.status !== "ACTIVE") {
        throw new AppError("This account is suspended.", "FORBIDDEN")
      }
      await assertRateLimit(`join:${current.id}`, 10, 15 * 60 * 1000)
    }
    await joinRoom({ userId, code, displayName, avatar })
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(!current || current.isAnonymous ? { name: displayName } : {}),
        avatar,
        ...(isUploadAvatar(avatar) ? {} : { avatarMime: null, avatarData: null }),
      },
    })
    redirect(`/room/${code}`)
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error
    return fail(error)
  }
}

async function hostCall(code: string, run: (userId: string, roomCode: string) => Promise<void>) {
  const user = await requireUser()
  const roomCode = parseRoomCode(code)
  await run(user.id, roomCode)
}

export async function readyAction(code: string, ready: boolean) {
  const user = await requireUser()
  await setReady(user.id, parseRoomCode(code), ready)
}

export async function leaveAction(code: string) {
  const user = await requireUser()
  await leaveRoom(user.id, parseRoomCode(code))
  redirect("/")
}

export async function removePlayerAction(code: string, playerId: string) {
  await hostCall(code, (userId, roomCode) => removePlayer(userId, roomCode, playerId))
}

export async function startGameAction(code: string) {
  await hostCall(code, startGame)
}

export async function answerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser()
    await assertRateLimit(`answer:${user.id}`, 30, 60 * 1000)
    const code = parseRoomCode(String(formData.get("code") ?? ""))
    await submitAnswer(user.id, code, String(formData.get("answer") ?? ""))
    return { success: "Locked in." }
  } catch (error) {
    return fail(error)
  }
}

export async function guessAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser()
    await assertRateLimit(`guess:${user.id}`, 60, 60 * 1000)
    const code = parseRoomCode(String(formData.get("code") ?? ""))
    await submitGuess({
      userId: user.id,
      code,
      answerId: String(formData.get("answerId") ?? ""),
      guessedPlayerId: String(formData.get("guessedPlayerId") ?? ""),
    })
    return { success: "Vote locked." }
  } catch (error) {
    return fail(error)
  }
}

export async function reactionAction(code: string, emoji: string) {
  const user = await requireUser()
  await assertRateLimit(`react:${user.id}`, 30, 60 * 1000)
  const roomCode = parseRoomCode(code)
  await reactToRound(user.id, roomCode, emoji)
}

export async function nextRoundAction(code: string) {
  await hostCall(code, nextRound)
}

export async function skipQuestionAction(code: string) {
  await hostCall(code, skipQuestion)
}

export async function endGameAction(code: string) {
  await hostCall(code, endGame)
}

export async function closeRoomAction(code: string) {
  const user = await requireUser()
  const roomCode = parseRoomCode(code)
  await closeRoom({ actorId: user.id, code: roomCode })
}

export async function updateRoomSettingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser()
    if (user.isAnonymous) {
      throw new AppError("Create an account to host a room.", "FORBIDDEN")
    }
    const code = parseRoomCode(String(formData.get("code") ?? ""))
    const categoryIds = formData.getAll("categoryId").map(String)
    const totalRounds = Number(formData.get("totalRounds"))
    const maxPlayers = Number(formData.get("maxPlayers"))
    const answerTimer = Number(formData.get("answerTimer"))
    const guessingTimer = guessTimerFor(answerTimer)
    if (
      !ROUND_CHOICES.includes(totalRounds as (typeof ROUND_CHOICES)[number]) ||
      !CAPACITY_CHOICES.includes(maxPlayers as (typeof CAPACITY_CHOICES)[number]) ||
      !ANSWER_TIMERS.includes(answerTimer as (typeof ANSWER_TIMERS)[number]) ||
      !GUESS_TIMERS.includes(guessingTimer)
    ) {
      throw new AppError("Choose a valid room setup.")
    }
    await updateRoomSettings({
      hostId: user.id,
      code,
      categoryIds,
      totalRounds,
      maxPlayers,
      answerTimer,
      guessingTimer,
      cleanFilter: formData.get("cleanFilter") === "on",
      adultConfirmed: formData.get("adultConfirmed") === "on",
    })
    return { success: "Room setup saved." }
  } catch (error) {
    return fail(error)
  }
}

export async function rematchAction(code: string) {
  const user = await requireUser()
  const next = await rematch(user.id, parseRoomCode(code))
  redirect(`/room/${next}`)
}

export async function reportAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser()
    await assertRateLimit(`report:${user.id}`, 10, 60 * 60 * 1000)
    await reportAnswer({
      userId: user.id,
      code: parseRoomCode(String(formData.get("code") ?? "")),
      answerId: String(formData.get("answerId") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    })
    return { success: "Report sent." }
  } catch (error) {
    return fail(error)
  }
}

export async function submitPromptAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireUser()
    await assertRateLimit(`prompt:${user.id}`, 20, 15 * 60 * 1000)
    const code = parseRoomCode(String(formData.get("code") ?? ""))
    await submitRoomPrompt(user.id, code, String(formData.get("prompt") ?? ""))
    return { success: "Question added to this room." }
  } catch (error) {
    return fail(error)
  }
}

export async function reviewPromptAction(code: string, promptId: string, decision: "ACCEPTED" | "REMOVED") {
  const user = await requireUser()
  const roomCode = parseRoomCode(code)
  await reviewRoomPrompt({ actorId: user.id, code: roomCode, promptId, decision })
}

export async function clientIp() {
  return requestIp()
}
