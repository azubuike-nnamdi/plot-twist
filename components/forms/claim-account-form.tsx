"use client"

import { useActionState } from "react"
import Link from "next/link"

import { claimAccountAction, type ActionState } from "@/app/actions/auth"

const fieldClass =
  "h-11 w-full rounded-lg border border-[#302d41] bg-[#100d1d] px-3 text-sm text-[#f6f6fa] outline-none focus:border-[#9b7bff]"

function Message({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${state.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}
    >
      {state.error ?? state.success}
      {state.loginHref ? (
        <>
          {" "}
          <Link href={state.loginHref} className="font-semibold underline">
            Log in
          </Link>
        </>
      ) : null}
    </p>
  )
}

export function ClaimAccountForm({
  defaultName,
  code,
}: {
  defaultName: string
  code?: string
}) {
  const [state, action, pending] = useActionState(claimAccountAction, null)
  return (
    <form action={action} className="mt-3 grid gap-3">
      <Message state={state} />
      <input type="hidden" name="name" value={defaultName} />
      {code ? <input type="hidden" name="code" value={code} /> : null}
      {code ? <input type="hidden" name="next" value={`/room/${code}`} /> : null}
      <label className="grid gap-1 text-sm font-medium text-[#f6f6fa]">
        Email
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium text-[#f6f6fa]">
        Username
        <input name="username" required minLength={3} maxLength={24} autoComplete="username" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium text-[#f6f6fa]">
        Password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium text-[#f6f6fa]">
        Confirm password
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={fieldClass} />
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save this name"}
      </button>
    </form>
  )
}
