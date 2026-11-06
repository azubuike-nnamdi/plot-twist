"use client"

import { useActionState, useEffect, useState } from "react"

import { updateRoomSettingsAction, type ActionState } from "@/app/actions/game"
import { useRefreshRoom } from "@/components/game/use-room-refresh"
import type { PromptPack } from "@/components/forms/create-room-form"
import {
  ANSWER_TIMERS,
  CAPACITY_CHOICES,
  ROUND_CHOICES,
  estimateSessionMinutes,
  guessTimerFor,
} from "@/lib/game/options"
import type { RoomView } from "@/types/room"

function Message({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null
  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${state.error ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}
    >
      {state.error ?? state.success}
    </p>
  )
}

export function LobbySettings({
  view,
  packs,
}: {
  view: RoomView
  packs: PromptPack[]
}) {
  const [state, action, pending] = useActionState(updateRoomSettingsAction, null)
  const refresh = useRefreshRoom(view.code)
  useEffect(() => {
    if (state?.success) void refresh()
  }, [state, refresh])
  const [rounds, setRounds] = useState(view.totalRounds)
  const [capacity, setCapacity] = useState(view.maxPlayers)
  const [answerTimer, setAnswerTimer] = useState(view.answerSeconds)
  const [cleanFilter, setCleanFilter] = useState(view.cleanFilter)
  const [adultConfirmed, setAdultConfirmed] = useState(() =>
    packs.some((pack) => pack.isAdult && view.categoryIds.includes(pack.id))
  )
  const [selected, setSelected] = useState<string[]>(view.categoryIds)
  const minutes = estimateSessionMinutes(rounds, answerTimer)
  const adultLocked = cleanFilter || !adultConfirmed

  function dropAdultPacks() {
    const adultIds = new Set(packs.filter((pack) => pack.isAdult).map((pack) => pack.id))
    setSelected((current) => current.filter((id) => !adultIds.has(id)))
  }

  function handleTogglePack(id: string, isAdult: boolean) {
    if (adultLocked && isAdult) return
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function handleCleanFilter(checked: boolean) {
    setCleanFilter(checked)
    if (checked) dropAdultPacks()
  }

  function handleAdultConfirmed(checked: boolean) {
    setAdultConfirmed(checked)
    if (!checked) dropAdultPacks()
  }

  return (
    <details className="rounded-2xl border border-[#302d41] bg-[#100d1d] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#f6f6fa]">
        Room setup · {view.totalRounds} rounds · about {estimateSessionMinutes(view.totalRounds, view.answerSeconds)} min
      </summary>
      <form action={action} className="mt-4 grid gap-4">
        <Message state={state} />
        <input type="hidden" name="code" value={view.code} />
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-[#f6f6fa]">Rounds</legend>
          <div className="flex flex-wrap gap-2">
            {ROUND_CHOICES.map((choice) => (
              <label key={choice} className="rounded-lg border border-[#302d41] px-3 py-2 text-sm text-[#f6f6fa]">
                <input
                  type="radio"
                  name="totalRounds"
                  value={choice}
                  checked={rounds === choice}
                  onChange={() => setRounds(choice)}
                  className="mr-2"
                />
                {choice}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-[#f6f6fa]">Players</legend>
          <div className="flex flex-wrap gap-2">
            {CAPACITY_CHOICES.map((choice) => (
              <label key={choice} className="rounded-lg border border-[#302d41] px-3 py-2 text-sm text-[#f6f6fa]">
                <input
                  type="radio"
                  name="maxPlayers"
                  value={choice}
                  checked={capacity === choice}
                  onChange={() => setCapacity(choice)}
                  className="mr-2"
                />
                {choice}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-[#f6f6fa]">
            Answer timer · guess {guessTimerFor(answerTimer)}s · about {minutes} min
          </legend>
          <div className="flex flex-wrap gap-2">
            {ANSWER_TIMERS.map((choice) => (
              <label key={choice} className="rounded-lg border border-[#302d41] px-3 py-2 text-sm text-[#f6f6fa]">
                <input
                  type="radio"
                  name="answerTimer"
                  value={choice}
                  checked={answerTimer === choice}
                  onChange={() => setAnswerTimer(choice)}
                  className="mr-2"
                />
                {choice}s
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-[#f6f6fa]">Prompt packs</legend>
          {packs.map((pack) => {
            const blocked = pack.isAdult && adultLocked
            return (
              <label key={pack.id} className={`flex items-center gap-2 text-sm ${blocked ? "text-[#6f6c7b]" : "text-[#f6f6fa]"}`}>
                <input
                  type="checkbox"
                  name="categoryId"
                  value={pack.id}
                  checked={selected.includes(pack.id)}
                  disabled={blocked}
                  onChange={() => handleTogglePack(pack.id, pack.isAdult)}
                />
                {pack.name}
                <span className="text-[#afadba]">{pack.cardCount} cards</span>
              </label>
            )
          })}
        </fieldset>
        <label className="flex items-start gap-2 text-sm text-[#f6f6fa]">
          <input
            type="checkbox"
            name="adultConfirmed"
            checked={adultConfirmed}
            onChange={(event) => handleAdultConfirmed(event.target.checked)}
            className="mt-1"
          />
          <span>
            This room is 18+
            <span className="mt-1 block text-xs text-[#afadba]">
              Required before an adult pack can be selected.
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#f6f6fa]">
          <input
            type="checkbox"
            name="cleanFilter"
            checked={cleanFilter}
            onChange={(event) => handleCleanFilter(event.target.checked)}
          />
          Clean filter
        </label>
        <button disabled={pending} className="h-11 rounded-xl bg-[#9b7bff] font-semibold text-[#100d1d] disabled:opacity-60">
          {pending ? "Saving…" : "Save setup"}
        </button>
      </form>
    </details>
  )
}
