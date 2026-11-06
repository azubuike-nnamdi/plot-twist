import { NextResponse } from "next/server"

import { parseRoomCode } from "@/features/rooms/codes"
import { pollRoom } from "@/features/rooms/engine"
import { parseKnownVersion } from "@/features/rooms/poll"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors"

type Context = {
  params: Promise<{ code: string }>
}

const noStore = { "Cache-Control": "no-store" }

export async function GET(request: Request, context: Context) {
  const user = await getCurrentUser()
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401, headers: noStore })
  }
  const { code } = await context.params
  const knownVersion = parseKnownVersion(new URL(request.url).searchParams.get("v"))
  try {
    const result = await pollRoom(parseRoomCode(code), user.id, knownVersion)
    return NextResponse.json(result, { headers: noStore })
  } catch (error) {
    const status = error instanceof AppError && error.code === "NOT_FOUND" ? 404 : 403
    return NextResponse.json({ error: "This room is unavailable." }, { status, headers: noStore })
  }
}
