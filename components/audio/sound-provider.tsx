"use client"

import { useEffect } from "react"

import { useSound } from "@/components/audio/sound-store"
import { setSoundEnabled } from "@/lib/audio/engine"

/** Loads the saved sound setting and keeps the audio engine in step with it. */
export function SoundProvider() {
  const enabled = useSound((s) => s.enabled)
  useEffect(() => {
    void useSound.persist.rehydrate()
  }, [])
  useEffect(() => {
    setSoundEnabled(enabled)
  }, [enabled])
  return null
}
