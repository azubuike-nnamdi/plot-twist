export const AVATARS = [
  { id: "cipher", label: "Cipher Cool" },
  { id: "joy", label: "Joy Spark" },
  { id: "wildcard", label: "Wildcard Nova" },
  { id: "cosmic", label: "Cosmic Spark" },
  { id: "retro", label: "Retro Glitch" },
] as const

export const ROUND_CHOICES = [3, 5, 8] as const
export const CAPACITY_CHOICES = [6, 8, 12, 16] as const
export const ANSWER_TIMERS = [20, 30, 45] as const
export const GUESS_TIMERS = [15, 30] as const
export const REACTIONS = ["😂", "🔥", "💀", "❤️", "🤯"] as const

export const ROUND_PRESETS = [
  { rounds: 3, label: "Quick Sprint" },
  { rounds: 5, label: "Standard Party" },
  { rounds: 8, label: "Deep Showdown" },
] as const

const GUESS_FOR_ANSWER = {
  20: 15,
  30: 30,
  45: 30,
} as const satisfies Record<(typeof ANSWER_TIMERS)[number], (typeof GUESS_TIMERS)[number]>

export function guessTimerFor(answerTimer: number): (typeof GUESS_TIMERS)[number] {
  if (answerTimer <= 20) return GUESS_FOR_ANSWER[20]
  if (answerTimer <= 30) return GUESS_FOR_ANSWER[30]
  return GUESS_FOR_ANSWER[45]
}

export function estimateSessionMinutes(rounds: number, answerTimer: number) {
  const seconds = rounds * (answerTimer + guessTimerFor(answerTimer))
  return Math.max(1, Math.round(seconds / 60))
}

export function isAvatar(value: string) {
  return AVATARS.some((avatar) => avatar.id === value)
}
