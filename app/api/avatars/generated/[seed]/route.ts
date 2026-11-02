import { NextResponse } from "next/server"

import { renderAvatarSvg } from "@/features/avatars/render"

type Context = {
  params: Promise<{ seed: string }>
}

export async function GET(_request: Request, context: Context) {
  const { seed } = await context.params
  const svg = renderAvatarSvg(decodeURIComponent(seed))
  if (!svg) return new NextResponse(null, { status: 404 })
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
