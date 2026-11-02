import "server-only"

import { prisma } from "@/lib/db/prisma"

export async function syncActiveSeats(input: { userId: string; name: string; avatar: string }) {
  const displayName = input.name.trim().slice(0, 18)
  await prisma.roomPlayer.updateMany({
    where: {
      userId: input.userId,
      status: { in: ["JOINED", "READY"] },
      room: { status: { in: ["WAITING", "IN_PROGRESS"] } },
    },
    data: {
      avatar: input.avatar,
      ...(displayName.length >= 2 ? { displayName } : {}),
    },
  })
}
