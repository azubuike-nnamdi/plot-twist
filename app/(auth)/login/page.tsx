import type { Metadata } from "next"

import { LoginForm } from "@/components/forms/auth-form"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { safeNextPath } from "@/lib/security/next-path"

export const metadata: Metadata = { title: "Log in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; error?: string }>
}) {
  const params = await searchParams
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <section className="rounded-[20px] border border-border bg-card p-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#9b7bff] uppercase">
            Player pass
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Log in to host a room. Friends can join with a name.
          </p>
          {params.error === "suspended" ? (
            <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
              This account is suspended.
            </p>
          ) : null}
          <div className="mt-6">
            <LoginForm next={safeNextPath(params.next, "/")} reset={params.reset === "1"} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
