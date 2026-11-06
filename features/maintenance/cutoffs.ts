export const GUEST_TTL_MS = 14 * 24 * 60 * 60 * 1000
export const RATE_LIMIT_TTL_MS = 24 * 60 * 60 * 1000
/** A running match with no writes for this long was abandoned. */
export const ROOM_IDLE_CLOSE_MS = 6 * 60 * 60 * 1000
/** Rooms, rounds, answers, and votes are deleted this long after their last activity. */
export const ROOM_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export function cleanupCutoffs(now: Date) {
  return {
    guestCreatedBefore: new Date(now.getTime() - GUEST_TTL_MS),
    bucketWindowBefore: new Date(now.getTime() - RATE_LIMIT_TTL_MS),
    idleRoomBefore: new Date(now.getTime() - ROOM_IDLE_CLOSE_MS),
    roomRetainedAfter: new Date(now.getTime() - ROOM_RETENTION_MS),
  }
}
