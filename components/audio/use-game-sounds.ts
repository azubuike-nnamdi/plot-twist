"use client"

import { useEffect, useRef } from "react"

import { useMusic } from "@/components/audio/music"
import { playSfx, setMusicIntensity } from "@/lib/audio/engine"
import type { RoomView } from "@/types/room"

function votesCast(view: RoomView) {
  return view.answers.filter((a) => a.yourGuessId).length
}

function reactionTotal(view: RoomView) {
  return view.reactions.reduce((sum, r) => sum + r.count, 0)
}

/**
 * Music and sound effects for a room. The lobby keeps the chilled landing
 * loop, a running match switches to the upbeat one, and each change in the
 * room view (someone joins, a phase flips, your vote lands) plays a cue.
 */
export function useGameSounds(view: RoomView) {
  const inMatch =
    view.phase === "ANSWERING" ||
    view.phase === "GUESSING" ||
    view.phase === "REVEAL"
  useMusic(view.phase === "RESULTS" ? null : inMatch ? "match" : "landing")

  // Answering hums along, guessing presses harder, the reveal goes quiet.
  const phaseIntensity =
    view.phase === "GUESSING" ? 0.5 : view.phase === "REVEAL" ? 0.05 : 0.35
  useEffect(() => {
    setMusicIntensity(phaseIntensity)
  }, [phaseIntensity])

  const previous = useRef<RoomView | null>(null)
  useEffect(() => {
    const before = previous.current
    previous.current = view
    if (!before) return

    if (view.players.length > before.players.length) playSfx("join")
    if (reactionTotal(view) > reactionTotal(before)) playSfx("pop")

    const newRound = view.currentRound !== before.currentRound
    if (view.phase !== before.phase || newRound) {
      switch (view.phase) {
        case "ANSWERING":
          playSfx(before.phase === "LOBBY" ? "start" : "whoosh")
          break
        case "GUESSING":
          playSfx("whoosh")
          break
        case "REVEAL": {
          playSfx("reveal")
          const mine = view.answers.flatMap((a) =>
            (a.votes ?? []).filter((v) => v.isYou)
          )
          const right = mine.some((v) => v.correct)
          const yours = view.answers.find(
            (a) => a.author?.playerId === view.yourPlayerId
          )
          window.setTimeout(() => playSfx(right ? "correct" : "miss"), 650)
          if ((yours?.fooledCount ?? 0) > 0)
            window.setTimeout(() => playSfx("bluff"), 1150)
          break
        }
        case "RESULTS": {
          const top = view.leaderboard[0]
          playSfx(top?.playerId === view.yourPlayerId ? "win" : "finish")
          break
        }
      }
      return
    }

    if (view.phase === "ANSWERING" && view.yourAnswer && !before.yourAnswer)
      playSfx("submit")
    if (view.phase === "GUESSING" && votesCast(view) > votesCast(before))
      playSfx("vote")
  }, [view])
}
