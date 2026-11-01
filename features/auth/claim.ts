import "server-only"

import { randomUUID } from "node:crypto"

import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { AppError } from "@/lib/errors"

const EMAIL_TAKEN = "That email already belongs to an account. Log in to keep this seat."

export function isEmailTakenMessage(message: string) {
  return message === EMAIL_TAKEN
}

export async function claimGuestAccount(input: {
  userId: string
  email: string
  username: string
  password: string
  name: string
}) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } })
  if (!user?.isAnonymous) {
    throw new AppError("This seat is already a full account.", "CONFLICT")
  }
  const emailOwner = await prisma.user.findUnique({ where: { email: input.email } })
  if (emailOwner && emailOwner.id !== user.id) {
    throw new AppError(EMAIL_TAKEN, "CONFLICT")
  }
  const usernameOwner = await prisma.user.findUnique({
    where: { username: input.username },
  })
  if (usernameOwner && usernameOwner.id !== user.id) {
    throw new AppError("That username is taken.", "CONFLICT")
  }
  const context = await auth.$context
  const password = await context.password.hash(input.password)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: input.email,
        name: input.name,
        username: input.username,
        displayUsername: input.name,
        isAnonymous: false,
      },
    })
    await tx.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password,
      },
    })
  })
}
