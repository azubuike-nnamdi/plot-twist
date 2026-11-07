import { timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { refreshDailyQuestions } from "@/features/questions/nightly"
import { env } from "@/lib/env"

// Packs generate in parallel, but each needs several Ollama calls.
export const maxDuration = 300

function matches(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// Vercel Cron calls this at 00:00 UTC (see vercel.json).
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 })
  }
  const provided = request.headers.get("authorization") ?? ""
  if (!matches(provided, `Bearer ${env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const results = await refreshDailyQuestions()
  const failed = results.filter((result) => result.error)
  return NextResponse.json(
    { results },
    { status: failed.length === results.length && results.length > 0 ? 502 : 200 }
  )
}
