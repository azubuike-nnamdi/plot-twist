import "server-only"

import { prisma } from "@/lib/db/prisma"
import { AppError } from "@/lib/errors"

export async function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs)
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  })
  if (bucket.count > limit) {
    throw new AppError(
      "Too many attempts. Please wait a few minutes and try again.",
      "RATE_LIMIT"
    )
  }
}
