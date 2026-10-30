"use client"

import { useActionState } from "react"

import { createRoomAction, joinRoomAction, type ActionState } from "@/app/actions/game"
import {
  ANSWER_TIMERS,
  AVATARS,
  CAPACITY_CHOICES,
  GUESS_TIMERS,
  ROUND_CHOICES,
} from "@/lib/game/options"

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

export function CreateRoomForm({
  categories,
}: {
  categories: { id: string; name: string; description: string; isAdult: boolean }[]
}) {
  const [state, action, pending] = useActionState(createRoomAction, null)
  return (
    <form action={action} className="grid gap-6">
      <Message state={state} />
      <label className="grid gap-1 text-sm font-medium">
        Room name
        <input name="name" required minLength={2} maxLength={32} defaultValue="Midnight Mischief" className={fieldClass} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Prompt packs</legend>
        {categories.map((category) => (
          <label key={category.id} className="flex gap-3 rounded-[16px] border border-border px-3 py-3 text-sm">
            <input type="checkbox" name="categoryId" value={category.id} />
            <span>
              <span className="font-semibold">{category.name}</span>
              {category.isAdult ? <span className="ml-2 text-xs text-[#ff6b8a]">18+</span> : null}
              <span className="mt-1 block text-muted-foreground">{category.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Rounds
          <select name="totalRounds" defaultValue="5" className={fieldClass}>
            {ROUND_CHOICES.map((value) => (
              <option key={value} value={value}>
                {value} rounds
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Players
          <select name="maxPlayers" defaultValue="8" className={fieldClass}>
            {CAPACITY_CHOICES.map((value) => (
              <option key={value} value={value}>
                {value} players
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Answer timer
          <select name="answerTimer" defaultValue="60" className={fieldClass}>
            {ANSWER_TIMERS.map((value) => (
              <option key={value} value={value}>
                {value}s
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Guessing timer
          <select name="guessingTimer" defaultValue="45" className={fieldClass}>
            {GUESS_TIMERS.map((value) => (
              <option key={value} value={value}>
                {value}s
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="cleanFilter" />
        Family and work safe mode
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white disabled:opacity-60">
        {pending ? "Creating room…" : "Generate room and enter lobby"}
      </button>
    </form>
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
