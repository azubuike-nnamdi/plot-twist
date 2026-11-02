import Link from "next/link"

import { logoutAction } from "@/app/actions/auth"
import { AccountLink } from "@/components/layout/account-link"
import { getCurrentUser } from "@/lib/auth/session"
import { MobileNav } from "@/components/layout/mobile-nav"

export async function SiteHeader() {
  const user = await getCurrentUser()
  const account = user
    ? { id: user.id, name: user.name, username: user.username, avatar: user.avatar }
    : null

  return (
    <header className="border-b border-[#302d41] bg-[#1b1730]/95 text-[#f6f6fa]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-display shrink-0 text-lg font-bold tracking-wide">
          PlotTwist
        </Link>
        <nav className="hidden items-center gap-2 text-sm text-[#afadba] md:flex">
          <Link href="/how-to-play" className="rounded-lg px-3 py-2 hover:bg-white/10 hover:text-[#f6f6fa]">
            How to Play
          </Link>
          {user ? (
            <>
              {account ? <AccountLink user={account} /> : null}
              <form action={logoutAction}>
                <button className="h-10 rounded-lg bg-[#ff6b8a] px-4 font-semibold text-[#100d1d]">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg border border-[#302d41] px-4 py-2 text-[#f6f6fa]">
                Log in
              </Link>
              <Link href="/create" className="rounded-lg bg-[#9b7bff] px-4 py-2 font-semibold text-[#100d1d]">
                Host game
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          {account ? (
            <AccountLink user={account} compact />
          ) : (
            <Link href="/create" className="rounded-lg bg-[#9b7bff] px-3 py-2 text-sm font-semibold text-[#100d1d]">
              Host
            </Link>
          )}
          <MobileNav loggedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  )
}
