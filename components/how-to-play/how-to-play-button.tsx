"use client"

import { useHowToPlay } from "@/components/how-to-play/store"

/** Opens the How to play walkthrough. Renders a plain button you can style. */
export function HowToPlayButton({
  className,
  children = "How to play",
  onOpen,
}: {
  className?: string
  children?: React.ReactNode
  /** Runs before the modal opens, e.g. to close a menu. */
  onOpen?: () => void
}) {
  const setOpen = useHowToPlay((s) => s.setOpen)
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onOpen?.()
        setOpen(true)
      }}
    >
      {children}
    </button>
  )
}
