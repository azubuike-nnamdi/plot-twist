export function safeNextPath(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("/")) return fallback
  if (value.startsWith("//")) return fallback
  if (value.includes("://")) return fallback
  if (value.includes("\\")) return fallback
  return value
}
