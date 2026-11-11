"use client"

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useReducedMotion,
} from "motion/react"
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

// A scripted walkthrough that plays like a short video. Every scene draws a
// small mock of the real screen and changes it as the scene clock `t`
// (seconds) runs, so pausing simply freezes the clock.

type Player = { name: string; tone: string }
const YOU: Player = { name: "You", tone: "bg-primary text-primary-foreground" }
const ADA: Player = { name: "Ada", tone: "bg-twist text-background" }
const BEN: Player = { name: "Ben", tone: "bg-gold text-background" }
const CLEO: Player = { name: "Cleo", tone: "bg-success-strong text-background" }
const spring = { type: "spring", stiffness: 380, damping: 26 } as const

function Avatar({
  player,
  size = "size-9",
}: {
  player: Player
  size?: string
}) {
  return (
    <span
      className={`inline-flex ${size} shrink-0 items-center justify-center rounded-full text-sm font-bold ${player.tone}`}
    >
      {player.name[0]}
    </span>
  )
}

function Pop({
  show,
  children,
  className,
}: {
  show: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <AnimatePresence>
      {show ? (
        <m.div
          className={className}
          initial={{ opacity: 0, scale: 0.7, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={spring}
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-background p-4 ${className}`}
    >
      {children}
    </div>
  )
}

/** A button that visibly gets pressed at `pressAt`. */
function PressButton({
  t,
  pressAt,
  children,
}: {
  t: number
  pressAt: number
  children: React.ReactNode
}) {
  const pressing = t >= pressAt && t < pressAt + 0.35
  return (
    <m.div
      animate={{ scale: pressing ? 0.92 : 1 }}
      transition={spring}
      className={`relative inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground ${
        t >= pressAt - 0.8 && t < pressAt + 0.4 ? "ring-4 ring-primary/30" : ""
      }`}
    >
      {children}
    </m.div>
  )
}

// 1. Host creates a room -------------------------------------------------------

const PACKS = [
  "Awkward Confessions",
  "Wild Hypotheticals",
  "Office Shenanigans",
  "Pop Culture Chaos",
]

function CreateScene({ t }: { t: number }) {
  const picked = [t >= 0.7, t >= 1.3, false, t >= 1.9]
  return (
    <div className="grid h-full content-center gap-3 sm:grid-cols-[1.2fr_1fr] sm:items-center">
      <Panel>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          New room
        </p>
        <p className="mt-3 text-sm font-semibold">Pick your packs</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PACKS.map((pack, i) => (
            <m.span
              key={pack}
              animate={{ scale: picked[i] ? [1, 1.08, 1] : 1 }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                picked[i]
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-line text-muted-foreground"
              }`}
            >
              {pack}
            </m.span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">5 rounds · 8 seats</p>
          <PressButton t={t} pressAt={2.7}>
            Create room
          </PressButton>
        </div>
      </Panel>
      <Pop show={t >= 3.1}>
        <Panel className="text-center">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Room code
          </p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-foreground">
            TWST-8K2Q
          </p>
          <Pop show={t >= 4} className="mt-3">
            <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success">
              Invite link copied
            </span>
          </Pop>
        </Panel>
      </Pop>
    </div>
  )
}

// 2. Friends join --------------------------------------------------------------

function JoinScene({ t }: { t: number }) {
  const players = [
    { p: YOU, at: 0, host: true },
    { p: ADA, at: 0.8 },
    { p: BEN, at: 1.6 },
    { p: CLEO, at: 2.4 },
  ]
  const seated = players.filter((x) => t >= x.at)
  return (
    <div className="mx-auto grid h-full w-full max-w-md content-center">
      <Panel>
        <div className="flex items-center justify-between">
          <p className="font-mono text-sm font-bold">TWST-8K2Q</p>
          <m.p
            key={seated.length}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-sm text-muted-foreground"
          >
            {seated.length}/8 players
          </m.p>
        </div>
        <ul className="mt-4 grid gap-2">
          <AnimatePresence>
            {seated.map(({ p, host }, i) => (
              <m.li
                key={p.name}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={spring}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2"
              >
                <Avatar player={p} />
                <span className="flex-1 text-sm font-semibold">{p.name}</span>
                {host ? (
                  <span className="text-xs text-primary">Host</span>
                ) : null}
                <Pop show={t >= 3 + i * 0.2}>
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">
                    Ready
                  </span>
                </Pop>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="mt-4 flex justify-end">
          <PressButton t={t} pressAt={4.6}>
            Start game
          </PressButton>
        </div>
      </Panel>
    </div>
  )
}

// 3. Everyone answers ----------------------------------------------------------

const ANSWER = "A gym membership. To my gran."

function AnswerScene({ t, duration }: { t: number; duration: number }) {
  const typed = ANSWER.slice(0, Math.max(0, Math.floor((t - 0.8) * 12)))
  const locked = t >= 3.9
  const answered = [locked, t >= 1.6, t >= 2.9, t >= 4.8].filter(Boolean).length
  const left = Math.max(0, 1 - t / duration)
  return (
    <div className="mx-auto grid h-full w-full max-w-lg content-center gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-twist">Round 1 of 5</span>
        <span className="font-mono text-muted-foreground">
          {Math.ceil(left * 30)}s
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full origin-left rounded-full bg-primary"
          style={{ transform: `scaleX(${left})` }}
        />
      </div>
      <Panel>
        <p className="font-display text-lg font-bold">
          “What’s the worst gift you’ve ever given?”
        </p>
        <div
          className={`mt-3 min-h-12 rounded-xl border px-3 py-3 text-sm ${
            locked
              ? "border-success/50 bg-success/10"
              : "border-primary bg-surface-2"
          }`}
        >
          {typed}
          {!locked ? (
            <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <m.span
              key={answered}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block font-semibold text-foreground"
            >
              {answered}
            </m.span>{" "}
            of 4 answered
          </p>
          {locked ? (
            <Pop show>
              <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success">
                Locked in, anonymous
              </span>
            </Pop>
          ) : (
            <PressButton t={t} pressAt={3.6}>
              Submit
            </PressButton>
          )}
        </div>
      </Panel>
    </div>
  )
}

// 4. Guess the authors ---------------------------------------------------------

const GUESSES = [
  {
    text: "I wrapped a candle I got for free.",
    choice: BEN,
    at: 1.2,
    author: BEN,
  },
  { text: "Socks. For a wedding.", choice: ADA, at: 2.6, author: CLEO },
  {
    text: "A mixtape of my own voice notes.",
    choice: CLEO,
    at: 4.0,
    author: ADA,
  },
]

function GuessScene({ t, reveal = false }: { t: number; reveal?: boolean }) {
  const voted = GUESSES.filter((g) => t >= g.at || reveal).length
  return (
    <div className="mx-auto grid h-full w-full max-w-xl content-center gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {reveal ? "The reveal" : "Who wrote it?"}
        </span>
        <span className="text-muted-foreground">
          {reveal ? "Authors unmasked" : `You voted ${voted} of 3`}
        </span>
      </div>
      {GUESSES.map((g, i) => {
        const chosen = reveal || t >= g.at
        const shown = reveal && t >= 0.6 + i * 1.1
        const right = g.choice === g.author
        return (
          <m.div
            key={g.text}
            animate={shown ? { rotateX: [0, 90, 0] } : {}}
            transition={{ duration: 0.5 }}
            className={`rounded-xl border bg-background px-3 py-2.5 ${
              shown
                ? right
                  ? "border-success/60"
                  : "border-twist/60"
                : "border-line"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">{g.text}</p>
              <Pop show={shown}>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    right
                      ? "bg-success/20 text-success"
                      : "bg-twist/15 text-twist"
                  }`}
                >
                  {g.author.name} · {right ? "+100" : "missed"}
                </span>
              </Pop>
            </div>
            {!reveal ? (
              <div className="mt-2 flex gap-2">
                {[ADA, BEN, CLEO].map((p) => {
                  const on = chosen && g.choice === p
                  return (
                    <m.span
                      key={p.name}
                      animate={{
                        scale: on ? 1.12 : 1,
                        opacity: chosen && !on ? 0.35 : 1,
                      }}
                      transition={spring}
                      className={`rounded-full ${on ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    >
                      <Avatar player={p} size="size-7" />
                    </m.span>
                  )
                })}
              </div>
            ) : null}
          </m.div>
        )
      })}
      {reveal ? (
        <Pop show={t >= 4.2}>
          <div className="rounded-xl border border-primary/60 bg-primary/10 px-3 py-2.5 text-sm">
            <span className="font-semibold">Your gym membership</span> fooled 2
            players ·{" "}
            <span className="font-semibold text-primary">
              +100 bluff points
            </span>
          </div>
        </Pop>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Your own answer is never on your ballot.
        </p>
      )}
    </div>
  )
}

// 5. Leaderboard ---------------------------------------------------------------

function ScoresScene({ t }: { t: number }) {
  const before = [
    { p: ADA, score: 300 },
    { p: BEN, score: 250 },
    { p: YOU, score: 200 },
    { p: CLEO, score: 150 },
  ]
  const after = [
    { p: YOU, score: 400 },
    { p: ADA, score: 350 },
    { p: BEN, score: 300 },
    { p: CLEO, score: 200 },
  ]
  const rows = t >= 1.4 ? after : before
  return (
    <div className="mx-auto grid h-full w-full max-w-md content-center">
      <Panel>
        <p className="text-sm font-semibold">Leaderboard</p>
        <ul className="mt-3 grid gap-2">
          {rows.map(({ p, score }, i) => (
            <m.li
              layout
              key={p.name}
              transition={spring}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                i === 0 && t >= 2.2
                  ? "border-gold/60 bg-gold/10"
                  : "border-line bg-surface-2"
              }`}
            >
              <span className="w-4 font-mono text-sm text-muted-foreground">
                {i + 1}
              </span>
              <Avatar player={p} size="size-8" />
              <span className="flex-1 text-sm font-semibold">{p.name}</span>
              {i === 0 && t >= 2.2 ? (
                <m.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={spring}
                >
                  <Crown aria-hidden className="size-4 text-gold" />
                </m.span>
              ) : null}
              <m.span
                key={score}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-sm font-semibold"
              >
                {score}
              </m.span>
            </m.li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Most points after the last round wins.
        </p>
      </Panel>
    </div>
  )
}

// Player -----------------------------------------------------------------------

const scenes = [
  {
    title: "Host a room",
    caption:
      "Pick your packs and share the room code. Only the host needs an account.",
    duration: 5.5,
    Scene: CreateScene,
  },
  {
    title: "Friends join",
    caption:
      "Players join with the code or link. Two players is enough to start.",
    duration: 5.5,
    Scene: JoinScene,
  },
  {
    title: "Everyone answers",
    caption:
      "Same prompt for everyone. Write one anonymous answer before the timer ends.",
    duration: 6,
    Scene: AnswerScene,
  },
  {
    title: "Guess the author",
    caption: "Answers are shuffled. Vote on who wrote each one.",
    duration: 5.5,
    Scene: GuessScene,
  },
  {
    title: "The reveal",
    caption:
      "Right guesses earn 100. Every player your answer fools earns you 50.",
    duration: 6.5,
    Scene: ({ t }: { t: number }) => <GuessScene t={t} reveal />,
  },
  {
    title: "Crown a winner",
    caption: "Scores update after each round. Most points at the end wins.",
    duration: 5,
    Scene: ScoresScene,
  },
] as const

export function Walkthrough({ onFinish }: { onFinish?: () => void }) {
  const reduceMotion = useReducedMotion()
  // Where the clock is: which scene, and seconds into it.
  const [pos, setPos] = useState({ index: 0, t: 0 })
  const [playing, setPlaying] = useState(!reduceMotion)
  const last = useRef<number | null>(null)

  const { index, t } = pos
  const scene = scenes[index]
  const ended = index === scenes.length - 1 && t >= scene.duration
  const running = playing && !ended

  const goTo = useCallback((next: number) => {
    setPos({ index: Math.max(0, Math.min(scenes.length - 1, next)), t: 0 })
  }, [])

  // Scene clock. Rolls into the next scene and holds at the end of the last.
  useEffect(() => {
    if (!running) return
    let frame = 0
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : (now - last.current) / 1000
      last.current = now
      setPos((prev) => {
        const nextT = prev.t + dt
        const duration = scenes[prev.index].duration
        if (nextT < duration) return { index: prev.index, t: nextT }
        if (prev.index < scenes.length - 1) return { index: prev.index + 1, t: 0 }
        return { index: prev.index, t: duration }
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      last.current = null
    }
  }, [running])

  function replay() {
    goTo(0)
    setPlaying(true)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === " " || event.key === "k") {
      event.preventDefault()
      if (ended) replay()
      else setPlaying((p) => !p)
    } else if (event.key === "ArrowRight") goTo(index + 1)
    else if (event.key === "ArrowLeft") goTo(index - 1)
  }

  const Scene = scene.Scene
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="How to play walkthrough. Space to pause, arrow keys to change scene."
          className="rounded-2xl outline-none"
        >
          {/* Progress segments, one per scene, like a story. */}
          <div className="flex gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Scene ${i + 1}: ${s.title}`}
                onClick={() => goTo(i)}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
              >
                <span
                  className="block h-full origin-left rounded-full bg-primary"
                  style={{
                    transform: `scaleX(${i < index ? 1 : i > index ? 0 : Math.min(1, t / s.duration)})`,
                  }}
                />
              </button>
            ))}
          </div>

          {/* The "video" stage. */}
          <div className="relative mt-3 aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface sm:aspect-[16/9]">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -left-10 size-64 rounded-full bg-primary/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -bottom-20 size-64 rounded-full bg-twist/15 blur-3xl"
            />
            <AnimatePresence mode="wait">
              <m.div
                key={index}
                className="absolute inset-0 overflow-y-auto p-4 sm:p-6"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Scene t={t} duration={scene.duration} />
              </m.div>
            </AnimatePresence>

            <AnimatePresence>
              {ended ? (
                <m.div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-6 text-center backdrop-blur"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="font-display text-2xl font-bold sm:text-3xl">
                    That’s a round.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      href="/create"
                      onClick={onFinish}
                      className="inline-flex h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
                    >
                      Host a game
                    </Link>
                    <button
                      type="button"
                      onClick={replay}
                      className="inline-flex h-12 items-center gap-2 rounded-xl border border-line px-5 font-semibold"
                    >
                      <RotateCcw aria-hidden className="size-4" />
                      Watch again
                    </button>
                  </div>
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Caption and controls. */}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              aria-label={ended ? "Replay" : running ? "Pause" : "Play"}
              onClick={() => (ended ? replay() : setPlaying((p) => !p))}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              {ended ? (
                <RotateCcw aria-hidden className="size-5" />
              ) : running ? (
                <Pause aria-hidden className="size-5" />
              ) : (
                <Play aria-hidden className="size-5 translate-x-px" />
              )}
            </button>
            <div className="min-w-0 flex-1" aria-live="polite">
              <p className="text-sm font-semibold">
                <span className="text-muted-foreground">
                  {index + 1}/{scenes.length}
                </span>{" "}
                {scene.title}
              </p>
              <p className="text-sm text-muted-foreground">{scene.caption}</p>
            </div>
            <div className="hidden shrink-0 gap-1 sm:flex">
              <button
                type="button"
                aria-label="Previous scene"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="flex size-10 items-center justify-center rounded-full border border-line disabled:opacity-40"
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next scene"
                onClick={() => goTo(index + 1)}
                disabled={index === scenes.length - 1}
                className="flex size-10 items-center justify-center rounded-full border border-line disabled:opacity-40"
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}
