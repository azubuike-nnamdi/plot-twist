import { createHash } from "node:crypto"

import { parseGeneratedQuestions } from "@/features/questions/ollama"
import { normalizeQuestion, questionIsSafe, questionKey } from "@/features/questions/safety"

export function fingerprint(text: string) {
  return createHash("sha256").update(questionKey(text)).digest("hex")
}

/**
 * Turn one raw Ollama reply into questions that may go live: parsed, safe for
 * the pack, and not seen before (in this batch or in recent nights).
 */
export function freshQuestions(input: {
  raw: string
  adult: boolean
  seen: Set<string>
  limit: number
}) {
  const fresh: string[] = []
  for (const candidate of parseGeneratedQuestions(input.raw, 50)) {
    if (fresh.length >= input.limit) break
    const text = normalizeQuestion(candidate)
    if (!questionIsSafe(text, input.adult)) continue
    const hash = fingerprint(text)
    if (input.seen.has(hash)) continue
    input.seen.add(hash)
    fresh.push(text)
  }
  return fresh
}

/** The next UTC midnight after `now`. Nightly batches expire then. */
export function nextMidnightUtc(now: Date) {
  const next = new Date(now)
  next.setUTCHours(24, 0, 0, 0)
  return next
}
