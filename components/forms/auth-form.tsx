"use client"

import Link from "next/link"
import { useActionState } from "react"

import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  type ActionState,
} from "@/app/actions/auth"
import { PasswordField } from "@/components/forms/password-field"
import { AVATARS } from "@/lib/game/options"

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#9b7bff]"

function Message({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null
  return (
    <p
      role="status"
      className={
        state.error
          ? "rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300"
          : "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-300"
      }
    >
      {state.error ?? state.success}
    </p>
  )
}

export function LoginForm({ next, reset }: { next?: string; reset?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null)
  return (
    <form action={action} className="grid gap-4">
      {reset ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-300">
          Password updated. Sign in with the new one.
        </p>
      ) : null}
      <Message state={state} />
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="grid gap-1 text-sm font-medium">
        Email or username
        <input name="identifier" required autoComplete="username" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Password
        <PasswordField name="password" autoComplete="current-password" />
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Signing in…" : "Log in"}
      </button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-[#9b7bff]">
          Forgot password?
        </Link>
        <Link href="/register" className="text-[#9b7bff]">
          Create account
        </Link>
      </div>
    </form>
  )
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, null)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="grid gap-1 text-sm font-medium">
        Username
        <input name="username" required minLength={3} maxLength={24} autoComplete="username" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Password
        <PasswordField name="password" autoComplete="new-password" minLength={8} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Confirm password
        <PasswordField name="confirm" autoComplete="new-password" minLength={8} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((avatar) => (
            <label key={avatar.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <input type="radio" name="avatar" value={avatar.id} defaultChecked={avatar.id === "cipher"} className="mr-2" />
              {avatar.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Creating account…" : "Create account and play"}
      </button>
      <Link href="/login" className="text-sm text-[#9b7bff]">
        Already have an account? Log in
      </Link>
    </form>
  )
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <label className="grid gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  )
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <input type="hidden" name="token" value={token} />
      <label className="grid gap-1 text-sm font-medium">
        New password
        <PasswordField name="password" autoComplete="new-password" minLength={8} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Confirm password
        <PasswordField name="confirm" autoComplete="new-password" minLength={8} />
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  )
}
