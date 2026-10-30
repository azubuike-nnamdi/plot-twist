"use client"

import { useActionState } from "react"

import { joinRoomAction, type ActionState } from "@/app/actions/game"
import { AVATARS } from "@/lib/game/options"

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#9b7bff]"

function Message({ state }: { state: ActionState }) {
  if (!state?.error) return null
  return (
    <p role="status" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {state.error}
    </p>
  )
}

export function JoinRoomForm({
  code,
  defaultName,
}: {
  code?: string
  defaultName: string
}) {
  const [state, action, pending] = useActionState(joinRoomAction, null)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <label className="grid gap-1 text-sm font-medium">
        Room code
        <input
          name="code"
          required
          defaultValue={code ?? ""}
          autoCapitalize="characters"
          className={`${fieldClass} font-mono tracking-widest`}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Display name
        <input name="displayName" required minLength={2} maxLength={18} defaultValue={defaultName} className={fieldClass} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((avatar) => (
            <label key={avatar.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <input type="radio" name="avatar" value={avatar.id} defaultChecked={avatar.id === "joy"} className="mr-2" />
              {avatar.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Joining…" : "Join room"}
      </button>
    </form>
  )
}
