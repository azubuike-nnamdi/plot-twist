import "server-only"

import { cleanupCutoffs } from "@/features/maintenance/cutoffs"
import { prisma } from "@/lib/db/prisma"

export async function cleanupExpiredRows(now = new Date()) {
  const cutoffs = cleanupCutoffs(now)
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
  return { guests: guests.count, buckets: buckets.count }
}
