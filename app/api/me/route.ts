import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { isAvatar } from "@/lib/avatars"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 })
  }
  return NextResponse.json({
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.avatar && isAvatar(user.avatar) ? user.avatar : "cipher",
  })
}
