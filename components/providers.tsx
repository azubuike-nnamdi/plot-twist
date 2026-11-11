"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import { SoundProvider } from "@/components/audio/sound-provider"
import { HowToPlayDialog } from "@/components/how-to-play/how-to-play-dialog"

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: true, retry: 1 },
        },
      })
  )
  return (
    <QueryClientProvider client={client}>
      {children}
      <HowToPlayDialog />
      <SoundProvider />
    </QueryClientProvider>
  )
}
