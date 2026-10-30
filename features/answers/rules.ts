import type { RoundStatus } from "@/features/rooms/transitions"

export const ANSWER_MAX_LENGTH = 400

export function answerError(input: {
  phase: RoundStatus
  isActiveMember: boolean
  alreadySubmitted: boolean
  text: string
  now: number
  deadline: number | null
}) {
  if (!input.isActiveMember) return "You are not in this room."
  if (input.phase !== "ANSWERING") return "Answers are closed for this round."
  if (input.deadline !== null && input.now > input.deadline) {
    return "The answer timer has ended."
  }
  if (input.alreadySubmitted) return "You already submitted an answer."
  const text = input.text.trim()
  if (text.length < 1) return "Write an answer before locking it in."
  if (text.length > ANSWER_MAX_LENGTH) {
    return `Answers can be ${ANSWER_MAX_LENGTH} characters at most.`
  }
  return null
}
