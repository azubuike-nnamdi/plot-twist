export const GUEST_TTL_MS = 14 * 24 * 60 * 60 * 1000
export const RATE_LIMIT_TTL_MS = 24 * 60 * 60 * 1000

export function cleanupCutoffs(now: Date) {
  return {
    guestCreatedBefore: new Date(now.getTime() - GUEST_TTL_MS),
    bucketWindowBefore: new Date(now.getTime() - RATE_LIMIT_TTL_MS),
  }
}
