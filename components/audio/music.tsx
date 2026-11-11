"use client"

import { useEffect } from "react"

import { setTrack, type TrackName } from "@/lib/audio/engine"

/** Plays a music loop while the calling component is on screen. */
export function useMusic(track: TrackName | null) {
  useEffect(() => {
    setTrack(track)
    return () => setTrack(null)
  }, [track])
}

/** Drop-in for server components: plays `track` while this page is open. */
export function MusicTrack({ track }: { track: TrackName }) {
  useMusic(track)
  return null
}
