import "server-only"

import type { Prisma, PrismaClient } from "@prisma/client"

import { publishRoomChanges } from "@/lib/realtime/publish"

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Bumps the version of rooms written outside the room engine (profile edits,
 * guest claims, moderation) so the next poll rebuilds their view, and pushes
 * the change to anyone connected. Inside a transaction, the push can go out
 * just before commit; clients that refetch too early catch up on the next poll.
 */
export async function touchRooms(db: Db, where: Prisma.RoomWhereInput) {
  const rooms = await db.room.findMany({ where, select: { id: true } })
  if (rooms.length === 0) return
  const ids = rooms.map((room) => room.id)
  await db.room.updateMany({ where: { id: { in: ids } }, data: { version: { increment: 1 } } })
  const updated = await db.room.findMany({
    where: { id: { in: ids } },
    select: { roomCode: true, version: true },
  })
  publishRoomChanges(updated.map((room) => ({ code: room.roomCode, version: room.version })))
}
