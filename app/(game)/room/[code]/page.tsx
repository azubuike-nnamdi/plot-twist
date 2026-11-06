import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { RoomBoard } from "@/components/game/room-board"
import { SiteHeader } from "@/components/layout/site-header"
import { parseRoomCode } from "@/features/rooms/codes"
import { getRoomView } from "@/features/rooms/engine"
import { requirePageUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { env } from "@/lib/env"
import { publicRealtimeConfig } from "@/lib/realtime/publish"
import { AppError } from "@/lib/errors"
import type { RoomView } from "@/types/room"

export const metadata: Metadata = {
  title: "Room",
  robots: { index: false, follow: false },
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: raw } = await params
  const code = parseRoomCode(raw)
  const user = await requirePageUser(`/room/${code}`)
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: { where: { isActive: true } } } } },
  })
  let view: RoomView
  try {
    view = await getRoomView(code, user.id)
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound()
    if (error instanceof AppError) redirect(`/join?code=${code}`)
    throw error
  }
  return (
    <>
      <SiteHeader />
        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
        <RoomBoard
          initial={view}
          origin={env.NEXT_PUBLIC_APP_URL}
          realtime={publicRealtimeConfig()}
          packs={categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description,
            isAdult: category.isAdult,
            cardCount: category._count.questions,
          }))}
        />
      </main>
    </>
  )
}
