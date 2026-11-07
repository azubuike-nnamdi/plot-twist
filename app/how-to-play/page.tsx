import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export const metadata: Metadata = { title: "How to Play" }

const steps = [
  ["Lobby", "Create a room, pick packs, and share TWST-XXXXXXXX. At least 2 players are needed to start. Only the host needs an account."],
  ["Answers", "Each player submits one answer. Nobody sees who wrote it."],
  ["Guesses", "Vote for the author of each other answer. You cannot vote for yourself."],
  ["Reveal", "Authors are shown. Correct guesses earn 100 points, each wrong vote earns the author 50, and the host starts the next round."],
]

export default function HowToPlayPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl font-bold">How to play</h1>
        <p className="mt-3 text-muted-foreground">
          Write. Shuffle. Guess. Crown. A correct guess is 100 points. Every player who guesses wrong on your answer earns you 50 bluff points.
        </p>
        <ol className="mt-8 grid gap-4">
          {steps.map(([title, body], index) => (
            <li key={title} className="rounded-[20px] border border-border bg-card p-5">
              <p className="font-mono text-sm text-twist">0{index + 1}</p>
              <h2 className="mt-1 text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </>
  )
}
