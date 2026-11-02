export type ClockAnchor = {
  deadline: number
  skew: number
}

const CORRECTION_MS = 1_500

export function nextClockAnchor(input: {
  previous: ClockAnchor | null
  deadline: number
  serverNow: number
  clientNow: number
}): ClockAnchor | null {
  if (!Number.isFinite(input.deadline) || !Number.isFinite(input.serverNow)) return input.previous
  const skew = input.serverNow - input.clientNow
  const serverLeft = input.deadline - input.serverNow
  const localLeft = input.previous
    ? input.previous.deadline - (input.clientNow + input.previous.skew)
    : serverLeft
  if (
    !input.previous ||
    input.previous.deadline !== input.deadline ||
    Math.abs(serverLeft - localLeft) > CORRECTION_MS
  ) {
    return { deadline: input.deadline, skew }
  }
  return input.previous
}

export function remainingMs(anchor: ClockAnchor, clientNow: number) {
  return Math.max(0, anchor.deadline - (clientNow + anchor.skew))
}

export function formatClock(remaining: number) {
  const seconds = Math.max(0, Math.ceil(remaining / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}
