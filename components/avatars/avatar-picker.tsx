"use client"

import { Check, Shuffle } from "lucide-react"
import { useState } from "react"

import { AvatarImage } from "@/components/avatars/avatar-image"
import { randomAvatarSeed } from "@/lib/avatars"
import { cn } from "@/lib/utils"

export function AvatarPicker({
  value,
  choices,
  onChange,
}: {
  value: string
  choices: string[]
  onChange: (next: string) => void
}) {
  const [options, setOptions] = useState(choices)

  function handleRandomize() {
    const next = [randomAvatarSeed(), randomAvatarSeed(), randomAvatarSeed()]
    setOptions(next)
    onChange(next[0])
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Select party avatar</legend>
      <div className="grid max-w-sm grid-cols-3 gap-3" role="radiogroup" aria-label="Select party avatar">
        {options.map((seed, index) => {
          const selected = value === seed
          return (
            <label
              key={seed}
              className={cn(
                "relative flex aspect-square cursor-pointer items-center justify-center rounded-2xl border",
                selected
                  ? "border-[#c4b5fd] bg-[#9b7bff]/15"
                  : "border-white/10 bg-[#161222] hover:border-white/25"
              )}
            >
              <input
                type="radio"
                name="avatar-choice"
                value={seed}
                checked={selected}
                onChange={() => onChange(seed)}
                className="sr-only"
                aria-label={`Avatar ${index + 1}`}
              />
              <AvatarImage avatar={seed} alt="" className="size-[70%]" />
              {selected ? (
                <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-[#c4b5fd] text-[#24143a]">
                  <Check aria-hidden className="size-3" />
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
      <button
        type="button"
        onClick={handleRandomize}
        className="inline-flex h-10 items-center justify-center gap-2 text-sm font-semibold text-[#c4b5fd]"
      >
        <Shuffle aria-hidden className="size-4" />
        Randomize
      </button>
    </fieldset>
  )
}
