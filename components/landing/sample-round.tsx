"use client"

import { useState } from "react"

const answers = [
  {
    id: "a",
    text: "I pretend my WiFi is buffering to dodge video catch-ups.",
  },
  {
    id: "b",
    text: "My guilty pleasure is ordering dessert before the main entree.",
  },
  {
    id: "c",
    text: "I practiced an Oscar acceptance speech in the shower this morning.",
  },
]

export function SampleRound() {
  const [picked, setPicked] = useState<string | null>(null)

  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          <span className="size-2 rounded-full bg-success-strong" />
          Sample room
        </p>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">VOTING</p>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-background p-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-twist uppercase">
          Prompt round 02/05
        </p>
        <p className="mt-2 font-display text-lg font-bold text-foreground">
          “What would you never admit on a first date?”
        </p>
      </div>
      <p className="mt-4 text-sm font-semibold">Try guessing who wrote it</p>
      <div className="mt-3 grid gap-2">
        {answers.map((answer) => {
          const selected = picked === answer.id
          return (
            <button
              key={answer.id}
              type="button"
              onClick={() => setPicked(answer.id)}
              className={
                selected
                  ? "rounded-xl border border-primary bg-primary/15 px-4 py-3 text-left text-sm text-foreground"
                  : "rounded-xl border border-line bg-background px-4 py-3 text-left text-sm text-foreground hover:border-primary"
              }
            >
              {answer.text}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        {picked
          ? picked === "b"
            ? "Elena wrote the dessert answer. A correct guess is 100 points."
            : "Not this one. Elena wrote the dessert answer. A correct guess is 100 points."
          : "Authors stay hidden until the reveal."}
      </p>
    </section>
  )
}
