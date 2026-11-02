import { NextResponse } from "next/server"

import { prisma } from "@/lib/db/prisma"

type Context = {
  params: Promise<{ userId: string }>
}

export async function GET(_request: Request, context: Context) {
  const { userId } = await context.params
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(userId)) {
    return new NextResponse(null, { status: 404 })
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarMime: true, avatarData: true, status: true },
  })
  if (
    !user ||
    user.status === "DELETED" ||
    (user.avatarMime !== "image/png" && user.avatarMime !== "image/jpeg") ||
    !user.avatarData
  ) {
    return new NextResponse(null, { status: 404 })
  }
  return new NextResponse(new Uint8Array(user.avatarData), {
    headers: {
      "Content-Type": user.avatarMime,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
