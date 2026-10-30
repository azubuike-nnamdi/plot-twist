import type { Metadata } from "next"
import Link from "next/link"

import { JoinRoomForm } from "@/components/forms/room-forms"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { previewRoom } from "@/features/rooms/engine"
import { parseRoomCode } from "@/features/rooms/codes"
import { requirePageUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors"

export const metadata: Metadata = { title: "Join room" }

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const user = await requirePageUser("/join")
  const params = await searchParams
  const code = params.code ? parseRoomCode(params.code) : ""
  let preview: Awaited<ReturnType<typeof previewRoom>> | null = null
  let missing = false
  if (code.length === 8) {
    try {
      preview = await previewRoom(code)
    } catch (error) {
      missing = error instanceof AppError
    }
  }
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[20px] border border-border bg-card p-6">
          <h1 className="font-display text-4xl font-bold">Join a party room</h1>
          <p className="mt-2 text-muted-foreground">
            Enter the room code from your host. You need to be signed in, which you are.
          </p>
          <div className="mt-6">
            <JoinRoomForm code={code} defaultName={(user.username ?? user.name).slice(0, 18)} />
          </div>
        </section>
        <aside className="rounded-[20px] border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Room check</h2>
          {preview ? (
            <div className="mt-3 text-sm">
              <p className="font-display text-2xl font-bold">{preview.name}</p>
              <p className="mt-2 font-mono">TWST-{preview.code}</p>
              <p className="mt-2">
                {preview.playerCount}/{preview.maxPlayers} players · {preview.status}
              </p>
              <p className="mt-2 text-muted-foreground">{preview.categories.join(", ")}</p>
              {preview.expired ? (
                <p className="mt-3 text-red-300">This room has expired.</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {missing ? "We couldn't find that room." : "Enter a code to preview the lobby."}
            </p>
          )}
          <Link href="/create" className="mt-6 inline-block text-sm text-[#9b7bff]">
            Want to host instead?
          </Link>
        </aside>
      </main>
      <SiteFooter />
    </>
  )
}
