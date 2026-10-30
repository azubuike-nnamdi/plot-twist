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
}

export function chooseNextHost(
  players: HostCandidate[],
  hostUserId: string,
  now: number
) {
  const host = players.find((player) => player.userId === hostUserId)
  const active = players
    .filter(
      (player) => player.status === "JOINED" || player.status === "READY"
    )
    .sort((left, right) => left.joinedAt - right.joinedAt)
  if (!host) return active[0]?.userId ?? null
  const hostIsActive = host.status === "JOINED" || host.status === "READY"
  const hostIsStale = now - host.lastSeenAt > HOST_STALE_MS
  if (hostIsActive && !hostIsStale) return hostUserId
  const replacement = active.find((player) => player.userId !== hostUserId)
  return replacement?.userId ?? hostUserId
}
