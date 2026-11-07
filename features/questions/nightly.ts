import "server-only"

import { anglesFor, questionPrompt } from "@/features/questions/ollama"
import { fingerprint, freshQuestions, nextMidnightUtc } from "@/features/questions/batch"
import { ollamaModel, requestOllama } from "@/features/questions/client"
import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import { env } from "@/lib/env"
import { errorMessage } from "@/lib/errors"

const DEFAULT_PER_PACK = 30
const PER_CALL = 10
/** Below this, a pack keeps yesterday's questions instead of going thin. */
const MIN_BATCH = 8
const FINGERPRINT_TTL_MS = 90 * 24 * 60 * 60 * 1000

type Pack = { id: string; name: string; description: string; isAdult: boolean }

export type PackResult = {
  pack: string
  saved: number
  retired: number
  error?: string
}

/** Ask Ollama for up to `target` new, safe, never-seen questions for one pack. */
export async function draftForPack(pack: Pack, target: number, now: Date) {
  const recent = await prisma.question.findMany({
    where: { categoryId: pack.id },
    select: { text: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  })
  const seen = new Set<string>()
  const drafted: string[] = []
  const attempts = Math.ceil(target / PER_CALL) + 2
  for (let attempt = 0; attempt < attempts && drafted.length < target; attempt += 1) {
    const want = Math.min(PER_CALL, target - drafted.length)
    const raw = await requestOllama(
      questionPrompt({
        categoryName: pack.name,
        description: pack.description,
        count: want,
        adult: pack.isAdult,
        avoid: [...drafted, ...recent.map((row) => row.text)],
        angles: anglesFor(new Date(now.getTime() + attempt * 86_400_000)),
      })
    )
    const candidates = freshQuestions({ raw, adult: pack.isAdult, seen, limit: want * 2 })
    if (candidates.length === 0) continue
    // Drop anything asked on a recent night.
    const known = await prisma.questionFingerprint.findMany({
      where: { hash: { in: candidates.map(fingerprint) } },
      select: { hash: true },
    })
    const knownHashes = new Set(known.map((row) => row.hash))
    for (const text of candidates) {
      if (drafted.length >= target) break
      if (!knownHashes.has(fingerprint(text))) drafted.push(text)
    }
  }
  return drafted
}

/** Save questions as live, and remember them so later nights skip them. */
export async function publishQuestions(pack: Pack, texts: string[], expiresAt: Date) {
  if (texts.length === 0) return []
  return prisma.$transaction(async (tx) => {
    const created = await tx.question.createManyAndReturn({
      data: texts.map((text) => ({
        text,
        categoryId: pack.id,
        isAdult: pack.isAdult,
        isActive: true,
        expiresAt,
      })),
      select: { id: true },
    })
    await tx.questionFingerprint.createMany({
      data: texts.map((text) => ({ hash: fingerprint(text) })),
      skipDuplicates: true,
    })
    return created.map((row) => row.id)
  })
}

async function refreshPack(pack: Pack, target: number, now: Date): Promise<PackResult> {
  try {
    const texts = await draftForPack(pack, target, now)
    if (texts.length < MIN_BATCH) {
      return {
        pack: pack.name,
        saved: 0,
        retired: 0,
        error: `Only ${texts.length} usable questions. Kept yesterday's batch.`,
      }
    }
    const ids = await publishQuestions(pack, texts, nextMidnightUtc(now))
    // Retire every earlier generated question in this pack. Rounds keep their
    // own copy of the text, so matches in progress are not affected.
    const retired = await prisma.question.deleteMany({
      where: { categoryId: pack.id, expiresAt: { not: null }, id: { notIn: ids } },
    })
    return { pack: pack.name, saved: ids.length, retired: retired.count }
  } catch (error) {
    return {
      pack: pack.name,
      saved: 0,
      retired: 0,
      error: errorMessage(error, "Generation failed. Kept yesterday's batch."),
    }
  }
}

/**
 * Midnight job: a fresh Ollama batch for every active pack replaces the
 * previous night's. A pack whose generation fails keeps its old questions, so
 * rooms never run dry.
 */
export async function refreshDailyQuestions(input: { now?: Date; actorId?: string } = {}) {
  const now = input.now ?? new Date()
  const target = env.QUESTIONS_PER_PACK ?? DEFAULT_PER_PACK
  const packs = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true, isAdult: true },
  })
  const results = await Promise.all(packs.map((pack) => refreshPack(pack, target, now)))
  await prisma.questionFingerprint.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - FINGERPRINT_TTL_MS) } },
  })
  await writeAudit({
    actorId: input.actorId ?? null,
    action: "question.nightly_refresh",
    targetType: "QUESTION_BANK",
    targetId: "all",
    metadata: { model: ollamaModel(), results },
  })
  return results
}
