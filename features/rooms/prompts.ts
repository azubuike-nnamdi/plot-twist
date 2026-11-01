export const PROMPT_MIN_LENGTH = 8
export const PROMPT_MAX_LENGTH = 160

export type DrawnPrompt =
  | { kind: "player"; id: string }
  | { kind: "pack"; id: string; isReplay: boolean }

export function choosePrompt(
  input: {
    playerPromptIds: string[]
    unseenPackIds: string[]
    seenPackIds: string[]
  },
  randomIndex: (length: number) => number
): DrawnPrompt | null {
  if (input.playerPromptIds.length > 0) {
    const index = randomIndex(input.playerPromptIds.length)
    const id = input.playerPromptIds[index]
    return id ? { kind: "player", id } : null
  }
  if (input.unseenPackIds.length > 0) {
    const index = randomIndex(input.unseenPackIds.length)
    const id = input.unseenPackIds[index]
    return id ? { kind: "pack", id, isReplay: false } : null
  }
  if (input.seenPackIds.length > 0) {
    const index = randomIndex(input.seenPackIds.length)
    const id = input.seenPackIds[index]
    return id ? { kind: "pack", id, isReplay: true } : null
  }
  return null
}

export function normalizePrompt(text: string) {
  return text.trim().replace(/\s+/g, " ")
}
