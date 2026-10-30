import { NextResponse } from "next/server"

import { parseRoomCode } from "@/features/rooms/codes"
import { getRoomView } from "@/features/rooms/engine"
import { getCurrentUser } from "@/lib/auth/session"
import { AppError } from "@/lib/errors"

type Context = {
  params: Promise<{ code: string }>
}

export async function GET(_request: Request, context: Context) {
  const user = await getCurrentUser()
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 })
  }
  const { code } = await context.params
  try {
    const view = await getRoomView(parseRoomCode(code), user.id)
    return NextResponse.json(view)
  } catch (error) {
    const status = error instanceof AppError && error.code === "NOT_FOUND" ? 404 : 403
    return NextResponse.json({ error: "This room is unavailable." }, { status })
  }
}
