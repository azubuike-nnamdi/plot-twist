"use client"

import { useActionState } from "react"

import {
  closeRoomAction,
  saveCategoryAction,
  saveQuestionAction,
  settingsAction,
  type ActionState,
} from "@/app/actions/admin"

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#9b7bff]"

function Message({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null
  return (
    <p className={state.error ? "text-sm text-red-300" : "text-sm text-emerald-300"}>
      {state.error ?? state.success}
    </p>
  )
}

export function QuestionForm({
  categories,
}: {
  categories: { id: string; name: string }[]
}) {
  const [state, action, pending] = useActionState(saveQuestionAction, null)
  return (
    <form action={action} className="grid gap-3">
      <Message state={state} />
      <textarea name="text" required minLength={8} maxLength={280} rows={3} placeholder="Question text" className="rounded-lg border border-border p-3 text-sm" />
      <select name="categoryId" required className={fieldClass} defaultValue="">
        <option value="" disabled>
          Category
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAdult" /> 18+
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white">
        Save question
      </button>
    </form>
  )
}

export function CategoryForm() {
  const [state, action, pending] = useActionState(saveCategoryAction, null)
  return (
    <form action={action} className="grid gap-3">
      <Message state={state} />
      <input name="name" required minLength={2} maxLength={40} placeholder="Name" className={fieldClass} />
      <textarea name="description" required minLength={8} maxLength={160} rows={2} placeholder="Description" className="rounded-lg border border-border p-3 text-sm" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAdult" /> 18+
      </label>
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white">
        Save category
      </button>
    </form>
  )
}

export function CloseRoomForm() {
  const [state, action, pending] = useActionState(closeRoomAction, null)
  return (
    <form action={action} className="grid gap-3">
      <Message state={state} />
      <input name="code" required placeholder="Room code" className={`${fieldClass} font-mono`} />
      <input name="reason" required minLength={4} placeholder="Reason" className={fieldClass} />
      <button disabled={pending} className="h-11 rounded-lg border border-border">
        Close room
      </button>
    </form>
  )
}

export function SettingsForm({
  settings,
}: {
  settings: {
    defaultRounds: number
    defaultAnswerTimer: number
    defaultGuessingTimer: number
    defaultMaxPlayers: number
    roomLifetimeMinutes: number
    minPlayers: number
  }
}) {
  const [state, action, pending] = useActionState(settingsAction, null)
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Message state={state} />
      {(
        [
          ["defaultRounds", "Default rounds", settings.defaultRounds],
          ["defaultAnswerTimer", "Answer timer", settings.defaultAnswerTimer],
          ["defaultGuessingTimer", "Guessing timer", settings.defaultGuessingTimer],
          ["defaultMaxPlayers", "Max players", settings.defaultMaxPlayers],
          ["roomLifetimeMinutes", "Room lifetime (minutes)", settings.roomLifetimeMinutes],
          ["minPlayers", "Minimum players", settings.minPlayers],
        ] as const
      ).map(([name, label, value]) => (
        <label key={name} className="grid gap-1 text-sm font-medium">
          {label}
          <input name={name} type="number" required defaultValue={value} className={fieldClass} />
        </label>
      ))}
      <button disabled={pending} className="h-11 rounded-lg bg-[#ff6b8a] font-semibold text-white sm:col-span-2">
        Save settings
      </button>
    </form>
  )
}
