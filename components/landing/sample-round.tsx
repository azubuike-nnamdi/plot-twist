"use client"

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useInView,
  useReducedMotion,
} from "motion/react"
import { useEffect, useRef, useState } from "react"

const answers = [
  {
    id: "a",
    text: "I pretend my WiFi is buffering to dodge video calls.",
    author: "Sam",
  },
  { id: "b", text: "I order dessert before the main course.", author: "Elena" },
  {
    id: "c",
    text: "I practised an Oscar speech in the shower this morning.",
    author: "Jay",
  },
]
const CORRECT = "b"

// The demo loop: hover a few answers, pick one, then reveal the author.
// Each entry is one beat of STEP_MS.
const script: { hover?: string; pick?: string; reveal?: boolean }[] = [
  {},
  { hover: "a" },
  { hover: "c" },
  { hover: "b" },
  { pick: "b" },
  { pick: "b", reveal: true },
  { pick: "b", reveal: true },
  { pick: "b", reveal: true },
  { pick: "b", reveal: true },
]
const STEP_MS = 850
const ROUND_MS = script.length * STEP_MS
const spring = { type: "spring", stiffness: 380, damping: 24 } as const

export function SampleRound() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(0)
  const [cycle, setCycle] = useState(0)
  // Once a visitor clicks, the demo stops and their own pick takes over.
  const [userPick, setUserPick] = useState<string | null>(null)

  const autoplay = inView && !reduceMotion && userPick === null
  useEffect(() => {
    if (!autoplay) return
    const timer = setInterval(() => {
      setStep((s) => {
        const next = (s + 1) % script.length
        if (next === 0) setCycle((c) => c + 1)
        return next
      })
    }, STEP_MS)
    return () => clearInterval(timer)
  }, [autoplay])

  const beat = userPick
    ? { pick: userPick, reveal: true }
    : autoplay
      ? script[step]
      : {}
  const picked = beat.pick ?? null
  const revealed = Boolean(beat.reveal)

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <section
          ref={ref}
          className="rounded-2xl border border-line bg-surface-2 p-4 shadow-2xl shadow-primary/10"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-strong opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-success-strong" />
              </span>
              Live demo
            </p>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">
              {revealed ? "REVEAL" : "GUESSING"}
            </p>
          </div>

          {/* The guess timer drains each loop. */}
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
            {autoplay ? (
              <m.div
                key={cycle}
                className="h-full origin-left rounded-full bg-primary"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: ROUND_MS / 1000, ease: "linear" }}
              />
            ) : (
              <div className="h-full w-1/3 rounded-full bg-primary" />
            )}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-background p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-twist uppercase">
              Round 2 of 5
            </p>
            <p className="mt-2 font-display text-lg font-bold text-foreground">
              “What would you never admit on a first date?”
            </p>
          </div>

          <p className="mt-4 text-sm font-semibold">
            Who wrote the dessert one? Tap to guess.
          </p>
          <div className="mt-3 grid gap-2">
            {answers.map((answer) => {
              const hovered = beat.hover === answer.id
              const selected = picked === answer.id
              const showAuthor = revealed && (answer.id === CORRECT || selected)
              const right = answer.id === CORRECT
              return (
                <m.button
                  key={answer.id}
                  type="button"
                  onClick={() => setUserPick(answer.id)}
                  animate={{ scale: hovered ? 1.02 : 1 }}
                  transition={spring}
                  className={
                    selected || hovered
                      ? "relative flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary/15 px-4 py-3 text-left text-sm text-foreground"
                      : "relative flex items-center justify-between gap-3 rounded-xl border border-line bg-background px-4 py-3 text-left text-sm text-foreground hover:border-primary"
                  }
                >
                  <span>{answer.text}</span>
                  <AnimatePresence>
                    {showAuthor ? (
                      <m.span
                        initial={{ opacity: 0, scale: 0.6, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={spring}
                        className={
                          right
                            ? "shrink-0 rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success"
                            : "shrink-0 rounded-full bg-twist/15 px-2 py-0.5 text-xs font-semibold text-twist"
                        }
                      >
                        {answer.author}
                      </m.span>
                    ) : null}
                  </AnimatePresence>
                </m.button>
              )
            })}
          </div>

          <div
            className="mt-3 flex h-6 items-center text-sm text-muted-foreground"
            role="status"
          >
            <AnimatePresence mode="wait">
              {revealed ? (
                <m.p
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={
                    picked === CORRECT
                      ? "font-semibold text-success"
                      : "font-semibold text-twist"
                  }
                >
                  {picked === CORRECT
                    ? "Elena! +100 points"
                    : "Fooled you. Elena gets +50"}
                </m.p>
              ) : (
                <m.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Authors stay hidden until the reveal.
                </m.p>
              )}
            </AnimatePresence>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  )
}
