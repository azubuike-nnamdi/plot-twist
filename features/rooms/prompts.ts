// Rounds deal pack questions only. Staff own the question bank (seed packs,
// manual entry, and Ollama drafts in /admin/questions); players cannot add questions.

export type DrawnPrompt = { kind: "pack"; id: string; isReplay: boolean }

export function choosePrompt(
  input: {
    unseenPackIds: string[]
    seenPackIds: string[]
  },
  randomIndex: (length: number) => number
): DrawnPrompt | null {
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
