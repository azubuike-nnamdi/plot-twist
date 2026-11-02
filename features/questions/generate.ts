import "server-only"

import { isStaff } from "@/features/auth/permissions"
import { parseGeneratedQuestions, questionPrompt } from "@/features/questions/ollama"
import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import { env } from "@/lib/env"
import { AppError } from "@/lib/errors"
import { assertRateLimit } from "@/lib/security/rate-limit"

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
const DEFAULT_OLLAMA_MODEL = "llama3.2"
const REQUEST_MS = 45_000

type OllamaChatResponse = {
  message?: { content?: string }
}

export async function generateQuestions(input: {
  actorRole: string
  actorId: string
  categoryId: string
  count: number
  isAdult: boolean
}) {
  if (!isStaff(input.actorRole)) {
    throw new AppError("You do not have access to that.", "FORBIDDEN")
  }
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 8) {
    throw new AppError("Generate between 1 and 8 questions.", "VALIDATION")
  }
  await assertRateLimit(`questions:${input.actorId}`, 5, 15 * 60 * 1000)
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  })
  if (!category) throw new AppError("Choose a category.", "VALIDATION")
  const existing = await prisma.question.findMany({
    where: { categoryId: category.id },
    select: { text: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  })
  const adult = input.isAdult || category.isAdult
  const prompt = questionPrompt({
    categoryName: category.name,
    description: category.description,
    count: input.count,
    adult,
    avoid: existing.map((question) => question.text),
  })
  const content = await requestOllama(prompt)
  const known = new Set(existing.map((question) => question.text.trim().toLowerCase()))
  const fresh = parseGeneratedQuestions(content, input.count).filter(
    (text) => !known.has(text.toLowerCase())
  )
  if (fresh.length === 0) {
    throw new AppError("Ollama did not return any new questions.", "VALIDATION")
  }
  await prisma.question.createMany({
    data: fresh.map((text) => ({
      text,
      categoryId: category.id,
      isAdult: adult,
      isActive: false,
    })),
  })
  await writeAudit({
    actorId: input.actorId,
    action: "question.generate",
    targetType: "CATEGORY",
    targetId: category.id,
    metadata: { count: fresh.length, model: env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL },
  })
  return fresh.length
}

async function requestOllama(prompt: string) {
  const baseUrl = (env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/$/, "")
  const model = env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(REQUEST_MS),
    })
  } catch {
    throw new AppError("Ollama is not reachable. Start it, then try again.", "VALIDATION")
  }
  if (!response.ok) {
    throw new AppError(
      `Ollama could not run ${model}. Pull that model, or set OLLAMA_MODEL.`,
      "VALIDATION"
    )
  }
  const body = (await response.json()) as OllamaChatResponse
  const content = body.message?.content
  if (!content) throw new AppError("Ollama returned an empty draft.", "VALIDATION")
  return content
}
