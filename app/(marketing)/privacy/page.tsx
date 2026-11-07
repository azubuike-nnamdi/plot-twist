import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export const metadata: Metadata = { title: "Privacy" }

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl font-bold">Privacy</h1>
        <div className="mt-6 grid gap-4 text-sm leading-6 text-line">
          <p>We store your account, room membership, answers, guesses, and reports so the game can run.</p>
          <p>Author names are omitted from the room view until the reveal. Transport security is HTTPS. PlotTwist does not claim end-to-end encryption.</p>
          <p>Password reset emails go through Mailtrap. A reset request returns the same message whether or not the email is registered.</p>
          <p>Deleting your account retires the login, clears the password, and removes sessions. Room history keeps a deleted-player label.</p>
          <p>Room and admin pages are not indexed and do not publish private room contents in link previews.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
