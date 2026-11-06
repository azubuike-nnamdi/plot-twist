import "server-only"

import { cleanupCutoffs } from "@/features/maintenance/cutoffs"
import { prisma } from "@/lib/db/prisma"

const ROOM_BATCH = 200
const MAX_ROOM_BATCHES = 25

/** Close lobbies past their expiry and matches nobody has touched in hours. */
async function closeStaleRooms(now: Date, idleBefore: Date) {
  const expired = await prisma.room.updateMany({
    where: { status: "WAITING", expiresAt: { lt: now } },
    data: { status: "CLOSED", version: { increment: 1 } },
  })
  const abandoned = await prisma.room.updateMany({
    where: { status: "IN_PROGRESS", updatedAt: { lt: idleBefore } },
    data: { status: "CLOSED", version: { increment: 1 } },
  })
  return expired.count + abandoned.count
}

/** Room ids that open reports still point at, directly or through an answer. */
async function roomsUnderReview() {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN", targetType: { in: ["ANSWER", "ROOM"] } },
    select: { targetType: true, targetId: true },
  })
  const roomIds = new Set(
    reports.filter((report) => report.targetType === "ROOM").map((report) => report.targetId)
  )
  const answerIds = reports
    .filter((report) => report.targetType === "ANSWER")
    .map((report) => report.targetId)
  if (answerIds.length > 0) {
    const answers = await prisma.answer.findMany({
      where: { id: { in: answerIds } },
      select: { round: { select: { roomId: true } } },
    })
    for (const answer of answers) roomIds.add(answer.round.roomId)
  }
  return [...roomIds]
}

/**
 * Delete finished rooms past retention, children first. Several relations use
 * ON DELETE RESTRICT, so a plain cascade from Room would fail.
 */
async function purgeOldRooms(retainedAfter: Date) {
  const keep = await roomsUnderReview()
  let deleted = 0
  for (let batch = 0; batch < MAX_ROOM_BATCHES; batch += 1) {
    const rooms = await prisma.room.findMany({
      where: {
        status: { in: ["COMPLETED", "CLOSED"] },
        updatedAt: { lt: retainedAfter },
        ...(keep.length > 0 ? { id: { notIn: keep } } : {}),
      },
      select: { id: true },
      take: ROOM_BATCH,
    })
    if (rooms.length === 0) break
    const ids = rooms.map((room) => room.id)
    await prisma.$transaction([
      prisma.guess.deleteMany({ where: { answer: { round: { roomId: { in: ids } } } } }),
      prisma.reaction.deleteMany({ where: { round: { roomId: { in: ids } } } }),
      prisma.answer.deleteMany({ where: { round: { roomId: { in: ids } } } }),
      prisma.round.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.roomPrompt.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.roomPlayer.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.roomCategory.deleteMany({ where: { roomId: { in: ids } } }),
      prisma.room.deleteMany({ where: { id: { in: ids } } }),
    ])
    deleted += ids.length
    if (rooms.length < ROOM_BATCH) break
  }
  return deleted
}

export async function cleanupExpiredRows(now = new Date()) {
  const cutoffs = cleanupCutoffs(now)
  const closedRooms = await closeStaleRooms(now, cutoffs.idleRoomBefore)
  const deletedRooms = await purgeOldRooms(cutoffs.roomRetainedAfter)
  // Purged rooms free their guests' seats, so guests go after rooms.
  const guests = await prisma.user.deleteMany({
    where: {
      isAnonymous: true,
      createdAt: { lt: cutoffs.guestCreatedBefore },
      memberships: { none: {} },
      hostedRooms: { none: {} },
      reportsFiled: { none: {} },
    },
  })
  const buckets = await prisma.rateLimitBucket.deleteMany({
    where: { windowStart: { lt: cutoffs.bucketWindowBefore } },
  })
  const sessions = await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } })
  const verifications = await prisma.verification.deleteMany({
    where: { expiresAt: { lt: now } },
  })
  return {
    closedRooms,
    deletedRooms,
    guests: guests.count,
    buckets: buckets.count,
    sessions: sessions.count,
    verifications: verifications.count,
  }
}
