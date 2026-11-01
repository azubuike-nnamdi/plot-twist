import "server-only"

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { anonymous, username } from "better-auth/plugins"

import { transferGuestSeat } from "@/features/auth/guest-transfer"

import { prisma } from "@/lib/db/prisma"
import { env } from "@/lib/env"
import { sendPasswordResetEmail } from "@/lib/mail/messages"

export const auth = betterAuth({
  appName: "PlotTwist",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          url,
        })
      } catch {
        console.error("Password reset email could not be sent")
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
        input: false,
      },
      avatar: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "ACTIVE",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            role: "USER",
            status: "ACTIVE",
          },
        }),
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  plugins: [
    username(),
    anonymous({
      emailDomainName: "guest.plottwist.invalid",
      disableDeleteAnonymousUser: true,
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await transferGuestSeat(anonymousUser.user.id, newUser.user.id)
      },
    }),
    nextCookies(),
  ],
})
