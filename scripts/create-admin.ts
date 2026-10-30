import { prisma } from "../lib/db/prisma"
import { auth } from "../lib/auth/auth"

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const username = process.env.ADMIN_USERNAME?.trim()
const password = process.env.ADMIN_PASSWORD ?? ""

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Set ADMIN_EMAIL before running pnpm admin:create.")
  process.exit(1)
}
if (!username || !/^[a-zA-Z0-9_.]{3,24}$/.test(username)) {
  console.error("Set ADMIN_USERNAME to 3-24 letters, numbers, dots, or underscores.")
  process.exit(1)
}
if (password.length < 8) {
  console.error("Set ADMIN_PASSWORD to at least 8 characters.")
  process.exit(1)
}

const existing = await prisma.user.findFirst({
  where: { OR: [{ email }, { username }] },
})

if (existing) {
  await prisma.user.update({
    where: { id: existing.id },
    data: { role: "SUPER_ADMIN", status: "ACTIVE" },
  })
  console.log("Existing account is now a super admin.")
  process.exit(0)
}

await auth.api.signUpEmail({
  body: {
    email,
    password,
    name: username,
    username,
  },
})

await prisma.user.update({
  where: { email },
  data: { role: "SUPER_ADMIN", status: "ACTIVE" },
})

console.log("Super admin created. Sign in at /admin/login.")
process.exit(0)
