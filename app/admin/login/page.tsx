import type { Metadata } from "next"

import { LoginForm } from "@/components/forms/auth-form"

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <section className="rounded-[20px] border border-border bg-card p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#9b7bff] uppercase">
          Staff
        </p>
        <h1 className="font-display mt-2 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin tools are limited to staff accounts.
        </p>
        <div className="mt-6">
          <LoginForm next="/admin" />
        </div>
      </section>
    </main>
  )
}
