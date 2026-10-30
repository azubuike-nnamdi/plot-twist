import type { Metadata } from "next"
import Link from "next/link"

import { ResetForm } from "@/components/forms/auth-form"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export const metadata: Metadata = { title: "Reset password" }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const params = await searchParams
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <section className="rounded-[20px] border border-border bg-card p-6">
          <h1 className="font-display text-3xl font-bold">Choose a new password</h1>
          {params.token ? (
            <div className="mt-6">
              <ResetForm token={params.token} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-red-300">
              This reset link is missing or expired.{" "}
              <Link href="/forgot-password" className="text-[#9b7bff]">
                Request a new one.
              </Link>
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
