// Pure rules for the room poll. A poll can skip rebuilding the room view when
// nothing was written since the client's copy and no timer or host hand-off is due.

/** Skip presence writes until the stored heartbeat is at least this old. */
export const PRESENCE_WRITE_MS = 15_000

export function presenceIsStale(lastSeenAt: number, now: number) {
  return now - lastSeenAt >= PRESENCE_WRITE_MS
}

export function parseKnownVersion(raw: string | null): number | null {
  if (raw === null || !/^\d{1,10}$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

export function canReuseView(input: {
  knownVersion: number | null
  version: number
  status: string
  roundStatus: string | null
  deadlineAt: number | null
  now: number
  hostChanges: boolean
}) {
  if (input.knownVersion === null || input.knownVersion !== input.version) return false
  if (input.hostChanges) return false
  const timed = input.roundStatus === "ANSWERING" || input.roundStatus === "GUESSING"
  if (
    input.status === "IN_PROGRESS" &&
    timed &&
    input.deadlineAt !== null &&
    input.now >= input.deadlineAt
  ) {
    return false
  }
  return true
}

/** While push is connected, polling is only a safety net for missed signals. */
export const PUSH_SAFETY_POLL_MS = 10_000

/** Polling cadence in ms. Live phases poll every second; idle screens back off. */
export function pollIntervalFor(phase: string | undefined, pushConnected = false) {
  if (pushConnected) return PUSH_SAFETY_POLL_MS
  if (phase === "ANSWERING" || phase === "GUESSING" || phase === "REVEAL") return 1_000
  if (phase === "LOBBY") return 1_500
  return 5_000
}
