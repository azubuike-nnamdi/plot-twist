import "server-only"

import { isStaff } from "@/features/auth/permissions"
import { nextMidnightUtc } from "@/features/questions/batch"
import { ollamaModel } from "@/features/questions/client"
import { draftForPack, publishQuestions, refreshDailyQuestions } from "@/features/questions/nightly"
import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import { AppError } from "@/lib/errors"
import { assertRateLimit } from "@/lib/security/rate-limit"

function assertStaffRole(role: string) {
  if (!isStaff(role)) throw new AppError("You do not have access to that.", "FORBIDDEN")
}

/**
 * Staff top-up for one pack. Questions pass the same automatic safety filter
 * as the nightly batch, go live right away, and are replaced at midnight.
 */
export async function generateQuestions(input: {
  actorRole: string
  actorId: string
  categoryId: string
  count: number
}) {
  assertStaffRole(input.actorRole)
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 20) {
    throw new AppError("Generate between 1 and 20 questions.", "VALIDATION")
  }
  await assertRateLimit(`questions:${input.actorId}`, 5, 15 * 60 * 1000)
  const pack = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true, description: true, isAdult: true },
  })
  if (!pack) throw new AppError("Choose a category.", "VALIDATION")
  const now = new Date()
  const texts = await draftForPack(pack, input.count, now)
  if (texts.length === 0) {
    throw new AppError("Ollama did not return any new questions that passed the filter.", "VALIDATION")
  }
  await publishQuestions(pack, texts, nextMidnightUtc(now))
  await writeAudit({
    actorId: input.actorId,
    action: "question.generate",
    targetType: "CATEGORY",
    targetId: pack.id,
    metadata: { count: texts.length, model: ollamaModel() },
  })
  return texts.length
}

/** Run the midnight refresh now, for every pack. */
export async function refreshQuestionsNow(input: { actorRole: string; actorId: string }) {
  assertStaffRole(input.actorRole)
  await assertRateLimit(`questions-refresh:${input.actorId}`, 3, 60 * 60 * 1000)
  return refreshDailyQuestions({ actorId: input.actorId })
}
