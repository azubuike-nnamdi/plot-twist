"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

export function JoinCodeForm() {
  const router = useRouter()
  const [code, setCode] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = code.trim()
    router.push(next ? `/join?code=${encodeURIComponent(next)}` : "/join")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-14 min-w-0 flex-1 items-center rounded-xl border border-border bg-card p-1.5"
    >
      <label className="sr-only" htmlFor="room-code">
        Room code
      </label>
      <input
        id="room-code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="TWST-XXXXXXXX"
        autoCapitalize="characters"
        className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm tracking-wide outline-none sm:tracking-widest"
      />
      <button className="h-11 shrink-0 rounded-lg bg-[#ff6b8a] px-5 text-sm font-semibold text-white">
        Join
      </button>
    </form>
  )
}
