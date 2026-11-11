import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

/** The visitor's sound setting, remembered in this browser. */
export const useSound = create<{
  enabled: boolean
  toggle: () => void
}>()(
  persist(
    (set) => ({
      enabled: true,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    {
      name: "plot-twist-sound",
      storage: createJSONStorage(() => localStorage),
      // Read storage after mount, so the server and first client render match.
      skipHydration: true,
    }
  )
)
