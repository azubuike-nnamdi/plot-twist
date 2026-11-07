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

// Rotating angles nudge each night's batch somewhere new.
export const QUESTION_ANGLES = [
  "everyday habits",
  "childhood memories",
  "food and cooking",
  "travel mishaps",
  "texting and social media",
  "school and work",
  "money and shopping",
  "friendships",
  "hypothetical choices",
  "secret talents and fears",
  "home life and roommates",
  "music, movies, and TV",
  "holidays and celebrations",
  "embarrassing moments",
  "pets and animals",
  "weekend plans",
]

export function anglesFor(date: Date, count = 3) {
  const day = Math.floor(date.getTime() / 86_400_000)
  return Array.from(
    { length: count },
    (_, index) => QUESTION_ANGLES[(day * count + index) % QUESTION_ANGLES.length]
  )
}

export function questionPrompt(input: {
  categoryName: string
  description: string
  count: number
  adult: boolean
  avoid: string[]
  angles?: string[]
}) {
  const tone = input.adult
    ? "This pack is 18+. Keep it playful and cheeky, never hateful, graphic, or about minors."
    : "Keep every question clean enough for family and coworkers. No sex, drugs, alcohol, swearing, politics, or religion."
  const avoid =
    input.avoid.length > 0 ? input.avoid.slice(0, 40).join(" | ") : "none"
  const angles = input.angles?.length ? `Lean on these themes today: ${input.angles.join(", ")}.\n` : ""
  return `Write ${input.count} new prompts for the party game PlotTwist.
Players answer anonymously, then guess who wrote each answer, so the best prompts invite personal, funny, specific answers.
Pack: ${input.categoryName}. ${input.description}
${tone}
${angles}Each prompt is one question ending in "?", 8 to 160 characters, that anyone in a friend group can answer.
Do not repeat or rephrase these prompts: ${avoid}
Return JSON only: {"questions":["..."]}`
}
