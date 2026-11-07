"use client"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The page could not be loaded. Try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </main>
  )
}
