import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"

export async function writeAudit(input: {
  actorId: string | null
  action: string
  targetType: string
  targetId: string
  metadata?: Prisma.InputJsonValue
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    },
  })
}
