import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export const metadata: Metadata = { title: "Contact" }

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl font-bold">Contact</h1>
        <p className="mt-4 text-sm leading-6 text-line">
          For account, safety, or room issues, write to the address published by the operator of this PlotTwist deployment. Include the room code and the time of the round. Do not send passwords.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
