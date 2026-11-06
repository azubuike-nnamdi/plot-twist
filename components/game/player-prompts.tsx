"use client"

import { useActionState, useEffect } from "react"

import { reviewPromptAction, submitPromptAction, type ActionState } from "@/app/actions/game"
import { useRefreshRoom, useRoomAction } from "@/components/game/use-room-refresh"
import { PROMPT_MAX_LENGTH, PROMPT_MIN_LENGTH } from "@/features/rooms/prompts"
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

export function PlayerPrompts({ view }: { view: RoomView }) {
  const [state, action, pending] = useActionState(submitPromptAction, null)
  const refresh = useRefreshRoom(view.code)
  const act = useRoomAction(view.code)
  useEffect(() => {
    if (state?.success) void refresh()
  }, [state, refresh])
  const yours = view.prompts.find((prompt) => prompt.isYours)
  const ready = view.prompts.filter((prompt) => prompt.status === "ACCEPTED").length
  return (
    <section className="rounded-2xl border border-[#302d41] bg-[#100d1d] p-4">
      <h2 className="text-sm font-semibold text-[#f6f6fa]">Ask the room</h2>
      <p className="mt-1 text-sm text-[#afadba]">
        {ready === 0
          ? "Add a question for this group. Pack cards fill any round that is still open."
          : `${ready} player ${ready === 1 ? "question is" : "questions are"} ready, ahead of the packs.`}
        {view.cleanFilter ? " The host approves questions while the clean filter is on." : ""}
      </p>
      <form action={action} className="mt-3 grid gap-2">
        <Message state={state} />
        <input type="hidden" name="code" value={view.code} />
        <label className="grid gap-1 text-sm text-[#f6f6fa]">
          Your question
          <textarea
            name="prompt"
            required
            minLength={PROMPT_MIN_LENGTH}
            maxLength={PROMPT_MAX_LENGTH}
            rows={2}
            defaultValue={yours?.text ?? ""}
            placeholder="What would this group never admit?"
            className="rounded-xl border border-[#302d41] bg-[#1b1730] p-3 text-[#f6f6fa] outline-none placeholder:text-[#afadba] focus:border-[#9b7bff]"
          />
        </label>
        <button disabled={pending} className="h-11 rounded-xl bg-[#9b7bff] font-semibold text-[#100d1d] disabled:opacity-60">
          {pending ? "Saving…" : yours ? "Update your question" : "Add your question"}
        </button>
      </form>
      {view.prompts.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {view.prompts.map((prompt) => (
            <li key={prompt.id} className="rounded-xl border border-[#302d41] bg-[#1b1730] px-3 py-3 text-sm">
              <p className="text-[#f6f6fa]">{prompt.text}</p>
              <p className="mt-1 text-xs text-[#afadba]">
                {prompt.authorName} asks
                {prompt.status === "PENDING" ? " · waiting for the host" : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {view.youAreHost && prompt.status === "PENDING" ? (
                  <form action={act(reviewPromptAction, view.code, prompt.id, "ACCEPTED")}>
                    <button className="h-9 rounded-lg bg-[#9b7bff] px-3 text-xs font-semibold text-[#100d1d]">
                      Approve
                    </button>
                  </form>
                ) : null}
                {view.youAreHost || prompt.isYours ? (
                  <form action={act(reviewPromptAction, view.code, prompt.id, "REMOVED")}>
                    <button className="h-9 rounded-lg border border-[#302d41] px-3 text-xs text-[#f6f6fa]">
                      Remove
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
