import type { Metadata } from "next"

import { ClaimAccountForm } from "@/components/forms/claim-account-form"
import { CreateRoomForm } from "@/components/forms/create-room-form"
import { requirePageUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export const metadata: Metadata = { title: "Create room" }

export default async function CreateRoomPage() {
  const user = await requirePageUser("/create")
  if (user.isAnonymous) {
    return (
      <main className="min-h-screen bg-[#0e0b18] text-[#f4f1fb]">
        <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold">Create an account to host</h1>
        <p className="mt-3 text-sm text-[#afadba]">
          Friends can play with a name. Hosting the next room needs an account, and this one keeps the name you already used.
        </p>
        <ClaimAccountForm defaultName={user.name === "Anonymous" ? "" : user.name} />
        </div>
      </main>
    )
  }
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: { where: { isActive: true } } } } },
  })
  return (
    <main className="min-h-screen bg-[#0e0b18] text-[#f4f1fb]">
      {categories.length === 0 ? (
        <p className="mx-auto max-w-3xl px-4 py-16 text-center">No prompt packs are published yet.</p>
      ) : (
        <CreateRoomForm
          host={{
            name: user.username || user.name,
            avatar: user.avatar,
          }}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description,
            isAdult: category.isAdult,
            cardCount: category._count.questions,
          }))}
        />
      )}
    </main>
  )
}
