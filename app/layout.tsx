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

const siteDescription =
  "Drop secret answers. Guess the author. A social party game for private rooms."

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "PlotTwist",
    template: "%s | PlotTwist",
  },
  description: siteDescription,
  keywords: [
    "PlotTwist",
    "party game",
    "anonymous answers",
    "guess the author",
    "private rooms",
    "Next.js",
  ],
  authors: [{ name: "Nnamdi Azubuike", url: "https://www.nnamdiazubuike.dev" }],
  creator: "Nnamdi Azubuike",
  publisher: "PlotTwist",
  robots: {
    index: true,
    follow: true,
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "PlotTwist",
    description: siteDescription,
    url: "/",
    siteName: "PlotTwist",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PlotTwist. Drop secret answers. Guess the author.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlotTwist",
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  verification: {
    google: "ZnbKzL4y7SZDMOuyp5S-FGRdAlkQ_xE6rzyx8jWpXgA",
  },
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
