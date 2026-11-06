import "server-only"

import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { anonymous, username } from "better-auth/plugins"

import { transferGuestSeat } from "@/features/auth/guest-transfer"

import { prisma } from "@/lib/db/prisma"
import { CLIENT_IP_HEADERS } from "@/lib/security/client-ip"
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
    // The room polls every second. A short signed cookie cache answers most of
    // those session checks without a database round trip. Suspensions, role
    // changes, and revoked sessions take effect within this window.
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  // Counts live in Postgres so every serverless instance shares them. Memory
  // storage would give each instance its own counter.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-in/anonymous": { window: 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/forget-password": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 60 * 60, max: 8 },
      "/change-password": { window: 60 * 60, max: 10 },
    },
  },
  advanced: {
    ipAddress: {
      // Only headers the hosting proxy sets. Vercel writes x-real-ip and
      // overwrites x-forwarded-for, so clients cannot spoof either there.
      ipAddressHeaders: CLIENT_IP_HEADERS,
    },
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
