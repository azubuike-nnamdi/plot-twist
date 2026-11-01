"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { claimGuestAccount, isEmailTakenMessage } from "@/features/auth/claim"
import { CLAIM_GUEST_COOKIE, CLAIM_ROOM_COOKIE, transferGuestSeat } from "@/features/auth/guest-transfer"
import { auth } from "@/lib/auth/auth"
import { getCurrentUser, requestIp } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"
import { env } from "@/lib/env"
import { AppError, errorMessage } from "@/lib/errors"
import { isAvatar } from "@/lib/game/options"
import { sendWelcomeEmail } from "@/lib/mail/messages"
import { assertRateLimit } from "@/lib/security/rate-limit"
import { safeNextPath } from "@/lib/security/next-path"

export type ActionState = {
  error?: string
  success?: string
  loginHref?: string
} | null

const WINDOW = 15 * 60 * 1000

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim()
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase()
  const username = field(formData, "username")
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")
  const avatar = field(formData, "avatar") || "cipher"
  const next = safeNextPath(formData.get("next"), "/")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." }
  }
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username)) {
    return { error: "Usernames are 3 to 24 letters, numbers, dots, or underscores." }
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Use a password of at least 8 characters." }
  }
  if (password !== confirm) return { error: "Passwords do not match." }
  if (!isAvatar(avatar)) return { error: "Choose an avatar." }
  try {
    await assertRateLimit(`register:${await requestIp()}`, 5, 60 * 60 * 1000)
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: username,
        username,
        avatar,
      },
      headers: await headers(),
    })
  } catch (error) {
    if (error instanceof AppError) return { error: error.message }
    return {
      error: "Could not create the account. That email or username may already be in use.",
    }
  }
  try {
    await sendWelcomeEmail({ to: email, name: username })
  } catch {
    console.error("Welcome email could not be sent")
  }
  redirect(next)
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const identifier = field(formData, "identifier")
  const password = String(formData.get("password") ?? "")
  const next = safeNextPath(formData.get("next"), "/")
  if (!identifier || !password) {
    return { error: "Enter your email or username and password." }
  }
  try {
    await assertRateLimit(
      `login:${await requestIp()}:${identifier.toLowerCase()}`,
      8,
      WINDOW
    )
    const headerStore = await headers()
    const signedIn = identifier.includes("@")
      ? await auth.api.signInEmail({
          body: { email: identifier.toLowerCase(), password },
          headers: headerStore,
        })
      : await auth.api.signInUsername({
          body: { username: identifier, password },
          headers: headerStore,
        })
    if ("status" in signedIn.user && signedIn.user.status !== "ACTIVE") {
      await auth.api.signOut({ headers: await headers() })
      return { error: "This account is suspended." }
    }
    const signedInId = signedIn.user.id
    if (signedInId) {
      const jar = await cookies()
      const guestId = jar.get(CLAIM_GUEST_COOKIE)?.value
      if (guestId && guestId !== signedInId) {
        await transferGuestSeat(guestId, signedInId)
      }
      jar.delete(CLAIM_GUEST_COOKIE)
      jar.delete(CLAIM_ROOM_COOKIE)
    }
  } catch (error) {
    if (error instanceof AppError) return { error: error.message }
    return { error: "Invalid email or password." }
  }
  redirect(next)
}

export async function claimAccountAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase()
  const username = field(formData, "username")
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")
  const name = field(formData, "name") || username
  const code = field(formData, "code")
  const next = safeNextPath(formData.get("next"), code ? `/room/${code}` : "/")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." }
  }
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username)) {
    return { error: "Usernames are 3 to 24 letters, numbers, dots, or underscores." }
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Use a password of at least 8 characters." }
  }
  if (password !== confirm) return { error: "Passwords do not match." }
  if (name.length < 2 || name.length > 32) {
    return { error: "Display names are 2 to 32 characters." }
  }
  const user = await getCurrentUser()
  if (!user) return { error: "Join a room before saving this name." }
  try {
    await assertRateLimit(`claim:${user.id}`, 8, WINDOW)
    await claimGuestAccount({
      userId: user.id,
      email,
      username,
      password,
      name,
    })
  } catch (error) {
    if (error instanceof AppError && isEmailTakenMessage(error.message)) {
      const jar = await cookies()
      jar.set(CLAIM_GUEST_COOKIE, user.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 60,
        secure: process.env.NODE_ENV === "production",
      })
      if (code) {
        jar.set(CLAIM_ROOM_COOKIE, code, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 60,
          secure: process.env.NODE_ENV === "production",
        })
      }
      return {
        error: error.message,
        loginHref: `/login?next=${encodeURIComponent(next)}`,
      }
    }
    if (error instanceof AppError) return { error: error.message }
    return { error: "Could not save this account. That email or username may already be in use." }
  }
  redirect(next)
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect("/")
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase()
  const success = {
    success: "If an account exists for that email, a reset link is on its way.",
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." }
  }
  try {
    await assertRateLimit(`reset:${await requestIp()}`, 5, WINDOW)
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
      },
      headers: await headers(),
    })
  } catch (error) {
    if (error instanceof AppError) return { error: error.message }
    return success
  }
  return success
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = field(formData, "token")
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")
  if (!token) return { error: "This reset link is missing or expired." }
  if (password.length < 8 || password.length > 128) {
    return { error: "Use a password of at least 8 characters." }
  }
  if (password !== confirm) return { error: "Passwords do not match." }
  try {
    await assertRateLimit(`reset-complete:${await requestIp()}`, 8, WINDOW)
    await auth.api.resetPassword({
      body: { newPassword: password, token },
      headers: await headers(),
    })
  } catch {
    return { error: "This reset link is missing or expired." }
  }
  redirect("/login?reset=1")
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Sign in to continue." }
  const name = field(formData, "name")
  const avatar = field(formData, "avatar")
  if (name.length < 2 || name.length > 32) {
    return { error: "Display names are 2 to 32 characters." }
  }
  if (!isAvatar(avatar)) return { error: "Choose an avatar." }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, displayUsername: name, avatar },
  })
  return { success: "Profile saved." }
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirm = String(formData.get("confirm") ?? "")
  if (newPassword.length < 8) {
    return { error: "Use a password of at least 8 characters." }
  }
  if (newPassword !== confirm) return { error: "Passwords do not match." }
  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers(),
    })
  } catch {
    return { error: "The current password is not correct." }
  }
  return { success: "Password updated." }
}

export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Sign in to continue." }
  const password = String(formData.get("password") ?? "")
  const confirm = field(formData, "confirm")
  if (confirm !== session.user.username && confirm !== session.user.email) {
    return { error: "Type your username to confirm deletion." }
  }
  try {
    await auth.api.signInEmail({
      body: { email: session.user.email, password },
      headers: await headers(),
    })
  } catch {
    return { error: "The password is not correct." }
  }
  const id = session.user.id
  const retired = `deleted_${id.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`
  await prisma.user.update({
    where: { id },
    data: {
      status: "DELETED",
      name: "Deleted player",
      email: `${retired}@deleted.plottwist.invalid`,
      username: retired,
      displayUsername: null,
      image: null,
      avatar: null,
    },
  })
  await prisma.account.updateMany({
    where: { userId: id },
    data: { password: null },
  })
  await prisma.session.deleteMany({ where: { userId: id } })
  redirect("/")
}

export async function actionError(error: unknown) {
  return errorMessage(error, "Something went wrong. Try again.")
}
