import type { Metadata } from "next"

import { RegisterForm } from "@/components/forms/auth-form"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { partyChoices } from "@/lib/avatars"
import { safeNextPath } from "@/lib/security/next-path"

export const metadata: Metadata = { title: "Create account" }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <section className="rounded-[20px] border border-border bg-card p-6">
          <h1 className="font-display text-3xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            An account is required to host, not to play. Friends can join a room with a name.
          </p>
          <div className="mt-6">
            <RegisterForm next={safeNextPath(params.next, "/")} choices={partyChoices()} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
