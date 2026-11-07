"use client"

import { PanelLeft, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { logoutAction } from "@/app/actions/auth"

const menuLink = "flex min-h-11 items-center rounded-lg px-3 text-sm text-foreground hover:bg-white/10"

export function MobileNav({
  loggedIn,
}: {
  loggedIn: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  function handleClose() {
    setIsOpen(false)
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="flex size-11 items-center justify-center rounded-lg border border-white/25"
      >
        <PanelLeft aria-hidden className="size-5" />
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-surface-2/40"
            onClick={handleClose}
          />
          <nav className="absolute inset-y-0 left-0 flex w-[min(18rem,calc(100vw-3rem))] flex-col bg-surface-2 p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold">PlotTwist</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={handleClose}
                className="flex size-11 items-center justify-center rounded-lg border border-white/25"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="mt-6 grid gap-1">
              <Link href="/how-to-play" className={menuLink} onClick={handleClose}>
                How to Play
              </Link>
              {loggedIn ? (
                <>
                  <Link href="/account" className={menuLink} onClick={handleClose}>
                    Account
                  </Link>
                  <form action={logoutAction}>
                    <button className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-foreground hover:bg-white/10">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className={menuLink} onClick={handleClose}>
                    Log in
                  </Link>
                  <Link href="/join" className={menuLink} onClick={handleClose}>
                    Join with a code
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
