import type { Metadata } from "next"
import Link from "next/link"

import { requireStaffPage } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

const links = [
  ["Overview", "/admin"],
  ["Questions", "/admin/questions"],
  ["Categories", "/admin/categories"],
  ["Users", "/admin/users"],
  ["Rooms", "/admin/rooms"],
  ["Reports", "/admin/reports"],
  ["Settings", "/admin/settings"],
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireStaffPage()
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b border-border bg-[#1b1730] p-4 md:border-r md:border-b-0">
        <Link href="/" className="font-display text-xl font-bold">
          PlotTwist
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">{user.username ?? user.email}</p>
        <nav className="mt-4 flex gap-1 overflow-x-auto text-sm md:grid md:overflow-visible">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="shrink-0 rounded-lg px-3 py-2 hover:bg-[#302d41]">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 p-4 sm:p-6">{children}</div>
    </div>
  )
}
