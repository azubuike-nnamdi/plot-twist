"use client"

import { create } from "zustand"

type GuessState = {
  selected: Record<string, string>
  select: (answerId: string, playerId: string) => void
  clear: () => void
}

export const useGuessStore = create<GuessState>((set) => ({
  selected: {},
  select: (answerId, playerId) =>
    set((state) => ({ selected: { ...state.selected, [answerId]: playerId } })),
  clear: () => set({ selected: {} }),
}))
