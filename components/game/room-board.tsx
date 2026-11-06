"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Copy, Crown, Flame, Home, Lock, Share2 } from "lucide-react"
import Link from "next/link"
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

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
import { useRoomChannel } from "@/components/game/use-room-channel"
import {
  roomQueryKey,
  useRefreshRoom,
  useRoomAction,
} from "@/components/game/use-room-refresh"
import { ANSWER_MAX_LENGTH } from "@/features/answers/rules"
import {
  formatClock,
  nextClockAnchor,
  remainingMs,
  type ClockAnchor,
} from "@/features/rooms/clock"
import { BLUFF_POINTS, CORRECT_GUESS_POINTS } from "@/features/scoring/score"
import { formatRoomCode } from "@/features/rooms/codes"
import { showReconnecting } from "@/features/rooms/freshness"
import { pollIntervalFor } from "@/features/rooms/poll"
import { REACTIONS } from "@/lib/game/options"
import type { RealtimeConfig } from "@/lib/realtime/channels"
import type { RoomPollUnchanged, RoomView } from "@/types/room"

const URGENT_SECONDS = 5

function RoomClock({
  deadlineAt,
  serverNow,
  totalSeconds,
  onElapsed,
}: {
  deadlineAt: string | null
  serverNow: string
  totalSeconds: number
  onElapsed: () => void
}) {
  const anchor = useRef<ClockAnchor | null>(null)
  const onElapsedRef = useRef(onElapsed)
  const firedDeadline = useRef<string | null>(null)
  const [clock, setClock] = useState<{
    deadlineAt: string
    label: string
    left: number
  } | null>(null)
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
      // Quarter-second steps keep the bar smooth without a render every frame.
      const step = Math.ceil(left / 250) * 250
      setClock((previous) => {
        if (previous?.deadlineAt === shownDeadline && previous.left === step)
          return previous
        return { deadlineAt: shownDeadline, label: next, left: step }
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
  const current = clock?.deadlineAt === deadlineAt ? clock : null
  if (!current) return null
  const total = Math.max(1, totalSeconds) * 1000
  const percent = Math.min(100, Math.max(0, (current.left / total) * 100))
  const urgent = current.left <= URGENT_SECONDS * 1000
  return (
    <div
      className="grid w-28 gap-1.5"
      role="timer"
      aria-label={`${current.label} left`}
    >
      <p
        className={`text-right font-mono text-3xl tabular-nums ${
          urgent ? "animate-pulse text-[#ff6b8a]" : "text-[#f6f6fa]"
        }`}
      >
        {current.label}
      </p>
      <div
        aria-hidden
        className="h-1.5 overflow-hidden rounded-full bg-[#302d41]"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
            urgent
              ? "bg-[#ff6b8a]"
              : "bg-linear-to-r from-[#9b7bff] to-[#ffd166]"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
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
      <p
        role="status"
        className="mt-4 rounded-lg bg-[#f5c16c]/10 px-3 py-2 text-sm text-[#f5c16c]"
      >
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
  realtime = null,
}: {
  initial: RoomView
  origin: string
  packs: PromptPack[]
  realtime?: RealtimeConfig | null
}) {
  const queryClient = useQueryClient()
  const handlePush = useCallback(
    (version: number) => {
      const known = queryClient.getQueryData<RoomView>(
        roomQueryKey(initial.code)
      )
      if (known && known.version >= version) return
      void queryClient.invalidateQueries({
        queryKey: roomQueryKey(initial.code),
      })
    },
    [queryClient, initial.code]
  )
  const pushConnected = useRoomChannel(initial.code, realtime, handlePush)
  const query = useQuery({
    queryKey: roomQueryKey(initial.code),
    queryFn: async ({ signal }) => {
      const known = queryClient.getQueryData<RoomView>(
        roomQueryKey(initial.code)
      )
      const since = known ? `?v=${known.version}` : ""
      const response = await fetch(`/api/rooms/${initial.code}/state${since}`, {
        cache: "no-store",
        signal,
      })
      if (!response.ok) throw new Error("The room could not be refreshed.")
      const payload = (await response.json()) as RoomView | RoomPollUnchanged
      if ("unchanged" in payload) {
        // Nothing moved on the server. Keep the current view and only resync the clock.
        if (known) return { ...known, serverNow: payload.serverNow }
        throw new Error("The room could not be refreshed.")
      }
      return payload
    },
    initialData: initial,
    refetchInterval: (query) =>
      pollIntervalFor(query.state.data?.phase, pushConnected),
    refetchIntervalInBackground: false,
    retry: 1,
    retryDelay: 500,
  })
  const view = query.data
  const refetchRoom = query.refetch
  // Catch up on anything missed while the socket was down.
  useEffect(() => {
    if (pushConnected) void refetchRoom()
  }, [pushConnected, refetchRoom])
  const handleClockElapsed = useCallback(() => {
    void refetchRoom()
  }, [refetchRoom])
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") void refetchRoom()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility)
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
      totalSeconds={
        view.phase === "GUESSING" ? view.guessingSeconds : view.answerSeconds
      }
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
      {view.phase === "GUESSING" ? (
        <Guessing view={view} clock={clock} />
      ) : null}
      {view.phase === "REVEAL" ? <Reveal view={view} /> : null}
      {view.phase === "RESULTS" ? <Results view={view} /> : null}
      {view.youAreHost && view.phase !== "RESULTS" ? (
        <ManagePlayers view={view} />
      ) : null}
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
  const [notice, setNotice] = useState<{ text: string; id: number } | null>(
    null
  )
  const act = useRoomAction(view.code)
  const joined = view.players.length
  const seatsLeft = Math.max(0, view.maxPlayers - joined)
  const readyCount = view.players.filter((player) => player.ready).length
  const you = view.players.find((player) => player.isYou)
  const fill =
    view.maxPlayers === 0 ? 0 : Math.round((joined / view.maxPlayers) * 100)
  const openSlots = Array.from(
    { length: seatsLeft },
    (_, index) => joined + index + 1
  )
  const canStart = joined >= 2

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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
        <div className="grid content-start gap-4">
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
                  <p className="mt-1 flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-wide whitespace-nowrap text-[#f6f6fa] sm:text-3xl @min-[36rem]/code:text-4xl">
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
                  {notice?.text === "Invite link copied"
                    ? "Copied"
                    : "Copy invite link"}
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
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {view.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#302d41] bg-[#100d1d] px-3 py-3"
                >
                  <AvatarImage
                    avatar={player.avatar}
                    alt=""
                    className="size-10 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-[#f6f6fa]">
                        {player.displayName}
                      </span>
                      {player.isHost ? (
                        <span className="rounded-full bg-[#ffd166]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd166]">
                          HOST
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#afadba]">
                      {player.ready ? "Ready" : "Not ready yet"}
                    </span>
                  </span>
                  {player.ready ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[#100d1d]">
                      <Check aria-hidden className="size-3.5" />
                    </span>
                  ) : null}
                  {view.youAreHost && !player.isYou ? (
                    <form
                      action={act(removePlayerAction, view.code, player.id)}
                    >
                      <button className="min-h-11 px-1 text-xs text-red-300">
                        Remove
                      </button>
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
                      <span className="block text-sm font-semibold text-[#f6f6fa]">
                        Slot #{slot} open
                      </span>
                      <span className="block text-xs text-[#afadba]">
                        Tap to invite a friend
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <section className="rounded-[20px] border border-[#302d41] bg-[#1b1730] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#f6f6fa]">Lobby status</h2>
              <p className="mt-1 text-sm text-[#afadba]">
                {joined} of {view.maxPlayers} players connected
              </p>
            </div>
            <p
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                readyCount === joined && canStart
                  ? "bg-[#10b981] text-[#100d1d]"
                  : "bg-[#302d41] text-[#afadba]"
              }`}
            >
              {readyCount === joined && canStart
                ? "Ready to launch"
                : "Waiting"}
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
              <ClaimAccountForm
                defaultName={view.yourDisplayName}
                code={view.code}
              />
            </details>
          ) : null}
          <div className="mt-4">
            <PlayerPrompts view={view} />
          </div>
          {view.youAreHost ? (
            <p className="mt-4 flex gap-2 rounded-xl bg-[#100d1d] px-3 py-3 text-sm text-[#afadba]">
              <Crown
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-[#ffd166]"
              />
              <span>
                <span className="font-semibold text-[#f6f6fa]">
                  You are the room host.{" "}
                </span>
                At least 2 players are needed. When everyone is in and ready,
                start the game.
              </span>
            </p>
          ) : null}
        </section>
      </div>
      <div className="sticky bottom-3 z-30 flex flex-col gap-2 rounded-2xl border border-[#302d41] bg-[#1b1730]/90 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3">
        <p className="hidden px-2 text-sm sm:block">
          <span className="block font-semibold text-[#f6f6fa]">
            {view.name}
          </span>
          <span className="text-[#afadba]">
            {canStart
              ? `${readyCount}/${joined} ready. ${view.youAreHost ? "Start when you like." : "Waiting for the host."}`
              : "Waiting for at least 2 players."}
          </span>
        </p>
        <div className="flex gap-2">
          <form action={leaveAction.bind(null, view.code)}>
            <button className="h-11 rounded-xl border border-[#302d41] px-3 text-sm text-[#f6f6fa] sm:px-4">
              Leave
            </button>
          </form>
          <form
            action={act(readyAction, view.code, !you?.ready)}
            className={view.youAreHost ? "" : "flex-1 sm:flex-none"}
          >
            <button
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold sm:w-auto sm:px-4 ${
                you?.ready
                  ? "border-[#10b981] text-[#34d399]"
                  : "border-[#302d41] text-[#f6f6fa]"
              }`}
            >
              {you?.ready ? <Check aria-hidden className="size-4" /> : null}
              {you?.ready ? "Ready" : "Mark ready"}
            </button>
          </form>
          {view.youAreHost ? (
            <form
              action={act(startGameAction, view.code)}
              className="flex-1 sm:flex-none"
            >
              <button
                disabled={!canStart}
                className="h-11 w-full rounded-xl bg-[#9b7bff] px-5 font-semibold text-[#100d1d] disabled:opacity-50 sm:w-auto"
              >
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
  const act = useRoomAction(view.code)
  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-[24px] border border-[#302d41] bg-[#161222]">
        <div
          aria-hidden
          className="h-1 bg-linear-to-r from-[#ff6b8a] via-[#c4b5fd] to-[#ffd166]"
        />
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
          <h2 className="mt-4 font-display text-2xl leading-tight font-bold wrap-break-word sm:text-3xl">
            {view.question}
          </h2>
          {view.isReplay ? (
            <p className="mt-2 text-xs font-semibold text-[#ffd166]">
              Replay · this group has heard this prompt
            </p>
          ) : null}
          <div className="mt-4 flex items-end justify-between gap-3">
            <PointChips />
            {clock}
          </div>
          <p className="mt-3 text-sm text-[#9c98ad]">
            Disguise your style. Every friend you fool pays you.
          </p>
        </div>
      </section>
      {view.yourAnswer ? (
        <p className="rounded-[16px] border border-[#302d41] bg-[#161222] px-4 py-3 text-sm text-[#d8d6e3]">
          Locked in. Your answer stays hidden until the reveal.
        </p>
      ) : (
        <AnswerForm
          code={view.code}
          round={view.currentRound}
          onSaved={onSaved}
        />
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
          <form action={act(skipQuestionAction, view.code)}>
            <button className="h-10 rounded-lg border border-border px-3 text-sm">
              Skip question
            </button>
          </form>
          <form action={act(endGameAction, view.code)}>
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
  const votedCount = view.answers.filter((answer) => answer.yourGuessId).length
  const allVoted = view.answers.length > 0 && votedCount === view.answers.length
  return (
    <div className="grid gap-4">
      <section className="sticky top-2 z-20 rounded-[20px] border border-[#3a3458] bg-[#161222]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#9b7bff] uppercase">
              {view.categoryName}
            </p>
            <h2 className="mt-1 font-display text-base leading-snug font-bold wrap-break-word sm:text-xl">
              {view.question}
            </h2>
          </div>
          {clock}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              allVoted
                ? "bg-[#10b981]/15 text-[#34d399]"
                : "bg-[#9b7bff]/15 text-[#d8c7ff]"
            }`}
          >
            {view.answers.length === 0
              ? "No answers to vote on"
              : allVoted
                ? "All your votes are in"
                : `You voted ${votedCount} of ${view.answers.length}`}
          </span>
          <div className="hidden sm:block">
            <PointChips />
          </div>
        </div>
      </section>
      {view.answers.length === 0 ? (
        <p className="rounded-[16px] border border-[#302d41] bg-[#161222] px-4 py-3 text-sm text-[#d8d6e3]">
          Your own answer stays hidden. Other answers show up here for you to
          name.
        </p>
      ) : null}
      {view.answers.map((answer, index) => {
        const pickedId = selected[answer.id] ?? answer.yourGuessId ?? ""
        const picked = suspects.find((player) => player.id === pickedId)
        return (
          <article
            key={answer.id}
            className="overflow-hidden rounded-[24px] border border-[#3a3458] bg-[#161222]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-xs text-[#9c98ad]">
              <span>
                Answer {index + 1} of {view.answers.length}
              </span>
              {answer.yourGuessId ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#34d399]">
                  <Check className="size-3.5" aria-hidden />
                  Voted
                </span>
              ) : null}
            </div>
            <div className="p-4 sm:p-5">
              <blockquote className="rounded-2xl bg-[#100d1d] px-4 py-5 text-center text-lg leading-7 wrap-break-word text-[#f6f6fa]">
                “{answer.text}”
              </blockquote>
            </div>
            <div className="border-t border-white/5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Who wrote this answer?</h3>
                <span className="text-xs text-[#9c98ad]">
                  {picked ? "1 selected" : "Pick 1"}
                </span>
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
                      className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-2 text-left ${
                        active
                          ? "border-[#9b7bff] bg-[#9b7bff]/10"
                          : "border-[#302d41] bg-[#120f1c]"
                      }`}
                    >
                      <AvatarImage
                        avatar={player.avatar}
                        alt=""
                        className="size-10"
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {player.displayName}
                      </span>
                      <span
                        className={`flex size-5 items-center justify-center rounded-full border ${
                          active
                            ? "border-[#9b7bff] bg-[#9b7bff] text-white"
                            : "border-[#3a3450]"
                        }`}
                      >
                        {active ? (
                          <Check className="size-3" aria-hidden />
                        ) : null}
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
        The writer’s name stays hidden until everyone has guessed or the timer
        ends.
      </p>
      <SeatRow
        view={view}
        title="Room guessers"
        detail={`${lockedCount} of ${view.players.length} locked`}
      />
    </div>
  )
}

function Reveal({ view }: { view: RoomView }) {
  const act = useRoomAction(view.code)
  return (
    <div className="grid gap-4">
      <section className="rounded-[20px] border border-[#302d41] bg-[#161222] p-4 sm:p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#9b7bff] uppercase">
          Round {view.currentRound} of {view.totalRounds} · the reveal
        </p>
        <h2 className="mt-1 font-display text-lg leading-snug font-bold wrap-break-word sm:text-xl">
          {view.question}
        </h2>
      </section>
      {view.answers.map((answer) => {
        const author = view.players.find(
          (player) => player.id === answer.author?.playerId
        )
        const votes = answer.votes ?? []
        const correct = votes.filter((vote) => vote.correct)
        const missed = votes.filter((vote) => !vote.correct)
        const yours = votes.find((vote) => vote.isYou)
        const isYourAnswer = answer.author?.playerId === view.yourPlayerId
        return (
          <article
            key={answer.id}
            className="overflow-hidden rounded-[24px] border border-[#3a3458] bg-[#161222]"
          >
            <blockquote className="px-4 pt-5 pb-4 text-center text-lg leading-7 wrap-break-word text-[#f6f6fa] sm:px-6">
              “{answer.text}”
            </blockquote>
            <div className="flex items-center gap-3 border-t border-white/5 bg-[#9b7bff]/5 px-4 py-4 sm:px-6">
              <AvatarImage
                avatar={author?.avatar ?? "cipher"}
                alt=""
                className="size-14 ring-2 ring-[#9b7bff]/60"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c4b5fd] uppercase">
                  Written by
                </p>
                <p className="truncate font-display text-xl font-bold">
                  {answer.author?.displayName ?? "Unknown"}
                  {isYourAnswer ? " (You)" : ""}
                </p>
                <p className="text-xs text-[#9c98ad]">
                  Fooled {missed.length} of {votes.length}{" "}
                  {votes.length === 1 ? "voter" : "voters"}
                </p>
              </div>
              {(answer.bluffPoints ?? 0) > 0 ? (
                <span className="shrink-0 rounded-full bg-[#ff6b8a]/15 px-3 py-1 text-sm font-semibold text-[#ff8fab]">
                  +{answer.bluffPoints} bluff
                </span>
              ) : null}
            </div>
            <div className="grid gap-3 px-4 py-4 sm:px-6">
              {yours ? (
                <p
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    yours.correct
                      ? "bg-[#10b981]/15 text-[#34d399]"
                      : "bg-[#ff6b8a]/10 text-[#ff8fab]"
                  }`}
                >
                  {yours.correct
                    ? `You called it. +${yours.points} pts`
                    : `You guessed ${yours.guessedName}. ${answer.author?.displayName ?? "They"} fooled you.`}
                </p>
              ) : null}
              <VoteChips label="Got it" votes={correct} tone="correct" />
              <VoteChips label="Fooled" votes={missed} tone="fooled" />
              <details className="group text-xs text-[#9c98ad]">
                <summary className="cursor-pointer list-none hover:text-[#f6f6fa]">
                  Report this answer
                </summary>
                <ReportForm code={view.code} answerId={answer.id} />
              </details>
            </div>
          </article>
        )
      })}
      <div className="flex flex-wrap justify-center gap-2">
        {REACTIONS.map((emoji) => {
          const count =
            view.reactions.find((item) => item.emoji === emoji)?.count ?? 0
          return (
            <form key={emoji} action={act(reactionAction, view.code, emoji)}>
              <button
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-lg transition-transform active:scale-90 ${
                  count > 0
                    ? "border-[#9b7bff]/50 bg-[#9b7bff]/10"
                    : "border-[#302d41] bg-[#161222]"
                }`}
                type="submit"
                aria-label={`React ${emoji}, ${count} so far`}
              >
                {emoji}
                {count > 0 ? (
                  <span className="text-xs font-semibold text-[#d8c7ff] tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>
            </form>
          )
        })}
      </div>
      {view.youAreHost ? (
        <form action={act(nextRoundAction, view.code)}>
          <button className="h-12 w-full rounded-2xl bg-[#9b7bff] px-4 font-semibold text-white">
            {view.currentRound >= view.totalRounds
              ? "Show final results"
              : `Next round (${view.currentRound}/${view.totalRounds})`}
          </button>
        </form>
      ) : (
        <p className="text-center text-sm text-[#9c98ad]">
          Waiting for the host to continue.
        </p>
      )}
    </div>
  )
}

function Results({ view }: { view: RoomView }) {
  const act = useRoomAction(view.code)
  const [copied, setCopied] = useState(false)
  const board = view.leaderboard
  async function handleShare() {
    const lines = board.map(
      (row, index) => `${index + 1}. ${row.displayName} — ${row.score} pts`
    )
    const text = [
      `${view.name} podium`,
      formatRoomCode(view.code),
      ...lines,
    ].join("\n")
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
        <h2 className="mt-2 font-display text-3xl font-bold">
          Championship podium
        </h2>
        <p className="mt-1 text-sm text-[#9c98ad]">
          The answers are out. Here are the standings.
        </p>
      </header>
      <div className="grid grid-cols-3 items-end gap-2">
        {[board[1], board[0], board[2]].map((row, index) => {
          const place = index === 1 ? 1 : index === 0 ? 2 : 3
          if (!row) return <div key={place} />
          const first = place === 1
          return (
            <div
              key={row.playerId}
              className={`rounded-[20px] border px-2 py-4 text-center ${
                first
                  ? "border-[#9b7bff] bg-[#9b7bff]/10"
                  : "border-[#302d41] bg-[#161222]"
              }`}
            >
              {first ? (
                <Crown className="mx-auto size-5 text-[#ffd166]" aria-hidden />
              ) : null}
              <AvatarImage
                avatar={row.avatar}
                alt=""
                className={`mx-auto ${first ? "size-16" : "size-12"}`}
              />
              <p className="mt-2 text-xs font-semibold text-[#ffd166]">
                {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
              </p>
              <p className="truncate text-sm font-semibold">
                {row.displayName}
              </p>
              <p className="text-xs text-[#9c98ad]">{row.score} pts</p>
            </div>
          )
        })}
      </div>
      <MatchAwards board={board} />
      <ol className="grid gap-2">
        {board.map((row, index) => (
          <li
            key={row.playerId}
            className="flex items-center gap-3 rounded-2xl border border-[#302d41] bg-[#161222] px-3 py-3"
          >
            <span className="w-5 text-center text-sm font-semibold text-[#9c98ad]">
              {index + 1}
            </span>
            <AvatarImage avatar={row.avatar} alt="" className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {row.displayName}
                {row.playerId === view.yourPlayerId ? " (You)" : ""}
              </span>
              <span className="block text-xs text-[#9c98ad]">
                {row.accuracy}% accuracy · {row.correctGuesses} correct · fooled{" "}
                {row.fooled}
              </span>
            </span>
            <span className="font-semibold">{row.score} pts</span>
          </li>
        ))}
      </ol>
      <p className="text-center font-mono text-xs text-[#9c98ad]">
        {formatRoomCode(view.code)}
      </p>
      {view.youAreGuest ? (
        <div className="rounded-xl border border-[#302d41] bg-[#100d1d] p-4">
          <h3 className="font-semibold text-[#f6f6fa]">
            Keep this name and host next time
          </h3>
          <p className="mt-1 text-sm text-[#afadba]">
            Save {view.yourDisplayName} on an account. Your score in this room
            stays with you.
          </p>
          <ClaimAccountForm
            defaultName={view.yourDisplayName}
            code={view.code}
          />
        </div>
      ) : null}
      <div className="grid gap-2">
        {view.youAreHost && view.status === "COMPLETED" ? (
          <form action={rematchAction.bind(null, view.code)}>
            <button className="h-12 w-full rounded-2xl bg-[#9b7bff] font-semibold text-white">
              Play again
            </button>
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
          <form action={act(closeRoomAction, view.code)}>
            <button className="h-11 w-full rounded-2xl border border-border text-sm">
              Close room
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}

function Notice({
  state,
}: {
  state: { error?: string; success?: string } | null
}) {
  if (!state?.error) return null
  return (
    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {state.error}
    </p>
  )
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
        <span className="tracking-normal normal-case">
          {Math.max(0, ANSWER_MAX_LENGTH - answer.length)} left
        </span>
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
  const refresh = useRefreshRoom(code)
  useEffect(() => {
    if (state?.success) void refresh()
  }, [state, refresh])
  const label = locked
    ? "Vote locked"
    : suspectName
      ? `Lock in vote for ${suspectName}`
      : "Lock in vote"
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
    <form action={action} className="mt-2 grid gap-2 sm:flex sm:flex-wrap">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="answerId" value={answerId} />
      <input
        name="reason"
        required
        minLength={4}
        maxLength={500}
        placeholder="What is wrong with this answer?"
        className="h-11 w-full min-w-0 rounded-lg border border-[#302d41] bg-[#100d1d] px-3 text-sm text-[#f6f6fa] placeholder:text-[#afadba] sm:flex-1"
      />
      <button
        disabled={pending}
        className="h-11 rounded-lg border border-border px-3 text-sm sm:w-auto"
      >
        Report
      </button>
      {state?.success ? (
        <p className="w-full text-sm text-emerald-300">{state.success}</p>
      ) : null}
      {state?.error ? (
        <p className="w-full text-sm text-red-300">{state.error}</p>
      ) : null}
    </form>
  )
}

function VoteChips({
  label,
  votes,
  tone,
}: {
  label: string
  votes: {
    displayName: string
    guessedName: string
    correct: boolean
    isYou: boolean
  }[]
  tone: "correct" | "fooled"
}) {
  if (votes.length === 0) return null
  const chip =
    tone === "correct"
      ? "border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]"
      : "border-[#ff6b8a]/25 bg-[#ff6b8a]/10 text-[#ff8fab]"
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-[#9c98ad]">{label}</span>
      {votes.map((vote) => (
        <span
          key={`${vote.displayName}-${vote.guessedName}`}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${chip}`}
        >
          {vote.isYou ? "You" : vote.displayName}
          {vote.correct ? "" : ` → ${vote.guessedName}`}
        </span>
      ))}
    </div>
  )
}

function MatchAwards({ board }: { board: RoomView["leaderboard"] }) {
  const top = (pick: (row: RoomView["leaderboard"][number]) => number) =>
    board.reduce<RoomView["leaderboard"][number] | null>(
      (best, row) => (pick(row) > (best ? pick(best) : 0) ? row : best),
      null
    )
  const reader = top((row) => row.correctGuesses)
  const disguise = top((row) => row.fooled)
  if (!reader && !disguise) return null
  const awards = [
    reader
      ? {
          title: "Mind Reader",
          who: reader,
          detail: `${reader.correctGuesses} correct guesses`,
          tone: "text-[#34d399]",
        }
      : null,
    disguise
      ? {
          title: "Master of Disguise",
          who: disguise,
          detail: `fooled ${disguise.fooled} ${disguise.fooled === 1 ? "friend" : "friends"}`,
          tone: "text-[#ff8fab]",
        }
      : null,
  ].filter((award) => award !== null)
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {awards.map((award) => (
        <div
          key={award.title}
          className="flex items-center gap-3 rounded-2xl border border-[#302d41] bg-[#161222] px-3 py-3"
        >
          <AvatarImage avatar={award.who.avatar} alt="" className="size-10" />
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold tracking-[0.12em] uppercase ${award.tone}`}
            >
              {award.title}
            </p>
            <p className="truncate font-semibold">{award.who.displayName}</p>
            <p className="text-xs text-[#9c98ad]">{award.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PointChips() {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
      <span className="rounded-full bg-[#ffd166]/15 px-2.5 py-1 text-[#ffd166]">
        +{CORRECT_GUESS_POINTS} correct guess
      </span>
      <span className="rounded-full bg-[#ff6b8a]/15 px-2.5 py-1 text-[#ff8fab]">
        +{BLUFF_POINTS} per friend fooled
      </span>
    </div>
  )
}

function SeatRow({
  view,
  title,
  detail,
}: {
  view: RoomView
  title: string
  detail: string
}) {
  return (
    <section className="rounded-[24px] border border-[#302d41] bg-[#161222] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[#d8d6e3]">
          {detail}
        </span>
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
              {player.isYou
                ? `${player.displayName} (You)`
                : player.displayName}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ManagePlayers({ view }: { view: RoomView }) {
  const act = useRoomAction(view.code)
  return (
    <aside className="rounded-[20px] border border-[#302d41] bg-[#1b1730] p-4">
      <h2 className="font-semibold">Manage players</h2>
      <ul className="mt-3 grid gap-2">
        {view.players.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-2 rounded-xl bg-[#100d1d] px-3 py-2 text-sm"
          >
            <AvatarImage
              avatar={player.avatar}
              alt=""
              className="size-8 shrink-0"
            />
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
              <form action={act(removePlayerAction, view.code, player.id)}>
                <button className="min-h-11 px-2 text-xs text-red-300">
                  Remove
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  )
}
