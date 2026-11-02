"use client"

import { useQuery } from "@tanstack/react-query"
import { Check, Copy, Crown } from "lucide-react"
import { useActionState, useEffect, useState } from "react"

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
import { formatRoomCode } from "@/features/rooms/codes"
import { showReconnecting } from "@/features/rooms/freshness"
import { REACTIONS } from "@/lib/game/options"
import type { RoomView } from "@/types/room"

function useCountdown(view: RoomView) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  if (!view.deadlineAt) return null
  const skew = Date.parse(view.serverNow) - now
  const remaining = Math.max(0, Date.parse(view.deadlineAt) - (now + skew))
  const seconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, "0")
  return `${minutes}:${rest}`
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
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  })
  const view = query.data
  const clock = useCountdown(view)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const refetchRoom = query.refetch
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") void refetchRoom()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [refetchRoom])
  const reconnecting = showReconnecting({
    phase: view.phase,
    dataUpdatedAt: query.dataUpdatedAt,
    now,
    isError: query.isError,
  })
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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="relative min-w-0 overflow-hidden rounded-[20px] border border-[#302d41] bg-[#1b1730] p-4 sm:p-5">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#9b7bff] to-[#ff6b8a]" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm break-all text-[#ff6b8a]">{formatRoomCode(view.code)}</p>
            <h1 className="font-display text-2xl font-bold wrap-break-word sm:text-3xl">{view.name}</h1>
            <p className="text-sm text-muted-foreground">
              Round {view.currentRound}/{view.totalRounds} · {view.phase}
            </p>
          </div>
          {clock ? (
            <p className="font-mono text-3xl" aria-live="polite">
              {clock}
            </p>
          ) : null}
        </div>
        {reconnecting ? (
          <p role="status" className="mt-4 rounded-lg bg-[#f5c16c]/10 px-3 py-2 text-sm text-[#f5c16c]">
            Reconnecting
          </p>
        ) : query.isError ? (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Connection interrupted. Retrying.
          </p>
        ) : null}
        <div className="mt-5">
          {view.phase === "ANSWERING" ? <Answering view={view} /> : null}
          {view.phase === "GUESSING" ? <Guessing view={view} /> : null}
          {view.phase === "REVEAL" ? <Reveal view={view} /> : null}
          {view.phase === "RESULTS" ? <Results view={view} /> : null}
        </div>
      </section>
      <PlayerRail view={view} />
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
                At least 3 players are needed. When everyone is in and ready, start the game.
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

function PromptTitle({ view }: { view: RoomView }) {
  return (
    <div>
      <p
        className={
          view.askedBy
            ? "text-xs font-semibold text-[#9b7bff]"
            : "text-xs font-semibold tracking-[0.16em] text-[#9b7bff] uppercase"
        }
      >
        {view.askedBy ? `${view.askedBy} asks` : view.categoryName}
      </p>
      {view.isReplay ? (
        <p className="mt-2 text-xs font-semibold text-[#ffd166]">Replay · this group has heard this prompt</p>
      ) : null}
      <h2 className="font-display mt-2 text-2xl font-bold wrap-break-word">{view.question}</h2>
    </div>
  )
}

function Answering({ view }: { view: RoomView }) {
  return (
    <div>
      <PromptTitle view={view} />
      <p className="mt-2 text-sm text-muted-foreground">
        Your answer stays anonymous until the reveal. {view.submittedCount}/
        {view.expectedAnswers} locked in.
      </p>
      {view.yourAnswer ? (
        <p className="mt-4 rounded-lg bg-[#9b7bff]/15 px-4 py-3">Locked in.</p>
      ) : (
        <AnswerForm code={view.code} />
      )}
      {view.youAreHost ? (
        <div className="mt-4 flex flex-wrap gap-2">
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

function Guessing({ view }: { view: RoomView }) {
  const selected = useGuessStore((state) => state.selected)
  const select = useGuessStore((state) => state.select)
  return (
    <div className="grid gap-4">
      <PromptTitle view={view} />
      <p className="text-sm text-muted-foreground">
        A correct guess is worth 100 points. You cannot guess yourself.
      </p>
      {view.answers.map((answer) => (
        <article key={answer.id} className="rounded-[16px] border border-border p-4">
          <p>{answer.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {view.players
              .filter((player) => !player.isYou)
              .map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => select(answer.id, player.id)}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${(selected[answer.id] ?? answer.yourGuessId) === player.id
                    ? "border-[#ff6b8a] bg-[#ff6b8a]/15"
                    : "border-border"
                    }`}
                >
                  {player.displayName}
                </button>
              ))}
          </div>
          <GuessForm
            code={view.code}
            answerId={answer.id}
            guessedPlayerId={selected[answer.id] ?? answer.yourGuessId ?? ""}
            locked={Boolean(answer.yourGuessId)}
          />
        </article>
      ))}
    </div>
  )
}

function Reveal({ view }: { view: RoomView }) {
  return (
    <div className="grid gap-4">
      <PromptTitle view={view} />
      {view.answers.map((answer) => (
        <article key={answer.id} className="rounded-[16px] border border-border p-4">
          <p>{answer.text}</p>
          <p className="mt-2 font-semibold">
            {answer.author?.displayName ?? "Unknown"} wrote this.
          </p>
          <ul className="mt-2 text-sm text-muted-foreground">
            {answer.votes?.map((vote) => (
              <li key={`${answer.id}-${vote.displayName}`}>
                {vote.displayName} guessed {vote.guessedName} · {vote.points} pts
              </li>
            ))}
          </ul>
          <ReportForm code={view.code} answerId={answer.id} />
        </article>
      ))}
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
          <button className="h-11 w-full rounded-lg bg-[#ff6b8a] px-4 font-semibold text-white sm:w-auto">
            {view.currentRound >= view.totalRounds ? "Show final results" : "Next round"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Waiting for the host to continue.</p>
      )}
    </div>
  )
}

function Results({ view }: { view: RoomView }) {
  const winner = view.leaderboard[0]
  return (
    <div>
      <h2 className="font-display text-2xl font-bold wrap-break-word sm:text-3xl">
        {winner ? `${winner.displayName} takes the crown` : "Game over"}
      </h2>
      <ol className="mt-4 grid gap-2">
        {view.leaderboard.map((row, index) => (
          <li key={row.playerId} className="flex items-center justify-between gap-3 rounded-[16px] border border-border px-4 py-3">
            <span className="min-w-0">
              <span className="font-mono text-[#ffd166]">{index + 1}</span> {row.displayName}
              <span className="mt-1 block text-xs text-muted-foreground">{row.title}</span>
            </span>
            <span className="shrink-0 font-semibold">{row.score} pts</span>
          </li>
        ))}
      </ol>
      {view.youAreGuest ? (
        <div className="mt-4 rounded-xl border border-[#302d41] bg-[#100d1d] p-4">
          <h3 className="font-semibold text-[#f6f6fa]">Keep this name and host next time</h3>
          <p className="mt-1 text-sm text-[#afadba]">
            Save {view.yourDisplayName} on an account. Your score in this room stays with you.
          </p>
          <ClaimAccountForm defaultName={view.yourDisplayName} code={view.code} />
        </div>
      ) : null}
      {view.youAreHost && view.status === "COMPLETED" ? (
        <div className="mt-4 grid gap-2 sm:flex">
          <form action={rematchAction.bind(null, view.code)}>
            <button className="h-11 w-full rounded-lg bg-[#ff6b8a] px-4 font-semibold text-white sm:w-auto">
              Play again
            </button>
          </form>
          <form action={closeRoomAction.bind(null, view.code)}>
            <button className="h-11 w-full rounded-lg border border-border px-4 sm:w-auto">Close room</button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function Notice({ state }: { state: { error?: string; success?: string } | null }) {
  if (!state?.error) return null
  return <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>
}

function AnswerForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(answerAction, null)
  return (
    <form action={action} className="mt-4 grid gap-3">
      <Notice state={state} />
      <input type="hidden" name="code" value={code} />
      <textarea
        name="answer"
        required
        maxLength={400}
        rows={4}
        className="rounded-[16px] border border-[#302d41] bg-[#100d1d] p-3 text-[#f6f6fa] outline-none placeholder:text-[#afadba] focus:border-[#9b7bff]"
        placeholder="Write your secret answer"
      />
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Locking in…" : "Lock in my answer"}
      </button>
    </form>
  )
}

function GuessForm({
  code,
  answerId,
  guessedPlayerId,
  locked,
}: {
  code: string
  answerId: string
  guessedPlayerId: string
  locked: boolean
}) {
  const [state, action, pending] = useActionState(guessAction, null)
  return (
    <form action={action} className="mt-3 grid gap-2">
      <Notice state={state} />
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="answerId" value={answerId} />
      <input type="hidden" name="guessedPlayerId" value={guessedPlayerId} />
      <button
        disabled={pending || locked || !guessedPlayerId}
        className="h-11 w-full rounded-lg bg-[#9b7bff] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
      >
        {locked ? "Vote locked" : "Lock in vote"}
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

function PlayerRail({ view }: { view: RoomView }) {
  return (
    <aside className="rounded-[20px] border border-[#302d41] bg-[#1b1730] p-4">
      <h2 className="font-semibold">Players</h2>
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
