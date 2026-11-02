import "server-only"

import { readServerEnv } from "@/lib/env-schema"

export const env = readServerEnv({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  MAILTRAP_API_TOKEN: process.env.MAILTRAP_API_TOKEN,
  MAILTRAP_FROM_EMAIL: process.env.MAILTRAP_FROM_EMAIL,
  MAILTRAP_SENDER_NAME: process.env.MAILTRAP_SENDER_NAME,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  CRON_SECRET: process.env.CRON_SECRET,
})
