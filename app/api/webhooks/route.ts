import { timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { env } from "@/lib/env"

function matches(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 })
  }
  const provided = request.headers.get("x-webhook-secret") ?? ""
  if (!matches(provided, env.WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ received: true })
}
