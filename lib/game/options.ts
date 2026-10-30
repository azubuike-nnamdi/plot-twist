export const AVATARS = [
  { id: "cipher", label: "Cipher Cool" },
  { id: "joy", label: "Joy Spark" },
  { id: "wildcard", label: "Wildcard Nova" },
  { id: "cosmic", label: "Cosmic Spark" },
  { id: "retro", label: "Retro Glitch" },
] as const

export const ROUND_CHOICES = [3, 5, 8] as const
export const CAPACITY_CHOICES = [6, 8, 12, 16] as const
export const ANSWER_TIMERS = [30, 45, 60, 90] as const
export const GUESS_TIMERS = [30, 45, 60] as const
export const REACTIONS = ["😂", "🔥", "💀", "❤️", "🤯"] as const

export function isAvatar(value: string) {
  return AVATARS.some((avatar) => avatar.id === value)
}
