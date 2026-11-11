"use client"

import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { useEffect } from "react"

import { useHowToPlay } from "@/components/how-to-play/store"
import { Walkthrough } from "@/components/how-to-play/walkthrough"

const HASH = "#how-to-play"

/**
 * The How to play modal, mounted once for the whole app. It also opens when
 * the URL ends in #how-to-play, which is where the old /how-to-play page
 * redirects.
 */
export function HowToPlayDialog() {
  const open = useHowToPlay((s) => s.open)
  const setOpen = useHowToPlay((s) => s.setOpen)

  useEffect(() => {
    function syncFromHash() {
      if (window.location.hash === HASH) setOpen(true)
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [setOpen])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next && window.location.hash === HASH) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      )
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-line bg-surface-2 p-3 shadow-2xl transition-[opacity,scale] duration-300 ease-out-soft outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <Dialog.Title className="font-display text-lg font-bold sm:text-xl">
                How to play
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                One round, start to finish, in under a minute.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line hover:bg-white/10"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          {open ? (
            <Walkthrough onFinish={() => handleOpenChange(false)} />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
