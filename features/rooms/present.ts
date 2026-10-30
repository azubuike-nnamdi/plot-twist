import type { RoundStatus } from "@/features/rooms/transitions"

export type RevealedAuthor = {
  playerId: string
  displayName: string
}

export type PublicAnswer = {
  id: string
  text: string
  author?: RevealedAuthor
}

const hiddenPhases: RoundStatus[] = ["PENDING", "ANSWERING", "GUESSING"]

export function presentAnswer(input: {
  id: string
  text: string
  phase: RoundStatus
  author: RevealedAuthor
  removed: boolean
}): PublicAnswer {
  const text = input.removed ? "Removed by a moderator." : input.text
  if (hiddenPhases.includes(input.phase)) {
    return { id: input.id, text }
  }
  return {
    id: input.id,
    text,
    author: input.author,
  }
}
