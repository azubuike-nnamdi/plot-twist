const STALE_MS = 10_000

export function showReconnecting(input: {
  phase: string
  dataUpdatedAt: number
  now: number
  isError: boolean
}) {
  if (input.phase !== "ANSWERING" && input.phase !== "GUESSING") return false
  if (input.isError) return true
  if (input.dataUpdatedAt <= 0) return false
  return input.now - input.dataUpdatedAt > STALE_MS
}
