import { z } from "zod"

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z.url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  MAILTRAP_API_TOKEN: z.string().min(1, "MAILTRAP_API_TOKEN is required"),
  MAILTRAP_FROM_EMAIL: z.email("MAILTRAP_FROM_EMAIL must be a valid email"),
  MAILTRAP_SENDER_NAME: z.string().min(1).optional(),
  WEBHOOK_SECRET: z.string().min(1).optional(),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  ADMIN_EMAIL: z.email("ADMIN_EMAIL must be a valid email").optional(),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),
  OLLAMA_BASE_URL: z.url("OLLAMA_BASE_URL must be a valid URL").optional(),
  OLLAMA_MODEL: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function readServerEnv(
  source: Partial<Record<keyof ServerEnv, string | undefined>>
): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: source.DATABASE_URL,
    BETTER_AUTH_SECRET: source.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: source.BETTER_AUTH_URL,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    MAILTRAP_API_TOKEN: source.MAILTRAP_API_TOKEN,
    MAILTRAP_FROM_EMAIL: source.MAILTRAP_FROM_EMAIL,
    MAILTRAP_SENDER_NAME: source.MAILTRAP_SENDER_NAME || undefined,
    WEBHOOK_SECRET: source.WEBHOOK_SECRET || undefined,
    DATABASE_URL_UNPOOLED: source.DATABASE_URL_UNPOOLED || undefined,
    ADMIN_EMAIL: source.ADMIN_EMAIL || undefined,
    CRON_SECRET: source.CRON_SECRET || undefined,
    OLLAMA_BASE_URL: source.OLLAMA_BASE_URL || undefined,
    OLLAMA_MODEL: source.OLLAMA_MODEL || undefined,
  })
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => issue.message)
      .join(" ")
    throw new Error(`Missing or invalid configuration. ${details}`)
  }
  return parsed.data
}
