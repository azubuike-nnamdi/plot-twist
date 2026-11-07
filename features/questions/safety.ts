// Automatic guardrails for questions that go live without a human review.
// A question that trips any rule is dropped from the batch.

export const QUESTION_MIN_LENGTH = 8
export const QUESTION_MAX_LENGTH = 160

// Never allowed in any pack, including 18+.
const ALWAYS_BLOCKED = [
  /\b(kill|hurt|harm)\s+(yourself|themselves|myself)\b/i,
  /\bsuicid\w*/i,
  /\bself[-\s]?harm\w*/i,
  // Anything romantic or sexual next to a minor, in either order.
  /^(?=.*\b(child|children|kid|kids|minor|minors|underage|teen|teens|teenage\w*|schoolgirl|schoolboy)\b)(?=.*\b(sex\w*|nude\w*|naked|hook\s?ups?|kiss\w*|date|dating|crush\w*|romanc\w*)\b)/i,
  /\b(rape\w*|molest\w*|incest|bestiality|pedo\w*|paedo\w*)\b/i,
  /\b(nazi\w*|genocide|terroris\w*|shoot(ing)?\s+up)\b/i,
  /\b(n[i1]gg\w*|f[a@]gg?ot\w*|retard\w*|tranny|chink\w*|spic\b|kike\w*|wetback\w*)\b/i,
  /\b(religion|religious|politic\w*|democrat\w*|republican\w*|abortion)\b/i,
  /https?:\/\/|www\./i,
]

// Extra rules for packs a clean-filter room can be dealt.
const CLEAN_BLOCKED = [
  /\b(sex\w*|sexy|nude\w*|naked|porn\w*|orgasm\w*|kink\w*|fetish\w*|horny|hook\s?ups?|one[-\s]night\s+stand|strip\w*|bed\s+partner|thong|lingerie)\b/i,
  /\b(drunk\w*|wasted|hungover|cocaine|weed|stoned|high\s+on|drugs?)\b/i,
  /\b(fuck\w*|shit\w*|bitch\w*|ass(hole)?s?|dick\w*|cock\w*|puss(y|ies)|cunt\w*|damn)\b/i,
  /\b(cheat(ed|ing)?\s+on|affair)\b/i,
]

export function normalizeQuestion(text: string) {
  return text.trim().replace(/\s+/g, " ")
}

/** Key used to spot the same question again, ignoring case and punctuation. */
export function questionKey(text: string) {
  return normalizeQuestion(text)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function questionIsSafe(text: string, adult: boolean) {
  const value = normalizeQuestion(text)
  if (value.length < QUESTION_MIN_LENGTH || value.length > QUESTION_MAX_LENGTH) return false
  if (!value.endsWith("?")) return false
  if (ALWAYS_BLOCKED.some((rule) => rule.test(value))) return false
  if (!adult && CLEAN_BLOCKED.some((rule) => rule.test(value))) return false
  return true
}
