"use client"

import { Volume2, VolumeX } from "lucide-react"

import { useSound } from "@/components/audio/sound-store"

/** Turns music and sound effects on or off. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const enabled = useSound((s) => s.enabled)
  const toggle = useSound((s) => s.toggle)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      title={enabled ? "Sound on" : "Sound off"}
      className={`flex size-10 items-center justify-center rounded-lg border border-line text-muted-foreground hover:bg-white/10 hover:text-foreground ${className}`}
    >
      {enabled ? (
        <Volume2 aria-hidden className="size-5" />
      ) : (
        <VolumeX aria-hidden className="size-5" />
      )}
    </button>
  )
}
