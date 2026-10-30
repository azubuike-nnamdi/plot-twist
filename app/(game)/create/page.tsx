import type { Metadata } from "next"

import { CreateRoomForm } from "@/components/forms/room-forms"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { requirePageUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export const metadata: Metadata = { title: "Create room" }

export default async function CreateRoomPage() {
  await requirePageUser("/create")
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#9b7bff] uppercase">
          Host control
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold">Create a game room</h1>
        <p className="mt-2 text-muted-foreground">
          Pick the packs and the pace. You can start once at least three players are in.
        </p>
        <section className="mt-6 rounded-[20px] border border-border bg-card p-6">
          {categories.length === 0 ? (
            <p>No prompt packs are published yet.</p>
          ) : (
            <CreateRoomForm categories={categories} />
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
