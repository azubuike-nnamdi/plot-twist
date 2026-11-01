import "server-only"

import { prisma } from "@/lib/db/prisma"

export const CLAIM_GUEST_COOKIE = "pt_claim_guest"
export const CLAIM_ROOM_COOKIE = "pt_claim_room"

export async function transferGuestSeat(guestUserId: string, accountUserId: string) {
  if (guestUserId === accountUserId) return
  await prisma.$transaction(async (tx) => {
    const account = await tx.user.findUnique({
      where: { id: accountUserId },
      select: { isAnonymous: true },
    })
    if (!account || account.isAnonymous) return
    await tx.room.updateMany({
      where: { hostId: guestUserId },
      data: { hostId: accountUserId },
    })
    const seats = await tx.roomPlayer.findMany({ where: { userId: guestUserId } })
    for (const seat of seats) {
      const taken = await tx.roomPlayer.findUnique({
        where: { roomId_userId: { roomId: seat.roomId, userId: accountUserId } },
      })
      if (taken) {
        await tx.roomPlayer.update({
          where: { id: seat.id },
          data: { status: "LEFT" },
        })
        continue
      }
      await tx.roomPlayer.update({
        where: { id: seat.id },
        data: { userId: accountUserId },
      })
    }
  })
}
