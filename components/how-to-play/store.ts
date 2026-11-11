import { create } from "zustand"

/** Whether the How to play walkthrough modal is open. Any button can open it. */
export const useHowToPlay = create<{
  open: boolean
  setOpen: (open: boolean) => void
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
