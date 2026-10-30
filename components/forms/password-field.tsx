"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 pr-11 text-sm outline-none focus:border-[#9b7bff]"

export function PasswordField({
  name,
  autoComplete,
  minLength,
  required = true,
}: {
  name: string
  autoComplete: string
  minLength?: number
  required?: boolean
}) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <input
        name={name}
        type={isVisible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={fieldClass}
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
      >
        {isVisible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  )
}
