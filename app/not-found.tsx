import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">That page is not here</h1>
      <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground">
        Back home
      </Link>
    </main>
  )
}
