import Link from "next/link"
import { Clock, Monitor, Users } from "lucide-react"

import { HowToPlayButton } from "@/components/how-to-play/how-to-play-button"
import { MusicTrack } from "@/components/audio/music"
import { HeroConfetti } from "@/components/landing/hero-confetti"
import { JoinCodeForm } from "@/components/landing/join-code-form"
import { enterUp, Reveal } from "@/components/landing/reveal"
import { SampleRound } from "@/components/landing/sample-round"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

const phases = [
  {
    step: "01",
    title: "Answer",
    body: "Everyone gets the same prompt and writes one anonymous answer.",
    chip: "bg-primary/15 text-primary",
  },
  {
    step: "02",
    title: "Guess",
    body: "Answers are shuffled. Vote on who wrote each one.",
    chip: "bg-twist/15 text-twist",
  },
  {
    step: "03",
    title: "Reveal",
    body: "+100 for every right guess. +50 for every friend you fool.",
    chip: "bg-gold/15 text-gold",
  },
]

const packs: [string, string][] = [
  ["Awkward Confessions", "Most played"],
  ["Wild Hypotheticals", "Playful"],
  ["Office Shenanigans", "Coworkers"],
  ["Pop Culture Chaos", "Loud"],
  ["Wholesome Nonsense", "Gentle"],
  ["Deep and Dark Secrets", "18+"],
]

const facts = [
  { icon: Monitor, label: "No download" },
  { icon: Users, label: "2–16 players" },
  { icon: Clock, label: "About 10 minutes" },
]

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <MusicTrack track="landing" />
      <main className="overflow-x-clip">
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/4 size-80 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-24 right-0 size-72 rounded-full bg-twist/25 blur-3xl"
          />
          <HeroConfetti />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <h1
                className={`${enterUp} max-w-xl font-display text-[2.25rem] leading-[1.05] font-bold tracking-tight text-foreground sm:text-5xl xl:text-6xl`}
              >
                Write it secretly.
                <br />
                Guess who said it.
                <br />
                <span className="landing-shimmer">Plot the twist.</span>
              </h1>
              <p
                className={`${enterUp} mt-5 max-w-md text-lg text-muted-foreground delay-150`}
              >
                The anonymous answer game for your group chat, game night, or
                team call.
              </p>
              <div
                className={`${enterUp} mt-8 flex flex-col gap-3 delay-300 sm:flex-row sm:items-center`}
              >
                <Link
                  href="/create"
                  className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground sm:w-auto"
                >
                  Host a game
                </Link>
                <JoinCodeForm />
              </div>
              <ul
                className={`${enterUp} mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground delay-300`}
              >
                {facts.map((fact) => (
                  <li
                    key={fact.label}
                    className="inline-flex items-center gap-1.5"
                  >
                    <fact.icon aria-hidden className="size-4 text-primary" />
                    {fact.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${enterUp} delay-500`}>
              <SampleRound />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              Three steps. One twist.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {phases.map((phase, i) => (
              <Reveal key={phase.step} delay={i * 120} className="h-full">
                <article className="h-full rounded-2xl border border-border bg-card p-6 transition-transform duration-500 ease-out-soft hover:-translate-y-1 motion-reduce:transition-none">
                  <span
                    className={`inline-flex size-10 items-center justify-center rounded-xl font-mono text-sm font-semibold ${phase.chip}`}
                  >
                    {phase.step}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold">{phase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {phase.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
              Pick your vibe
            </h2>
          </Reveal>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
            {packs.map(([title, tag], i) => (
              <Reveal key={title} delay={i * 70}>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-2 pr-2 pl-4 text-sm font-semibold transition-transform duration-500 ease-out-soft hover:-translate-y-1 motion-reduce:transition-none">
                  {title}
                  <span
                    className={
                      tag === "18+"
                        ? "rounded-full bg-twist/15 px-2 py-0.5 text-xs text-twist"
                        : "rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary"
                    }
                  >
                    {tag}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-4 pt-4 pb-16">
          <Reveal className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-[24px] border border-border bg-card px-6 py-14 text-center">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/20 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 bottom-0 size-48 rounded-full bg-twist/15 blur-2xl"
              />
              <div className="relative">
                <h2 className="font-display text-3xl font-bold sm:text-5xl">
                  Game night starts here
                </h2>
                <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
                  <Link
                    href="/create"
                    className="inline-flex h-14 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground"
                  >
                    Host a game
                  </Link>
                  <Link
                    href="/join"
                    className="inline-flex h-14 items-center justify-center rounded-xl border border-line bg-background px-6 font-semibold"
                  >
                    Join with a code
                  </Link>
                </div>
                <HowToPlayButton className="mt-6 inline-block text-sm font-semibold text-primary">
                  ▶ Watch how it works
                </HowToPlayButton>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
