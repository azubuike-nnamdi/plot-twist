import Link from "next/link"

import { logoutAction } from "@/app/actions/auth"
import { AccountLink } from "@/components/layout/account-link"
import { getCurrentUser } from "@/lib/auth/session"
import { SoundToggle } from "@/components/audio/sound-toggle"
import { HowToPlayButton } from "@/components/how-to-play/how-to-play-button"
import { MobileNav } from "@/components/layout/mobile-nav"

export async function SiteHeader() {
  const user = await getCurrentUser()
  const account = user
    ? {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      }
    : null

  return (
    <header className="border-b border-line bg-surface-2/95 text-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="shrink-0 font-display text-lg font-bold tracking-wide"
        >
          PlotTwist
        </Link>
        <nav className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          <SoundToggle />
          <HowToPlayButton className="rounded-lg px-3 py-2 hover:bg-white/10 hover:text-foreground">
            How to Play
          </HowToPlayButton>
          {user ? (
            <>
              {account ? <AccountLink user={account} /> : null}
              <form action={logoutAction}>
                <button className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-line px-4 py-2 text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/create"
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
              >
                Host game
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <SoundToggle />
          {account ? (
            <AccountLink user={account} compact />
          ) : (
            <Link
              href="/create"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Host
            </Link>
          )}
          <MobileNav loggedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  )
}
