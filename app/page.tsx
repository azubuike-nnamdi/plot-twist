import Link from "next/link"
import { Monitor, Sparkles, Users } from "lucide-react"

import { JoinCodeForm } from "@/components/landing/join-code-form"
import { SampleRound } from "@/components/landing/sample-round"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

const phases = [
  {
    step: "01",
    label: "Phase 1: Submit",
    title: "Secret prompt drops",
    body: "Every player gets the same prompt and writes one anonymous answer before the timer ends.",
    note: "20–45 second answer timer",
    chip: "bg-primary/15 text-primary",
  },
  {
    step: "02",
    label: "Phase 2: Guess",
    title: "Blind guessing",
    body: "Answers are shuffled. Read each one and vote for the author. You cannot vote for yourself.",
    note: "A correct guess is 100 points",
    chip: "bg-twist/15 text-twist",
  },
  {
    step: "03",
    label: "Phase 3: Reveal",
    title: "The plot twist",
    body: "Authors are unveiled. Correct guesses earn 100 points, and every player you fooled earns you 50.",
    note: "Then the leaderboard updates",
    chip: "bg-gold/15 text-gold",
  },
]

const packs = [
  ["Awkward Confessions", "Cringeworthy dates, bad decisions, and secrets.", "Most played"],
  ["Wild Hypotheticals", "Absurd dilemmas, superpowers, and parallel realities.", "Playful"],
  ["Office Shenanigans", "Meeting nightmares, status messages, and chat lore.", "Coworkers"],
  ["Deep and Dark Secrets", "Spicier questions for a group that opted in.", "18+"],
  ["Pop Culture Chaos", "Movies, memes, and celebrity drama.", "Loud"],
  ["Wholesome Nonsense", "Food debates, tiny rituals, and harmless secrets.", "Gentle"],
]

const features = [
  {
    icon: Monitor,
    title: "No download",
    body: "Open a room in the browser. Share the code TWST-XXXXXXXX or the invite link.",
    tone: "bg-primary/15 text-primary",
  },
  {
    icon: Sparkles,
    title: "Straight scoring",
    body: "A correct guess is worth 100 points. Fool a friend and your answer earns 50 bluff points.",
    tone: "bg-twist/15 text-twist",
  },
  {
    icon: Users,
    title: "2 to 16 players",
    body: "Start once at least two players are in the room. Capacity can go up to 16.",
    tone: "bg-gold/15 text-gold",
  },
]

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/4 size-80 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-24 right-0 size-72 rounded-full bg-twist/25 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                <span className="size-2 rounded-full bg-[#7b5ad7]" />
                Social party
              </p>
              <h1 className="font-display mt-5 max-w-xl text-[2rem] leading-tight font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Drop secret answers. Guess the author. Plot the twist.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                The party game for friend groups and game night. Write anonymous
                answers, figure out who said what, and score 100 points for every
                correct guess. Fool your friends and your answer scores too.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/create"
                  className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground sm:w-auto"
                >
                  Host a game
                </Link>
                <JoinCodeForm />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No download. An account is required to host, not to play.
              </p>
            </div>
            <SampleRound />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="text-center">
            <p className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              Simple 3-phase gameplay
            </p>
            <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
              How a PlotTwist match unfolds
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Three steps. Write an answer, guess the author, then watch the reveal.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {phases.map((phase) => (
              <article
                key={phase.step}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <p className="font-mono text-sm text-muted-foreground">{phase.step}</p>
                <p className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${phase.chip}`}>
                  {phase.label}
                </p>
                <h3 className="mt-4 text-xl font-semibold">{phase.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{phase.body}</p>
                <p className="mt-6 text-sm font-medium">{phase.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex rounded-full bg-twist/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-twist uppercase">
              Six prompt packs
            </p>
            <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
              Decks for laughs, drama, and a chosen vibe
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Pick the packs when you create the room. Family and work safe mode
              leaves out the 18+ deck.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {packs.map(([title, body, tag]) => (
                <article
                  key={title}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{title}</h3>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                      {tag}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="flex gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${feature.tone}`}>
                  <feature.icon aria-hidden className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[24px] border border-border bg-card px-6 py-14 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 bottom-0 size-48 rounded-full bg-twist/15"
            />
            <div className="relative">
              <p className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                Ready for game night?
              </p>
              <h2 className="font-display mt-4 text-3xl font-bold sm:text-5xl">
                Open your first room in a minute
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Free in the browser. Create an account, send the room code, and start
                once two players are in.
              </p>
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
                <Link
                  href="/how-to-play"
                  className="inline-flex h-14 items-center justify-center px-4 font-semibold text-primary"
                >
                  How to play
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Want to keep your name and avatar?{" "}
                <Link href="/register" className="font-semibold text-primary">
                  Create an account
                </Link>{" "}
                or{" "}
                <Link href="/login" className="font-semibold text-primary">
                  sign in
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
