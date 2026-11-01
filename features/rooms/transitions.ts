export const ROOM_STATUSES = [
  "WAITING",
  "IN_PROGRESS",
  "COMPLETED",
  "CLOSED",
] as const

export const ROUND_STATUSES = [
  "PENDING",
  "ANSWERING",
  "GUESSING",
  "REVEAL",
  "COMPLETED",
] as const

export type RoomStatus = (typeof ROOM_STATUSES)[number]
export type RoundStatus = (typeof ROUND_STATUSES)[number]

const roomTransitions: Record<RoomStatus, readonly RoomStatus[]> = {
  WAITING: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["COMPLETED", "CLOSED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
}

const roundTransitions: Record<RoundStatus, readonly RoundStatus[]> = {
  PENDING: ["ANSWERING"],
  ANSWERING: ["GUESSING"],
  GUESSING: ["REVEAL"],
  REVEAL: ["COMPLETED"],
  COMPLETED: [],
}

export function canTransitionRoom(from: RoomStatus, to: RoomStatus) {
  return roomTransitions[from].includes(to)
}

export function canTransitionRound(from: RoundStatus, to: RoundStatus) {
  return roundTransitions[from].includes(to)
}

export const HOST_STALE_MS = 90_000

export type HostCandidate = {
  userId: string
  joinedAt: number
  lastSeenAt: number
  status: "JOINED" | "READY" | "LEFT" | "REMOVED"
  canHost?: boolean
}

function canTakeHost(player: HostCandidate) {
  return player.canHost !== false
}

export function chooseNextHost(
  players: HostCandidate[],
  hostUserId: string,
  now: number
) {
  const host = players.find((player) => player.userId === hostUserId)
  const eligible = players
    .filter(
      (player) =>
        (player.status === "JOINED" || player.status === "READY") &&
        canTakeHost(player)
    )
    .sort((left, right) => left.joinedAt - right.joinedAt)
  if (!host) return eligible[0]?.userId ?? null
  const hostIsActive = host.status === "JOINED" || host.status === "READY"
  const hostIsStale = now - host.lastSeenAt > HOST_STALE_MS
  if (hostIsActive && !hostIsStale) return hostUserId
  const replacement = eligible.find((player) => player.userId !== hostUserId)
  if (replacement) return replacement.userId
  const hostHasLeft = host.status === "LEFT" || host.status === "REMOVED"
  if (hostHasLeft) return null
  return hostUserId
}

export function phaseNeedsAdvance(input: {
  status: RoomStatus
  roundStatus: RoundStatus | null
  deadlineAt: number | null
  now: number
  activePlayerIds: string[]
  answers: { playerId: string; guesses: { guesserId: string }[] }[]
}) {
  if (input.status !== "IN_PROGRESS" || !input.roundStatus) return false
  const timedOut = input.deadlineAt !== null && input.now >= input.deadlineAt
  if (input.roundStatus === "ANSWERING") {
    const everyoneAnswered =
      input.activePlayerIds.length > 0 &&
      input.activePlayerIds.every((playerId) =>
        input.answers.some((answer) => answer.playerId === playerId)
      )
    return timedOut || everyoneAnswered
  }
  if (input.roundStatus === "GUESSING") {
    const finished =
      input.answers.length === 0 ||
      input.activePlayerIds.every((playerId) =>
        input.answers
          .filter((answer) => answer.playerId !== playerId)
          .every((answer) =>
            answer.guesses.some((guess) => guess.guesserId === playerId)
          )
      )
    return finished || timedOut
  }
  return false
}
