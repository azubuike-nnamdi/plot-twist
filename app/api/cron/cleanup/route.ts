import { timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { cleanupExpiredRows } from "@/features/maintenance/cleanup"
import { env } from "@/lib/env"

function matches(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 })
  }
  const provided = request.headers.get("authorization") ?? ""
  if (!matches(provided, `Bearer ${env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await cleanupExpiredRows()
  return NextResponse.json(result)
}
