"use client"

import { useActionState, useState } from "react"

import { joinRoomAction, type ActionState } from "@/app/actions/game"
import { AvatarImage } from "@/components/avatars/avatar-image"
import { AvatarPicker } from "@/components/avatars/avatar-picker"
import { isUploadAvatar } from "@/lib/avatars"

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"

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
  defaultAvatar,
  choices,
}: {
  code?: string
  defaultName: string
  defaultAvatar: string
  choices: string[]
}) {
  const [state, action, pending] = useActionState(joinRoomAction, null)
  const [avatar, setAvatar] = useState(defaultAvatar)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <input type="hidden" name="avatar" value={avatar} />
      {isUploadAvatar(avatar) ? (
        <div className="flex items-center gap-3">
          <AvatarImage avatar={avatar} alt="" className="size-16" />
          <p className="text-sm text-muted-foreground">Your photo stays on this seat unless you pick another face.</p>
        </div>
      ) : null}
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
      <AvatarPicker value={avatar} choices={choices} onChange={setAvatar} />
      <button disabled={pending} className="h-11 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-60">
        {pending ? "Joining…" : "Join room"}
      </button>
    </form>
  )
}
