import type { Metadata } from "next"
import Link from "next/link"

import { ForgotForm } from "@/components/forms/auth-form"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export const metadata: Metadata = { title: "Forgot password" }

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <section className="rounded-[20px] border border-border bg-card p-6">
          <h1 className="font-display text-3xl font-bold">Forgot password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We will email a reset link if an account exists for that address.
          </p>
          <div className="mt-6">
            <ForgotForm />
          </div>
          <Link href="/login" className="mt-4 inline-block text-sm text-primary">
            Back to log in
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
