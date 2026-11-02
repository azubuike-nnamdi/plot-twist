"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react"

import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
  type ActionState,
} from "@/app/actions/auth"
import { AvatarPicker } from "@/components/avatars/avatar-picker"
import { PasswordField } from "@/components/forms/password-field"
import { AVATAR_MAX_BYTES, avatarSrc, isUploadAvatar } from "@/lib/avatars"

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#9b7bff]"
const PHOTO_ERROR = "Use a PNG, JPEG, or JPG image of 1 MB or less."

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

function ProfileFields({
  name,
  initialAvatar,
  choices,
}: {
  name: string
  initialAvatar: string
  choices: string[]
}) {
  const [avatar, setAvatar] = useState(initialAvatar)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  function clearPhoto() {
    setFileError(null)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handlePick(seed: string) {
    setAvatar(seed)
    clearPhoto()
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const filename = file.name.toLowerCase()
    if (!/\.(png|jpe?g)$/.test(filename) || file.size > AVATAR_MAX_BYTES) {
      setFileError(PHOTO_ERROR)
      event.target.value = ""
      return
    }
    setFileError(null)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(file)
    previewRef.current = url
    setPreview(url)
  }

  const photoSrc = preview ?? (isUploadAvatar(avatar) ? avatarSrc(avatar) : null)

  return (
    <>
      <label className="grid gap-1 text-sm font-medium">
        Display name
        <input name="name" required minLength={2} maxLength={32} defaultValue={name} className={fieldClass} />
      </label>
      <input type="hidden" name="avatar" value={avatar} />
      {photoSrc ? (
        <div className="flex items-center gap-3">
          <span
            role="img"
            aria-label="Selected profile photo"
            className="size-16 rounded-full bg-[#221c33] bg-cover bg-center"
            style={{ backgroundImage: `url("${photoSrc}")` }}
          />
          <p className="text-sm text-muted-foreground">This photo is your current profile picture.</p>
        </div>
      ) : null}
      <AvatarPicker value={preview ? "" : avatar} choices={choices} onChange={handlePick} />
      <label className="grid gap-1 text-sm font-medium">
        Profile photo
        <input
          ref={fileRef}
          name="photo"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          onChange={handlePhoto}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-[#9b7bff] file:px-3 file:font-semibold file:text-[#100d1d]"
        />
        <span className="text-xs font-normal text-muted-foreground">PNG, JPEG, or JPG, up to 1 MB.</span>
      </label>
      {fileError ? <p className="text-sm text-red-300">{fileError}</p> : null}
    </>
  )
}

export function ProfileForm({
  name,
  avatar: initialAvatar,
  choices,
}: {
  name: string
  avatar: string
  choices: string[]
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null)
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    if (!state?.success) return
    void queryClient.invalidateQueries({ queryKey: ["me"] })
    void queryClient.invalidateQueries({ queryKey: ["room"] })
    router.refresh()
  }, [state, queryClient, router])

  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <ProfileFields
        key={state?.avatar ?? initialAvatar}
        name={state?.name ?? name}
        initialAvatar={state?.avatar ?? initialAvatar}
        choices={choices}
      />
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save profile"}
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
