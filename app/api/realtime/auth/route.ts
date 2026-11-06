import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { roomCodeFromChannel } from "@/lib/realtime/channels"
import { realtimeSecrets } from "@/lib/realtime/publish"
import { channelAuth, isSocketId } from "@/lib/realtime/sign"
import { assertRateLimit } from "@/lib/security/rate-limit"

const noStore = { "Cache-Control": "no-store" }

function deny(status: number) {
  return NextResponse.json({ error: "Not allowed." }, { status, headers: noStore })
}

// Pusher calls this when a browser subscribes to a private room channel. Only
// players seated in that room get a signature.
export async function POST(request: Request) {
  const secrets = realtimeSecrets()
  if (!secrets) return deny(501)
  const user = await getCurrentUser()
  if (!user || user.status !== "ACTIVE") return deny(401)
  try {
    await assertRateLimit(`realtime-auth:${user.id}`, 60, 60 * 1000)
  } catch {
    return deny(429)
  }
  const form = await request.formData().catch(() => null)
  const socketId = String(form?.get("socket_id") ?? "")
  const channel = String(form?.get("channel_name") ?? "")
  const code = roomCodeFromChannel(channel)
  if (!isSocketId(socketId) || !code) return deny(400)
  const seat = await prisma.roomPlayer.findFirst({
    where: { userId: user.id, room: { roomCode: code }, status: { in: ["JOINED", "READY"] } },
    select: { id: true },
  })
  if (!seat) return deny(403)
  return NextResponse.json(
    channelAuth({ key: secrets.key, secret: secrets.secret, socketId, channel }),
    { headers: noStore }
  )
}
