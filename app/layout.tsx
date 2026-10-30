import type { Metadata } from "next"
import { JetBrains_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google"

import { Providers } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import { env } from "@/lib/env"
import { cn } from "@/lib/utils"
import "./globals.css"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display-family",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const description =
  "Drop secret answers. Guess the author. A social party game for private rooms."

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "PlotTwist",
    template: "%s | PlotTwist",
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "PlotTwist",
    title: "PlotTwist",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "PlotTwist",
    description,
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(sans.variable, display.variable, mono.variable, "font-sans")}
    >
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
