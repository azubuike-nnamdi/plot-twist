import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

const authPages = new Set(["/login", "/register"])

function needsAccount(pathname: string) {
  return (
    pathname === "/create" ||
    pathname.startsWith("/create/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  )
}

function roomJoinRedirect(request: NextRequest, pathname: string) {
  const code = pathname.split("/").filter(Boolean)[1] ?? ""
  const url = new URL("/join", request.url)
  if (code) url.searchParams.set("code", code)
  return NextResponse.redirect(url)
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

  if (
    !session &&
    (pathname === "/room" || pathname.startsWith("/room/"))
  ) {
    return roomJoinRedirect(request, pathname)
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
