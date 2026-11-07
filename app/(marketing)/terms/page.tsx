import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export const metadata: Metadata = { title: "Terms" }

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl font-bold">Terms</h1>
        <div className="mt-6 grid gap-4 text-sm leading-6 text-line">
          <p>PlotTwist is a private party game. You need an account to host a room. Friends can join with a name and save that name into an account after the match.</p>
          <p>Answers stay hidden from other players until the reveal. Do not share another player’s answer outside the room.</p>
          <p>A correct guess scores 100 points for the guesser. A wrong vote scores 50 points for the author of that answer. A missed guess scores nobody.</p>
          <p>Hosts can remove players and end a room. Staff can close rooms, remove reported answers, and suspend accounts that break these terms.</p>
          <p>You are responsible for the answers you submit. Do not post illegal content or content that targets someone without their consent.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
