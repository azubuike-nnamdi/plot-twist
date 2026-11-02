const QUESTION_MIN = 8
const QUESTION_MAX = 280

export function parseGeneratedQuestions(raw: string, limit: number) {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  let parsed: unknown
  try {
    parsed = JSON.parse(fenced?.[1] ?? trimmed)
  } catch {
    return []
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
      typeof parsed === "object" &&
      "questions" in parsed &&
      Array.isArray(parsed.questions)
      ? parsed.questions
      : []
  const seen = new Set<string>()
  const questions: string[] = []
  for (const item of list) {
    if (typeof item !== "string") continue
    const text = item.trim().replace(/\s+/g, " ")
    if (text.length < QUESTION_MIN || text.length > QUESTION_MAX) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    questions.push(text)
    if (questions.length >= limit) break
  }
  return questions
}

export function questionPrompt(input: {
  categoryName: string
  description: string
  count: number
  adult: boolean
  avoid: string[]
}) {
  const tone = input.adult
    ? "This pack is 18+. Keep it playful, never hateful, and never about minors."
    : "Keep every question clean. No sexual content, slurs, or shock."
  const avoid =
    input.avoid.length > 0 ? input.avoid.slice(0, 40).join(" | ") : "none"
  return `Write ${input.count} new prompts for the party game PlotTwist.
Pack: ${input.categoryName}. ${input.description}
${tone}
Each prompt is one question, 8 to 160 characters, that anyone in a friend group can answer.
Do not repeat these prompts: ${avoid}
Return JSON only: {"questions":["..."]}`
}
