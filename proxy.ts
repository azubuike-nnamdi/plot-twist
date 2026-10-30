import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

const authPages = new Set(["/login", "/register"])

function needsAccount(pathname: string) {
  return (
    pathname === "/create" ||
    pathname.startsWith("/create/") ||
    pathname === "/join" ||
    pathname.startsWith("/join/") ||
    pathname === "/room" ||
    pathname.startsWith("/room/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  )
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const session = getSessionCookie(request)
  const isAdminLogin = pathname === "/admin/login"
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/")

  if (isAdmin && !isAdminLogin && !session) {
    const url = new URL("/admin/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (!isAdmin && needsAccount(pathname) && !session) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (session && authPages.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
