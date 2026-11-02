"use client"

import { useQuery } from "@tanstack/react-query"
import { Check, Copy, Crown, Flame, Home, Lock, Share2 } from "lucide-react"
import Link from "next/link"
import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import {
  answerAction,
  closeRoomAction,
  endGameAction,
  guessAction,
  leaveAction,
  nextRoundAction,
  reactionAction,
  readyAction,
  rematchAction,
  removePlayerAction,
  reportAction,
  skipQuestionAction,
  startGameAction,
} from "@/app/actions/game"
import { AvatarImage } from "@/components/avatars/avatar-image"
import { ClaimAccountForm } from "@/components/forms/claim-account-form"
import type { PromptPack } from "@/components/forms/create-room-form"
import { useGuessStore } from "@/components/game/guess-store"
import { LobbySettings } from "@/components/game/lobby-settings"
import { PlayerPrompts } from "@/components/game/player-prompts"
import { ANSWER_MAX_LENGTH } from "@/features/answers/rules"
import { formatClock, nextClockAnchor, remainingMs, type ClockAnchor } from "@/features/rooms/clock"
import { CORRECT_GUESS_POINTS } from "@/features/scoring/score"
import { formatRoomCode } from "@/features/rooms/codes"
import { showReconnecting } from "@/features/rooms/freshness"
import { REACTIONS } from "@/lib/game/options"
import type { RoomView } from "@/types/room"

function RoomClock({
  deadlineAt,
  serverNow,
  onElapsed,
}: {
  deadlineAt: string | null
  serverNow: string
  onElapsed: () => void
}) {
  const anchor = useRef<ClockAnchor | null>(null)
  const onElapsedRef = useRef(onElapsed)
  const firedDeadline = useRef<string | null>(null)
  const [clock, setClock] = useState<{ deadlineAt: string; label: string } | null>(null)
  useEffect(() => {
    onElapsedRef.current = onElapsed
  }, [onElapsed])
  useEffect(() => {
    if (!deadlineAt) {
      anchor.current = null
      return
    }
    const shownDeadline = deadlineAt
    const clientNow = Date.now()
    anchor.current = nextClockAnchor({
      previous: anchor.current,
      deadline: Date.parse(shownDeadline),
      serverNow: Date.parse(serverNow),
      clientNow,
    })
    const tick = () => {
      const current = anchor.current
      if (!current) return
      const left = remainingMs(current, Date.now())
      const next = formatClock(left)
      setClock((previous) => {
        if (previous?.deadlineAt === shownDeadline && previous.label === next) return previous
        return { deadlineAt: shownDeadline, label: next }
      })
      if (left === 0 && firedDeadline.current !== shownDeadline) {
        firedDeadline.current = shownDeadline
        onElapsedRef.current()
      }
    }
    const starter = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 250)
    return () => {
      window.clearTimeout(starter)
      window.clearInterval(timer)
    }
  }, [deadlineAt, serverNow])
  const label = clock?.deadlineAt === deadlineAt ? clock.label : null
  if (!label) return null
  return (
    <p className="font-mono text-3xl tabular-nums" role="timer" aria-label={`${label} left`}>
      {label}
    </p>
  )
}

function RoomConnection({
  phase,
  dataUpdatedAt,
  isError,
}: {
  phase: string
  dataUpdatedAt: number
  isError: boolean
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const reconnecting = showReconnecting({ phase, dataUpdatedAt, now, isError })
  if (reconnecting) {
    return (
      <p role="status" className="mt-4 rounded-lg bg-[#f5c16c]/10 px-3 py-2 text-sm text-[#f5c16c]">
        Reconnecting
      </p>
    )
  }
  if (!isError) return null
  return (
    <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
      Connection interrupted. Retrying.
    </p>
  )
}

export function RoomBoard({
  initial,
  origin,
  packs,
}: {
  initial: RoomView
  origin: string
  packs: PromptPack[]
}) {
  const query = useQuery({
    queryKey: ["room", initial.code],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${initial.code}/state`, {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("The room could not be refreshed.")
      return (await response.json()) as RoomView
    },
    initialData: initial,
    refetchInterval: (query) => {
      const phase = query.state.data?.phase
      if (phase === "ANSWERING" || phase === "GUESSING") return 1000
      return 4000
    },
    refetchIntervalInBackground: false,
  })
  const view = query.data
  const refetchRoom = query.refetch
  const handleClockElapsed = useCallback(() => {
    void refetchRoom()
  }, [refetchRoom])
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") void refetchRoom()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [refetchRoom])
  const invite = `${origin}/join?code=${view.code}`

  if (view.phase === "LOBBY") {
    return (
      <div className="grid gap-4">
        {query.isError ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Connection interrupted. Retrying.
          </p>
        ) : null}
        <Lobby view={view} invite={invite} packs={packs} />
      </div>
    )
  }

  const clock = (
    <RoomClock
      deadlineAt={view.deadlineAt}
      serverNow={view.serverNow}
      onElapsed={handleClockElapsed}
    />
  )

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <RoomConnection
        phase={view.phase}
        dataUpdatedAt={query.dataUpdatedAt}
        isError={query.isError}
      />
      {view.phase === "ANSWERING" ? (
        <Answering view={view} clock={clock} onSaved={handleClockElapsed} />
      ) : null}
      {view.phase === "GUESSING" ? <Guessing view={view} clock={clock} /> : null}
      {view.phase === "REVEAL" ? <Reveal view={view} /> : null}
      {view.phase === "RESULTS" ? <Results view={view} /> : null}
      {view.youAreHost && view.phase !== "RESULTS" ? <ManagePlayers view={view} /> : null}
    </div>
  )
}

function Lobby({
  view,
  invite,
  packs,
}: {
  view: RoomView
  invite: string
  packs: PromptPack[]
}) {
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(null)
  const joined = view.players.length
  const seatsLeft = Math.max(0, view.maxPlayers - joined)
  const readyCount = view.players.filter((player) => player.ready).length
  const you = view.players.find((player) => player.isYou)
  const fill = view.maxPlayers === 0 ? 0 : Math.round((joined / view.maxPlayers) * 100)
  const openSlots = Array.from({ length: seatsLeft }, (_, index) => joined + index + 1)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2500)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(invite)
      setNotice({ text: "Invite link copied", id: Date.now() })
    } catch {
      setNotice({ text: "Could not copy the invite link", id: Date.now() })
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-[20px] border border-[#302d41] bg-[#1b1730] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="rounded-full bg-[#9b7bff]/20 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#c4b5fd] uppercase">
                Private lounge
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-[#f6f6fa]">
                <span className="size-2 rounded-full bg-[#34d399]" />
                {seatsLeft === 0 ? "Room full" : "Accepting players"}
              </p>
            </div>
          </div>
          <div className="@container/code mt-5 rounded-2xl border border-[#302d41] bg-[#100d1d] p-4">
            <div className="flex flex-col gap-4 @min-[36rem]/code:flex-row @min-[36rem]/code:items-center @min-[36rem]/code:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#afadba] uppercase">
                  Room code
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 font-display text-3xl font-bold tracking-wide text-[#f6f6fa] @min-[36rem]/code:text-4xl">
                  {formatRoomCode(view.code)}
                  <span className="rounded-full bg-[#ffd166] px-2 py-0.5 font-sans text-[10px] font-bold text-[#100d1d]">
                    CODE
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#9b7bff] px-4 text-sm font-semibold whitespace-nowrap text-[#100d1d] @min-[36rem]/code:w-auto"
              >
                <Copy aria-hidden className="size-4" />
                {notice?.text === "Invite link copied" ? "Copied" : "Copy invite link"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#afadba]">
            <span className="rounded-full border border-[#302d41] px-3 py-1">
              {view.categories.join(" · ") || "All packs"}
            </span>
            <span className="rounded-full border border-[#302d41] px-3 py-1">
              {view.answerSeconds}s answering
            </span>
            <span className="rounded-full border border-[#302d41] px-3 py-1">
              {view.totalRounds} rounds
            </span>
          </div>
        </section>
        <section className="rounded-[20px] border border-[#302d41] bg-[#1b1730] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#f6f6fa]">Lobby status</h2>
              <p className="mt-1 text-sm text-[#afadba]">
                {joined} of {view.maxPlayers} players connected
              </p>
            </div>
            <p
              className={`rounded-full px-3 py-1 text-xs font-semibold ${readyCount === joined && joined >= 3
                ? "bg-[#10b981] text-[#100d1d]"
                : "bg-[#302d41] text-[#afadba]"
                }`}
            >
              {readyCount === joined && joined >= 3 ? "Ready to launch" : "Waiting"}
            </p>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-[#afadba]">
              <span>Joined slots</span>
              <span>
                {joined}/{view.maxPlayers} max
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[#302d41]"
              role="progressbar"
              aria-valuenow={joined}
              aria-valuemin={0}
              aria-valuemax={view.maxPlayers}
              aria-label={`${joined} of ${view.maxPlayers} seats filled, ${seatsLeft} left`}
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-[#9b7bff] to-[#d8ccff]"
                style={{ width: `${fill}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-[#f6f6fa]">
              {seatsLeft === 0
                ? "No seats left."
                : `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left`}
            </p>
          </div>
          {view.youAreHost ? (
            <div className="mt-4">
              <LobbySettings view={view} packs={packs} />
            </div>
          ) : null}
          {view.youAreGuest ? (
            <details className="mt-4 rounded-xl bg-[#100d1d] px-3 py-3 text-sm text-[#afadba]">
              <summary className="cursor-pointer text-[#f6f6fa]">
                Keep this name and host next time
              </summary>
              <ClaimAccountForm defaultName={view.yourDisplayName} code={view.code} />
            </details>
          ) : null}
          <div className="mt-4">
            <PlayerPrompts view={view} />
          </div>
          {view.youAreHost ? (
            <p className="mt-4 flex gap-2 rounded-xl bg-[#100d1d] px-3 py-3 text-sm text-[#afadba]">
              <Crown aria-hidden className="mt-0.5 size-4 shrink-0 text-[#ffd166]" />
              <span>
                <span className="font-semibold text-[#f6f6fa]">You are the room host. </span>
                At least 2 players are needed. When everyone is in and ready, start the game.
              </span>
            </p>
          ) : null}
          <form
            action={readyAction.bind(null, view.code, !you?.ready)}
            className="mt-4"
          >
            <button
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${you?.ready
                ? "border-[#10b981] text-[#34d399]"
                : "border-[#302d41] text-[#f6f6fa]"
                }`}
            >
              {you?.ready ? <Check aria-hidden className="size-4" /> : null}
              {you?.ready ? "You are marked ready" : "Mark yourself ready"}
            </button>
          </form>
        </section>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold text-[#f6f6fa]">
          In the lounge ({joined}){" "}
          <span className="ml-1 rounded-full bg-[#302d41] px-2 py-0.5 text-xs font-medium text-[#afadba]">
            {readyCount}/{joined || 0} ready
          </span>
        </h2>
        <p className="text-sm text-[#afadba]">
          Pass {formatRoomCode(view.code)} to friends
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.players.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-2xl border border-[#302d41] bg-[#1b1730] px-3 py-3"
          >
            <AvatarImage avatar={player.avatar} alt="" className="size-10 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-[#f6f6fa]">{player.displayName}</span>
                {player.isHost ? (
                  <span className="rounded-full bg-[#ffd166]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd166]">
                    HOST
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-[#afadba]">
                {player.ready ? "Locked and ready" : "Not ready yet"}
              </span>
            </span>
            {player.ready ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-[#10b981] text-[#100d1d]">
                <Check aria-hidden className="size-3.5" />
              </span>
            ) : (
              <span className="rounded-full bg-[#ffd166]/20 px-2 py-0.5 text-[10px] font-semibold text-[#ffd166]">
                Waiting
              </span>
            )}
            {view.youAreHost && !player.isYou ? (
              <form action={removePlayerAction.bind(null, view.code, player.id)}>
                <button className="min-h-11 px-1 text-xs text-red-300">Remove</button>
              </form>
            ) : null}
          </li>
        ))}
        {openSlots.map((slot) => (
          <li key={`open-${slot}`}>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="flex h-full min-h-16 w-full items-center gap-3 rounded-2xl border border-dashed border-[#302d41] bg-[#100d1d]/60 px-3 py-3 text-left"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#302d41] text-[#afadba]">
                +
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#f6f6fa]">Slot #{slot} open</span>
                <span className="block text-xs text-[#afadba]">Tap to invite a friend</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 rounded-2xl border border-[#302d41] bg-[#1b1730] p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="px-2 text-sm">
          <span className="block font-semibold text-[#f6f6fa]">{view.name}</span>
          <span className="text-[#afadba]">Waiting for players to lock in.</span>
        </p>
        <div className="grid gap-2 sm:flex">
          <form action={leaveAction.bind(null, view.code)}>
            <button className="h-11 w-full rounded-xl border border-[#302d41] px-4 text-sm text-[#f6f6fa] sm:w-auto">
              Leave
            </button>
          </form>
          {view.youAreHost ? (
            <form action={startGameAction.bind(null, view.code)}>
              <button className="h-11 w-full rounded-xl bg-[#9b7bff] px-5 font-semibold text-[#100d1d] sm:w-auto">
                Start game
              </button>
            </form>
          ) : null}
        </div>
      </div>
      {notice ? (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#302d41] bg-[#1b1730] px-4 py-3 text-sm text-[#f6f6fa] shadow-sm"
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}

function Answering({
  view,
  clock,
  onSaved,
}: {
  view: RoomView
  clock: ReactNode
  onSaved: () => void
}) {
  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-[24px] border border-[#302d41] bg-[#161222]">
        <div aria-hidden className="h-1 bg-linear-to-r from-[#ff6b8a] via-[#c4b5fd] to-[#ffd166]" />
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ff6b8a]/15 px-2.5 py-1 text-xs font-semibold text-[#ff8fab]">
              <Flame className="size-3.5" aria-hidden />
              {view.askedBy ? `${view.askedBy} asks` : view.categoryName}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-[#9c98ad]">
              <Lock className="size-3.5" aria-hidden />
              Secret submission
            </span>
          </div>
          <h2 className="font-display mt-4 text-2xl font-bold leading-tight wrap-break-word sm:text-3xl">
            {view.question}
          </h2>
          {view.isReplay ? (
            <p className="mt-2 text-xs font-semibold text-[#ffd166]">Replay · this group has heard this prompt</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-[#9c98ad]">Anonymous voting next</span>
            <span className="font-semibold text-[#ffd166]">+{CORRECT_GUESS_POINTS} pts per correct guess</span>
          </div>
          <div className="mt-3 flex justify-end">{clock}</div>
        </div>
      </section>
      {view.yourAnswer ? (
        <p className="rounded-[16px] border border-[#302d41] bg-[#161222] px-4 py-3 text-sm text-[#d8d6e3]">
          Locked in. Your answer stays hidden until the reveal.
        </p>
      ) : (
        <AnswerForm code={view.code} round={view.currentRound} onSaved={onSaved} />
      )}
      <SeatRow
        view={view}
        title="Lobby status"
        detail={`${view.submittedCount}/${view.expectedAnswers} locked in`}
      />
      <p className="text-center text-sm text-[#9c98ad]">
        Voting opens when the timer ends or everyone locks an answer in.
      </p>
      {view.youAreHost ? (
        <div className="flex flex-wrap justify-center gap-2">
          <form action={skipQuestionAction.bind(null, view.code)}>
            <button className="h-10 rounded-lg border border-border px-3 text-sm">Skip question</button>
          </form>
          <form action={endGameAction.bind(null, view.code)}>
            <button className="h-10 rounded-lg px-3 text-sm">End game</button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function Guessing({ view, clock }: { view: RoomView; clock: ReactNode }) {
  const selected = useGuessStore((state) => state.selected)
  const select = useGuessStore((state) => state.select)
  const suspects = view.players.filter((player) => !player.isYou)
  const lockedCount = view.players.filter((player) => player.lockedIn).length
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-[#9b7bff]/15 px-2.5 py-1 text-xs font-semibold text-[#d8c7ff]">
          {view.answers.length === 0
            ? "No answers to vote on"
            : `${view.answers.length} secret ${view.answers.length === 1 ? "answer" : "answers"}`}
        </span>
        <span className="text-xs font-semibold text-[#ffd166]">+{CORRECT_GUESS_POINTS} pts on a correct guess</span>
      </div>
      {view.answers.length === 0 ? (
        <p className="rounded-[16px] border border-[#302d41] bg-[#161222] px-4 py-3 text-sm text-[#d8d6e3]">
          Your own answer stays hidden. Other answers show up here for you to name.
        </p>
      ) : null}
      {view.answers.map((answer, index) => {
        const pickedId = selected[answer.id] ?? answer.yourGuessId ?? ""
        const picked = suspects.find((player) => player.id === pickedId)
        return (
          <article key={answer.id} className="overflow-hidden rounded-[24px] border border-[#3a3458] bg-[#161222]">
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-xs text-[#9c98ad]">
              <span>Answer {index + 1} of {view.answers.length}</span>
              {index === 0 ? clock : null}
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#9b7bff] uppercase">
                {view.categoryName}
              </p>
              <h2 className="font-display mt-2 text-xl font-bold wrap-break-word">{view.question}</h2>
              <blockquote className="mt-4 rounded-2xl bg-[#100d1d] px-4 py-4 text-center text-base leading-7 text-[#f6f6fa]">
                “{answer.text}”
              </blockquote>
              <p className="mt-3 text-center text-xs text-[#9c98ad]">
                Submitted anonymously by a player in this room
              </p>
            </div>
            <div className="border-t border-white/5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Who wrote this answer?</h3>
                <span className="text-xs text-[#9c98ad]">{picked ? "1 selected" : "Pick 1"}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suspects.map((player) => {
                  const active = pickedId === player.id
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => select(answer.id, player.id)}
                      aria-pressed={active}
                      className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-2 text-left ${active ? "border-[#9b7bff] bg-[#9b7bff]/10" : "border-[#302d41] bg-[#120f1c]"
                        }`}
                    >
                      <AvatarImage avatar={player.avatar} alt="" className="size-10" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{player.displayName}</span>
                      <span
                        className={`flex size-5 items-center justify-center rounded-full border ${active ? "border-[#9b7bff] bg-[#9b7bff] text-white" : "border-[#3a3450]"
                          }`}
                      >
                        {active ? <Check className="size-3" aria-hidden /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
              <GuessForm
                code={view.code}
                answerId={answer.id}
                guessedPlayerId={pickedId}
                suspectName={picked?.displayName ?? ""}
                locked={Boolean(answer.yourGuessId)}
              />
            </div>
          </article>
        )
      })}
      <p className="text-center text-xs text-[#9c98ad]">
        The writer’s name stays hidden until everyone has guessed or the timer ends.
      </p>
      <SeatRow view={view} title="Room guessers" detail={`${lockedCount} of ${view.players.length} locked`} />
    </div>
  )
}

function Reveal({ view }: { view: RoomView }) {
  return (
    <div className="grid gap-4">
      {view.answers.map((answer) => {
        const author = view.players.find((player) => player.id === answer.author?.playerId)
        const votes = answer.votes ?? []
        const correct = votes.filter((vote) => vote.correct)
        const missed = votes.filter((vote) => !vote.correct)
        const yours = votes.find((vote) => vote.isYou)
        return (
          <article key={answer.id} className="grid gap-4">
            <section className="rounded-[24px] border border-[#302d41] bg-[#161222] p-4 sm:p-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#9b7bff] uppercase">The secret answer</p>
              <h2 className="font-display mt-2 text-lg font-bold wrap-break-word">{view.question}</h2>
              <p className="mt-4 text-lg leading-7 wrap-break-word">“{answer.text}”</p>
            </section>
            <section className="rounded-[24px] border border-[#9b7bff]/40 bg-[#161222] p-5 text-center">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#c4b5fd] uppercase">Identity revealed</p>
              <AvatarImage
                avatar={author?.avatar ?? "cipher"}
                alt=""
                className="mx-auto mt-4 size-20"
              />
              <h3 className="font-display mt-3 text-2xl font-bold wrap-break-word">
                {answer.author?.displayName ?? "Unknown"}
              </h3>
              <p className="mt-1 text-sm text-[#9c98ad]">
                Wrote this. Fooled {missed.length} out of {votes.length} {votes.length === 1 ? "player" : "players"}.
              </p>
            </section>
            {yours ? (
              <p className="rounded-2xl bg-[#ffd166]/10 px-4 py-3 text-sm text-[#ffd166]">
                {yours.correct
                  ? `You guessed correctly. +${yours.points} pts`
                  : `You guessed ${yours.guessedName}. +${yours.points} pts`}
              </p>
            ) : null}
            <section className="rounded-[24px] border border-[#302d41] bg-[#161222] p-4">
              <h3 className="text-sm font-semibold">Who voted what</h3>
              <VoteList title={`Correct (${correct.length})`} votes={correct} tone="text-[#34d399]" />
              <VoteList title={`Missed it (${missed.length})`} votes={missed} tone="text-[#ff8fab]" />
            </section>
            <ReportForm code={view.code} answerId={answer.id} />
          </article>
        )
      })}
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((emoji) => (
          <form key={emoji} action={reactionAction.bind(null, view.code, emoji)}>
            <button className="min-h-11 rounded-lg border border-border px-3" type="submit">
              {emoji} {view.reactions.find((item) => item.emoji === emoji)?.count ?? 0}
            </button>
          </form>
        ))}
      </div>
      {view.youAreHost ? (
        <form action={nextRoundAction.bind(null, view.code)}>
          <button className="h-12 w-full rounded-2xl bg-[#9b7bff] px-4 font-semibold text-white">
            {view.currentRound >= view.totalRounds
              ? "Show final results"
              : `Next round (${view.currentRound}/${view.totalRounds})`}
          </button>
        </form>
      ) : (
        <p className="text-center text-sm text-[#9c98ad]">Waiting for the host to continue.</p>
      )}
    </div>
  )
}

function Results({ view }: { view: RoomView }) {
  const [copied, setCopied] = useState(false)
  const board = view.leaderboard
  async function handleShare() {
    const lines = board.map((row, index) => `${index + 1}. ${row.displayName} — ${row.score} pts`)
    const text = [`${view.name} podium`, formatRoomCode(view.code), ...lines].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="grid gap-4">
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#ffd166] uppercase">
          Match concluded · {view.currentRound} of {view.totalRounds} rounds
        </p>
        <h2 className="font-display mt-2 text-3xl font-bold">Championship podium</h2>
        <p className="mt-1 text-sm text-[#9c98ad]">The answers are out. Here are the standings.</p>
      </header>
      <div className="grid grid-cols-3 items-end gap-2">
        {[board[1], board[0], board[2]].map((row, index) => {
          const place = index === 1 ? 1 : index === 0 ? 2 : 3
          if (!row) return <div key={place} />
          const first = place === 1
          return (
            <div
              key={row.playerId}
              className={`rounded-[20px] border px-2 py-4 text-center ${first ? "border-[#9b7bff] bg-[#9b7bff]/10" : "border-[#302d41] bg-[#161222]"
                }`}
            >
              {first ? <Crown className="mx-auto size-5 text-[#ffd166]" aria-hidden /> : null}
              <AvatarImage avatar={row.avatar} alt="" className={`mx-auto ${first ? "size-16" : "size-12"}`} />
              <p className="mt-2 text-xs font-semibold text-[#ffd166]">{place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}</p>
              <p className="truncate text-sm font-semibold">{row.displayName}</p>
              <p className="text-xs text-[#9c98ad]">{row.score} pts</p>
            </div>
          )
        })}
      </div>
      <ol className="grid gap-2">
        {board.map((row, index) => (
          <li
            key={row.playerId}
            className="flex items-center gap-3 rounded-2xl border border-[#302d41] bg-[#161222] px-3 py-3"
          >
            <span className="w-5 text-center text-sm font-semibold text-[#9c98ad]">{index + 1}</span>
            <AvatarImage avatar={row.avatar} alt="" className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {row.displayName}
                {row.playerId === view.yourPlayerId ? " (You)" : ""}
              </span>
              <span className="block text-xs text-[#9c98ad]">
                {row.accuracy}% accuracy · {row.correctGuesses} correct
              </span>
            </span>
            <span className="font-semibold">{row.score} pts</span>
          </li>
        ))}
      </ol>
      <p className="text-center font-mono text-xs text-[#9c98ad]">{formatRoomCode(view.code)}</p>
      {view.youAreGuest ? (
        <div className="rounded-xl border border-[#302d41] bg-[#100d1d] p-4">
          <h3 className="font-semibold text-[#f6f6fa]">Keep this name and host next time</h3>
          <p className="mt-1 text-sm text-[#afadba]">
            Save {view.yourDisplayName} on an account. Your score in this room stays with you.
          </p>
          <ClaimAccountForm defaultName={view.yourDisplayName} code={view.code} />
        </div>
      ) : null}
      <div className="grid gap-2">
        {view.youAreHost && view.status === "COMPLETED" ? (
          <form action={rematchAction.bind(null, view.code)}>
            <button className="h-12 w-full rounded-2xl bg-[#9b7bff] font-semibold text-white">Play again</button>
          </form>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#302d41] text-sm"
          >
            <Share2 className="size-4" aria-hidden />
            {copied ? "Copied" : "Share podium"}
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#302d41] text-sm"
          >
            <Home className="size-4" aria-hidden />
            Return home
          </Link>
        </div>
        {view.youAreHost && view.status === "COMPLETED" ? (
          <form action={closeRoomAction.bind(null, view.code)}>
            <button className="h-11 w-full rounded-2xl border border-border text-sm">Close room</button>
          </form>
        ) : null}
      </div>
    </div>
  )
}

function Notice({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error) return null
  return <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>
}

const answerDrafts = new Map<string, string>()

function AnswerForm({
  code,
  round,
  onSaved,
}: {
  code: string
  round: number
  onSaved: () => void
}) {
  const draftKey = `${code}:${round}`
  const [state, action, pending] = useActionState(answerAction, null)
  useEffect(() => {
    if (state?.success) onSaved()
  }, [state, onSaved])
  const [answer, setAnswer] = useState(() => answerDrafts.get(draftKey) ?? "")
  const [seenKey, setSeenKey] = useState(draftKey)
  if (seenKey !== draftKey) {
    setSeenKey(draftKey)
    setAnswer(answerDrafts.get(draftKey) ?? "")
  }
  return (
    <form action={action} className="grid gap-3">
      <Notice state={state} />
      <input type="hidden" name="code" value={code} />
      <div className="flex items-center justify-between gap-3 text-xs font-semibold tracking-[0.12em] text-[#9c98ad] uppercase">
        <span>Your secret answer</span>
        <span className="tracking-normal normal-case">{Math.max(0, ANSWER_MAX_LENGTH - answer.length)} left</span>
      </div>
      <textarea
        name="answer"
        required
        maxLength={ANSWER_MAX_LENGTH}
        rows={4}
        value={answer}
        onChange={(event) => {
          answerDrafts.set(draftKey, event.target.value)
          setAnswer(event.target.value)
        }}
        className="rounded-[16px] border border-[#302d41] bg-[#100d1d] p-3 text-[#f6f6fa] outline-none placeholder:text-[#afadba] focus:border-[#9b7bff]"
        placeholder="Write your secret answer"
      />
      <button
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#9b7bff] font-semibold text-white disabled:opacity-60"
      >
        <Lock className="size-4" aria-hidden />
        {pending ? "Locking in…" : "Lock in secret answer"}
      </button>
    </form>
  )
}

function GuessForm({
  code,
  answerId,
  guessedPlayerId,
  suspectName,
  locked,
}: {
  code: string
  answerId: string
  guessedPlayerId: string
  suspectName: string
  locked: boolean
}) {
  const [state, action, pending] = useActionState(guessAction, null)
  const label = locked ? "Vote locked" : suspectName ? `Lock in vote for ${suspectName}` : "Lock in vote"
  return (
    <form action={action} className="mt-4 grid gap-2">
      <Notice state={state} />
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="answerId" value={answerId} />
      <input type="hidden" name="guessedPlayerId" value={guessedPlayerId} />
      <button
        disabled={pending || locked || !guessedPlayerId}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#9b7bff] font-semibold text-white disabled:opacity-50"
      >
        <Lock className="size-4" aria-hidden />
        {pending ? "Locking in…" : label}
      </button>
    </form>
  )
}

function ReportForm({ code, answerId }: { code: string; answerId: string }) {
  const [state, action, pending] = useActionState(reportAction, null)
  return (
    <form action={action} className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="answerId" value={answerId} />
      <input
        name="reason"
        required
        minLength={4}
        maxLength={500}
        placeholder="Report this answer"
        className="h-11 w-full min-w-0 rounded-lg border border-[#302d41] bg-[#100d1d] px-3 text-sm text-[#f6f6fa] placeholder:text-[#afadba] sm:flex-1"
      />
      <button disabled={pending} className="h-11 rounded-lg border border-border px-3 text-sm sm:w-auto">
        Report
      </button>
      {state?.success ? <p className="w-full text-sm text-emerald-300">{state.success}</p> : null}
      {state?.error ? <p className="w-full text-sm text-red-300">{state.error}</p> : null}
    </form>
  )
}

function VoteList({
  title,
  votes,
  tone,
}: {
  title: string
  votes: { displayName: string; guessedName: string; points: number; correct: boolean }[]
  tone: string
}) {
  if (votes.length === 0) return null
  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold ${tone}`}>{title}</p>
      <ul className="mt-2 grid gap-2">
        {votes.map((vote) => (
          <li key={`${vote.displayName}-${vote.guessedName}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {vote.displayName}
              {vote.correct ? "" : ` · guessed ${vote.guessedName}`}
            </span>
            <span className="shrink-0 text-[#9c98ad]">+{vote.points} pts</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SeatRow({ view, title, detail }: { view: RoomView; title: string; detail: string }) {
  return (
    <section className="rounded-[24px] border border-[#302d41] bg-[#161222] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[#d8d6e3]">{detail}</span>
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-4">
        {view.players.map((player) => (
          <li key={player.id} className="w-16 text-center">
            <span className="relative mx-auto block w-fit">
              <AvatarImage avatar={player.avatar} alt="" className="size-12" />
              {player.lockedIn ? (
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-[#34d399] text-[#10281f]">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : null}
            </span>
            <span className="mt-2 block truncate text-xs text-[#d8d6e3]">
              {player.isYou ? `${player.displayName} (You)` : player.displayName}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ManagePlayers({ view }: { view: RoomView }) {
  return (
    <aside className="rounded-[20px] border border-[#302d41] bg-[#1b1730] p-4">
      <h2 className="font-semibold">Manage players</h2>
      <ul className="mt-3 grid gap-2">
        {view.players.map((player) => (
          <li key={player.id} className="flex items-center gap-2 rounded-xl bg-[#100d1d] px-3 py-2 text-sm">
            <AvatarImage avatar={player.avatar} alt="" className="size-8 shrink-0" />
            <span className="min-w-0 flex-1 wrap-break-word">
              <span className="block text-[#f6f6fa]">{player.displayName}</span>
              <span className="mt-1 flex flex-wrap gap-1">
                {player.isHost ? (
                  <span className="rounded-full bg-[#ffd166]/15 px-2 py-0.5 text-[10px] font-semibold text-[#ffd166]">
                    HOST
                  </span>
                ) : null}
                {player.isYou ? (
                  <span className="rounded-full bg-[#9b7bff]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9b7bff]">
                    YOU
                  </span>
                ) : null}
                {player.ready ? (
                  <span className="rounded-full bg-[#10b981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10b981]">
                    READY
                  </span>
                ) : null}
              </span>
            </span>
            <span className="shrink-0 font-mono">{player.score}</span>
            {view.youAreHost && !player.isYou ? (
              <form action={removePlayerAction.bind(null, view.code, player.id)}>
                <button className="min-h-11 px-2 text-xs text-red-300">Remove</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  )
}
