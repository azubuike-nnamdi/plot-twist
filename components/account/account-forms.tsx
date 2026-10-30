"use client"

import { useActionState } from "react"

import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
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

export function ProfileForm({
  name,
  avatar,
}: {
  name: string
  avatar: string
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <label className="grid gap-1 text-sm font-medium">
        Display name
        <input name="name" required minLength={2} maxLength={32} defaultValue={name} className={fieldClass} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((item) => (
            <label key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <input type="radio" name="avatar" value={item.id} defaultChecked={item.id === avatar} className="mr-2" />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        Save profile
      </button>
    </form>
  )
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <label className="grid gap-1 text-sm font-medium">
        Current password
        <PasswordField name="currentPassword" autoComplete="current-password" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        New password
        <PasswordField name="newPassword" autoComplete="new-password" minLength={8} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Confirm new password
        <PasswordField name="confirm" autoComplete="new-password" minLength={8} />
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#9b7bff] font-semibold text-white disabled:opacity-60">
        Update password
      </button>
    </form>
  )
}

export function DeleteForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, null)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <label className="grid gap-1 text-sm font-medium">
        Type your username to confirm
        <input name="confirm" required className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Password
        <PasswordField name="password" autoComplete="current-password" />
      </label>
      <button disabled={pending} className="h-11 rounded-lg border border-red-300 text-red-300 disabled:opacity-60">
        Delete account
      </button>
    </form>
  )
}
