"use client"

import {
  ArrowLeft,
  Briefcase,
  Check,
  Clock3,
  Eye,
  Info,
  Lock,
  type LucideIcon,
  MessageCircleHeart,
  ShieldCheck,
  Shuffle,
  Smile,
  Sparkles,
  Timer,
  Users,
  Zap,
  Clapperboard,
} from "lucide-react"
import Link from "next/link"
import { useActionState, useMemo, useState } from "react"

import { createRoomAction, type ActionState } from "@/app/actions/game"
import { AvatarImage } from "@/components/avatars/avatar-image"
import { cn } from "@/lib/utils"
import {
  ANSWER_TIMERS,
  CAPACITY_CHOICES,
  ROUND_PRESETS,
  estimateSessionMinutes,
  guessTimerFor,
} from "@/lib/game/options"

export type PromptPack = {
  id: string
  name: string
  description: string
  isAdult: boolean
  cardCount: number
}

export type CreateRoomHost = {
  name: string
  avatar: string | null
}

const ROOM_NAMES = [
  "Midnight Whispers",
  "Midnight Mischief",
  "Chaotic Brunch",
  "Soft Launch",
  "Plot Armageddon",
  "Group Chat Energy",
  "No Context",
  "After Hours",
  "Friendly Fire",
  "Low Stakes",
]

const PACK_ORDER = [
  "Awkward Confessions",
  "Pop Culture Chaos",
  "Wild Hypotheticals",
  "Office Shenanigans",
  "Deep and Dark Secrets",
  "Wholesome Nonsense",
]

const DEFAULT_PACKS = ["Awkward Confessions", "Wild Hypotheticals"]

const panelClass = "rounded-[24px] border border-white/10 bg-[#161222] p-5"

type PackStyle = {
  icon: LucideIcon
  badge?: string
  badgeClass: string
  iconClass: string
}

const packStyles: Record<string, PackStyle> = {
  "Awkward Confessions": {
    icon: MessageCircleHeart,
    badge: "POPULAR",
    badgeClass: "bg-[#ff6b8a]/15 text-[#ff8fab]",
    iconClass: "bg-[#9b7bff]/20 text-[#c4b5fd]",
  },
  "Pop Culture Chaos": {
    icon: Clapperboard,
    badge: "FRESH",
    badgeClass: "bg-[#34d399]/15 text-[#6ee7b7]",
    iconClass: "bg-white/10 text-[#d6d3e0]",
  },
  "Wild Hypotheticals": {
    icon: Zap,
    badgeClass: "bg-[#ff6b8a]/15 text-[#ff8fab]",
    iconClass: "bg-[#9b7bff]/20 text-[#c4b5fd]",
  },
  "Office Shenanigans": {
    icon: Briefcase,
    badgeClass: "bg-[#ff6b8a]/15 text-[#ff8fab]",
    iconClass: "bg-white/10 text-[#d6d3e0]",
  },
  "Deep and Dark Secrets": {
    icon: Eye,
    badge: "18+",
    badgeClass: "bg-[#ff6b8a]/15 text-[#ff8fab]",
    iconClass: "bg-white/10 text-[#d6d3e0]",
  },
  "Wholesome Nonsense": {
    icon: Smile,
    badgeClass: "bg-[#ff6b8a]/15 text-[#ff8fab]",
    iconClass: "bg-white/10 text-[#d6d3e0]",
  },
}

function packStyle(pack: PromptPack): PackStyle {
  const known = packStyles[pack.name]
  if (known) {
    return pack.isAdult ? { ...known, badge: known.badge ?? "18+" } : known
  }
  return {
    icon: Sparkles,
    badge: pack.isAdult ? "18+" : undefined,
    badgeClass: "bg-[#ff6b8a]/15 text-[#ff8fab]",
    iconClass: "bg-white/10 text-[#d6d3e0]",
  }
}

function orderedPacks(categories: PromptPack[]) {
  const rank = new Map(PACK_ORDER.map((name, index) => [name, index]))
  return [...categories].sort((left, right) => {
    const leftRank = rank.get(left.name) ?? 100
    const rightRank = rank.get(right.name) ?? 100
    if (leftRank !== rightRank) return leftRank - rightRank
    return left.name.localeCompare(right.name)
  })
}

function initialSelection(categories: PromptPack[]) {
  const preferred = categories.filter((pack) => DEFAULT_PACKS.includes(pack.name))
  if (preferred.length > 0) return preferred.map((pack) => pack.id)
  return categories
    .filter((pack) => !pack.isAdult)
    .slice(0, 2)
    .map((pack) => pack.id)
}

function Message({ state }: { state: ActionState }) {
  if (!state?.error) return null
  return (
    <p role="status" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {state.error}
    </p>
  )
}

export function CreateRoomForm({
  categories,
  host,
}: {
  categories: PromptPack[]
  host: CreateRoomHost
}) {
  const [state, action, pending] = useActionState(createRoomAction, null)
  const packs = useMemo(() => orderedPacks(categories), [categories])
  const [name, setName] = useState("Midnight Whispers")
  const [selectedIds, setSelectedIds] = useState(() => initialSelection(categories))
  const [totalRounds, setTotalRounds] = useState<(typeof ROUND_PRESETS)[number]["rounds"]>(5)
  const [maxPlayers, setMaxPlayers] = useState<(typeof CAPACITY_CHOICES)[number]>(8)
  const [answerTimer, setAnswerTimer] = useState<(typeof ANSWER_TIMERS)[number]>(30)
  const [cleanFilter, setCleanFilter] = useState(true)
  const [adultConfirmed, setAdultConfirmed] = useState(false)
  const guessingTimer = guessTimerFor(answerTimer)
  const minutes = estimateSessionMinutes(totalRounds, answerTimer)
  const selectedPacks = packs.filter((pack) => selectedIds.includes(pack.id))
  const adultLocked = cleanFilter || !adultConfirmed
  const eligiblePacks = packs.filter((pack) => !(adultLocked && pack.isAdult))
  const timerIndex = Math.max(0, ANSWER_TIMERS.indexOf(answerTimer))
  const sliderPercent = (timerIndex / (ANSWER_TIMERS.length - 1)) * 100
  const hostName = host.name.slice(0, 18) || "Host"

  function togglePack(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function handleSelectAll() {
    setSelectedIds(eligiblePacks.map((pack) => pack.id))
  }

  function dropAdultPacks() {
    setSelectedIds((current) =>
      current.filter((id) => {
        const pack = packs.find((item) => item.id === id)
        return pack ? !pack.isAdult : false
      })
    )
  }

  function handleCleanFilter(next: boolean) {
    setCleanFilter(next)
    if (next) dropAdultPacks()
  }

  function handleAdultConfirmed(next: boolean) {
    setAdultConfirmed(next)
    if (!next) dropAdultPacks()
  }

  function handleRandomize() {
    const choices = ROOM_NAMES.filter((item) => item !== name)
    const next = choices[Math.floor(Math.random() * choices.length)] ?? ROOM_NAMES[0]
    setName(next)
  }

  return (
    <form action={action} className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[#d6d3e0] hover:bg-white/10"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to Home
        </Link>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#d6d3e0]">
          Host Mode
        </span>
      </div>

      <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#9b7bff]/15 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#c4b5fd] uppercase">
        <Sparkles className="size-3.5" aria-hidden />
        Host a party session
      </p>
      <h1 className="font-display mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Configure Your Room
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#b7b3c7] sm:text-base">
        Pick your prompt vibes, set timer stakes, and adjust custom rules. Friends join instantly
        with your room code.
      </p>

      <Message state={state} />

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">
          <section className={panelClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#9b7bff]/15 text-[#c4b5fd]">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="font-semibold text-white">Room Identity</h2>
                  <p className="text-sm text-[#9c98ad]">What your crew sees when they hop in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRandomize}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c4b5fd] hover:text-white"
              >
                <Shuffle className="size-4" aria-hidden />
                Randomize
              </button>
            </div>

            <label htmlFor="room-name" className="mt-5 block text-[11px] font-semibold tracking-[0.14em] text-[#9c98ad] uppercase">
              Room name
            </label>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#100d1c] px-4">
              <input
                id="room-name"
                name="name"
                required
                minLength={2}
                maxLength={32}
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 32))}
                className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
              />
              <span className="shrink-0 text-xs text-[#8d89a0]">
                {name.length}/32
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="flex items-center gap-3 rounded-2xl border border-[#9b7bff]/40 bg-[#9b7bff]/10 px-4 py-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#9b7bff]/20 text-[#c4b5fd]">
                  <Lock className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">Private Lobby</span>
                  <span className="block text-xs text-[#b7b3c7]">Passcode PIN needed to join</span>
                </span>
                <span className="flex size-6 items-center justify-center rounded-full bg-[#9b7bff] text-[#100d1d]">
                  <Check className="size-3.5" aria-hidden />
                </span>
              </div>

              <fieldset>
                <legend className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-[#9c98ad] uppercase">
                  <Users className="size-3.5" aria-hidden />
                  Player capacity
                  <span className="ml-auto normal-case tracking-normal text-[#d6d3e0]">
                    {maxPlayers} Players
                  </span>
                </legend>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {CAPACITY_CHOICES.map((value) => {
                    const selected = maxPlayers === value
                    return (
                      <label
                        key={value}
                        className={cn(
                          "flex h-10 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold",
                          selected
                            ? "bg-[#ff6b8a] text-white"
                            : "bg-[#2a2438] text-[#d6d3e0] hover:bg-[#342d46]"
                        )}
                      >
                        <input
                          type="radio"
                          name="maxPlayers"
                          value={value}
                          checked={selected}
                          onChange={() => setMaxPlayers(value)}
                          className="sr-only"
                        />
                        {value}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            </div>
          </section>

          <section className={panelClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#ff6b8a]/15 text-[#ff8fab]">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 font-semibold text-white">
                    Prompt Category Packs
                    <span className="rounded-full bg-[#ff6b8a]/15 px-2 py-0.5 text-[11px] font-semibold text-[#ff8fab]">
                      {selectedPacks.length} Selected
                    </span>
                  </h2>
                  <p className="text-sm text-[#9c98ad]">
                    Select multiple packs to blend variety into each round
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm font-medium text-[#c4b5fd] hover:text-white"
              >
                Select All
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {packs.map((pack) => {
                const style = packStyle(pack)
                const Icon = style.icon
                const selected = selectedIds.includes(pack.id)
                const locked = pack.isAdult && adultLocked
                return (
                  <label
                    key={pack.id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border px-3.5 py-3.5",
                      locked && "cursor-not-allowed opacity-40",
                      selected
                        ? "border-[#a78bfa] bg-[#9b7bff]/10"
                        : "border-white/10 bg-[#120f1c] hover:border-white/15"
                    )}
                  >
                    <input
                      type="checkbox"
                      name="categoryId"
                      value={pack.id}
                      checked={selected}
                      disabled={locked}
                      onChange={() => togglePack(pack.id)}
                      className="sr-only"
                    />
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", style.iconClass)}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-white">
                          {pack.name}
                          {style.badge ? (
                            <span className={cn("ml-2 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-wide", style.badgeClass)}>
                              {style.badge}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                            selected
                              ? "border-[#a78bfa] bg-[#a78bfa] text-[#100d1d]"
                              : "border-white/20"
                          )}
                          aria-hidden
                        >
                          {selected ? <Check className="size-3" /> : null}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-[#8d89a0]">{pack.cardCount} cards</span>
                      <span className="mt-1 block text-sm leading-5 text-[#b7b3c7]">{pack.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-[#120f1c] px-3.5 py-3">
              <input
                type="checkbox"
                name="adultConfirmed"
                checked={adultConfirmed}
                onChange={(event) => handleAdultConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-white">This room is 18+</span>
                <span className="mt-1 block text-xs leading-5 text-[#9c98ad]">
                  Confirm this before an adult pack can be selected. The clean filter still keeps those packs out while it is on.
                </span>
              </span>
            </label>
          </section>

          <section className={panelClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#f5c16c]/15 text-[#f5c16c]">
                  <Clock3 className="size-4" aria-hidden />
                </span>
                <div>
                  <h2 className="font-semibold text-white">Rounds & Turn Clock</h2>
                  <p className="text-sm text-[#9c98ad]">
                    Fine-tune the tension and pacing. Every match stays under 10 minutes.
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-[#d6d3e0]">
                {totalRounds} Rounds (~{minutes} min)
              </p>
            </div>

            <fieldset className="mt-5">
              <legend className="text-[11px] font-semibold tracking-[0.14em] text-[#9c98ad] uppercase">
                Game length (rounds)
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {ROUND_PRESETS.map((preset) => {
                  const selected = totalRounds === preset.rounds
                  const presetMinutes = estimateSessionMinutes(preset.rounds, answerTimer)
                  return (
                    <label
                      key={preset.rounds}
                      className={cn(
                        "cursor-pointer rounded-2xl px-3 py-4 text-center",
                        selected
                          ? "bg-[#c4b5fd] text-[#24143a]"
                          : "bg-[#221c33] text-white hover:bg-[#2c2540]"
                      )}
                    >
                      <input
                        type="radio"
                        name="totalRounds"
                        value={preset.rounds}
                        checked={selected}
                        onChange={() => setTotalRounds(preset.rounds)}
                        className="sr-only"
                      />
                      <span className="block text-3xl font-bold">{preset.rounds}</span>
                      <span className="mt-1 block text-sm font-semibold">{preset.label}</span>
                      <span className={cn("mt-1 block text-xs", selected ? "text-[#4c3b73]" : "text-[#9c98ad]")}>
                        ~{presetMinutes} min
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9c98ad] uppercase">
                Response timer
                <span className="ml-2 rounded-full bg-[#ff6b8a]/15 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-[#ff8fab] normal-case">
                  {answerTimer}s Per Prompt
                </span>
              </p>
            </div>
            <input type="hidden" name="answerTimer" value={answerTimer} />
            <input type="hidden" name="guessingTimer" value={guessingTimer} />
            <input
              type="range"
              min={0}
              max={ANSWER_TIMERS.length - 1}
              step={1}
              value={timerIndex}
              aria-label="Response timer"
              aria-valuemin={ANSWER_TIMERS[0]}
              aria-valuemax={ANSWER_TIMERS[ANSWER_TIMERS.length - 1]}
              aria-valuenow={answerTimer}
              aria-valuetext={`${answerTimer} seconds per prompt`}
              onChange={(event) => {
                const next = ANSWER_TIMERS[Number(event.target.value)]
                if (next) setAnswerTimer(next)
              }}
              style={{
                background: `linear-gradient(to right, #c4b5fd ${sliderPercent}%, #3a3450 ${sliderPercent}%)`,
              }}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[#d8c7ff] [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[#d8c7ff] [&::-webkit-slider-thumb]:bg-white"
            />
            <div className="mt-3 grid grid-cols-3 text-xs text-[#9c98ad]">
              <span>20s (Rapid Fire)</span>
              <span className="text-center">30s (Balanced)</span>
              <span className="text-right">45s (Thoughtful)</span>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9c98ad] uppercase">
                Game modifiers
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#34d399]/15 text-[#6ee7b7]">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">Clean Prompt Filter</span>
                  <span className="block text-xs text-[#9c98ad]">
                    Excludes 18+ packs, spicy prompts, and provocative themes
                  </span>
                </span>
                <input
                  type="checkbox"
                  name="cleanFilter"
                  checked={cleanFilter}
                  onChange={(event) => handleCleanFilter(event.target.checked)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-colors",
                    cleanFilter ? "bg-[#c4b5fd]" : "bg-[#3a3450]"
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "absolute top-1 size-5 rounded-full bg-white transition-transform",
                      cleanFilter ? "left-6" : "left-1"
                    )}
                  />
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#161222]">
            <div className="h-1.5 bg-linear-to-r from-[#ff6b8a] via-[#c084fc] to-[#f5c16c]" />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9c98ad] uppercase">
                  Lobby ticket preview
                </p>
                <span className="rounded-full bg-[#9b7bff]/20 px-2 py-1 text-[10px] font-bold tracking-wide text-[#c4b5fd]">
                  Ready to host
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#100d1c] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-[#8d89a0] uppercase">
                      Room title
                    </p>
                    <p className="mt-1 text-lg font-bold text-white">{name || "Untitled room"}</p>
                  </div>
                  <p className="font-mono text-xs tracking-widest text-[#c4b5fd]">TWST-••••••••</p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <AvatarImage avatar={host.avatar && host.avatar.length > 0 ? host.avatar : "cipher"} alt="" className="size-10 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold tracking-[0.14em] text-[#8d89a0] uppercase">
                      Room host
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-white">
                      <span className="truncate font-semibold">{hostName}</span>
                      <span className="rounded-full bg-[#ff6b8a] px-1.5 py-0.5 text-[10px] font-bold text-[#100d1d]">
                        HOST
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-3 text-xs text-[#b7b3c7]">
                      <span className="inline-flex items-center gap-1 text-[#6ee7b7]">
                        <Check className="size-3.5" aria-hidden />
                        Ready
                      </span>
                      <span>#1</span>
                    </span>
                  </span>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#b7b3c7]">Game rounds</dt>
                  <dd className="font-semibold text-white">{totalRounds} Rounds</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-[#b7b3c7]">
                    <Timer className="size-4 text-[#c4b5fd]" aria-hidden />
                    Answer timer
                  </dt>
                  <dd className="font-semibold text-white">{answerTimer} Seconds</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#b7b3c7]">Guessing</dt>
                  <dd className="font-semibold text-white">{guessingTimer} Seconds</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-[#b7b3c7]">
                    <Users className="size-4 text-[#c4b5fd]" aria-hidden />
                    Max capacity
                  </dt>
                  <dd className="font-semibold text-white">{maxPlayers} Players</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-[#b7b3c7]">
                    <Lock className="size-4 text-[#c4b5fd]" aria-hidden />
                    Lobby privacy
                  </dt>
                  <dd className="font-semibold text-white">Private (PIN required)</dd>
                </div>
              </dl>

              <div className="mt-4">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9c98ad] uppercase">
                  Active prompt packs ({selectedPacks.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPacks.length === 0 ? (
                    <span className="text-sm text-[#9c98ad]">Pick at least one pack.</span>
                  ) : (
                    selectedPacks.map((pack) => (
                      <span
                        key={pack.id}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-[#e7e4f2]"
                      >
                        {pack.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <p className="mt-4 rounded-2xl border border-[#f5c16c]/30 bg-[#f5c16c]/10 px-3 py-3 text-sm text-[#f8e7c0]">
                Estimated duration · ~{minutes} {minutes === 1 ? "minute" : "minutes"} of pure chaos.
              </p>

              <button
                disabled={pending || selectedPacks.length === 0}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#c4b5fd] text-sm font-bold tracking-wide text-[#24143a] uppercase disabled:opacity-50"
              >
                <Sparkles className="size-4" aria-hidden />
                {pending ? "Creating room…" : "Generate room and enter lobby"}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-[#8d89a0]">
                Share the room code from the lobby. The match starts once at least three players are in.
              </p>
            </div>
          </section>

          <section className={cn(panelClass, "flex gap-3")}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#c4b5fd]">
              <Info className="size-4" aria-hidden />
            </span>
            <p className="text-sm leading-6 text-[#b7b3c7]">
              <span className="font-semibold text-white">Host Pro-Tip: </span>
              For maximum laughs, mix at least two distinct categories (like Awkward Confessions +
              Office Shenanigans). Best group size is 4 to 8 players.
            </p>
          </section>
        </aside>
      </div>
    </form>
  )
}
