import Link from "next/link"

const links = [
  ["/how-to-play", "How to Play"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/contact", "Contact"],
]

export function SiteFooter() {
  return (
    <footer className="border-t border-[#302d41] bg-[#1b1730] px-4 py-6 text-sm text-[#afadba]">
      <div className="mx-auto max-w-6xl sm:px-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PlotTwist</p>
          <nav className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:justify-end sm:gap-x-4">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center rounded-lg px-2 sm:min-h-0 sm:px-0"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
