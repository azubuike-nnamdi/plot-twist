import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { isStaff } from "@/features/auth/permissions"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { clientIpFrom } from "@/lib/security/client-ip"
import { AppError } from "@/lib/errors"

export type CurrentUser = {
  id: string
  name: string
  email: string
  username: string | null
  role: string
  avatar: string | null
  status: string
  isAnonymous: boolean
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user) return null
  const user = session.user
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: "username" in user ? (user.username as string | null) : null,
    role: "role" in user ? String(user.role) : "USER",
    avatar: "avatar" in user ? ((user.avatar as string | null) ?? null) : null,
    status: "status" in user ? String(user.status) : "ACTIVE",
    isAnonymous: "isAnonymous" in user ? user.isAnonymous === true : false,
  }
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new AppError("Sign in to continue.", "UNAUTHORIZED")
  }
  if (user.status !== "ACTIVE") {
    throw new AppError("This account is suspended.", "FORBIDDEN")
  }
  return user
}

export async function requirePageUser(nextPath: string) {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  if (user.status !== "ACTIVE") redirect("/login?error=suspended")
  return user
}

export async function requireStaff() {
  const user = await requireUser()
  if (!isStaff(user.role)) {
    throw new AppError("You do not have access to that.", "FORBIDDEN")
  }
  return user
}

export async function requireStaffPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/admin/login")
  if (!isStaff(user.role) || user.status !== "ACTIVE") redirect("/")
  return user
}

export async function requestIp() {
  return clientIpFrom(await headers())
}

export async function revokeUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } })
}
