import type { RoundStatus } from "@/features/rooms/transitions"

export function guessError(input: {
  phase: RoundStatus
  isActiveMember: boolean
  guesserPlayerId: string
  authorPlayerId: string
  guessedPlayerId: string
  activePlayerIds: string[]
  alreadyGuessed: boolean
  now: number
  deadline: number | null
}) {
  if (!input.isActiveMember) return "You are not in this room."
  if (input.phase !== "GUESSING") return "Guessing is closed for this round."
  if (input.deadline !== null && input.now > input.deadline) {
    return "The guessing timer has ended."
  }
  if (input.alreadyGuessed) return "You already guessed this answer."
  if (input.guesserPlayerId === input.authorPlayerId) {
    return "You cannot guess your own answer."
  }
  if (input.guessedPlayerId === input.guesserPlayerId) {
    return "You cannot guess yourself."
  }
  if (!input.activePlayerIds.includes(input.guessedPlayerId)) {
    return "That player is not in this room."
  }
  return null
}
