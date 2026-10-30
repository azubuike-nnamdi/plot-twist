import { dashboardStats } from "@/features/admin/service"

export default async function AdminHomePage() {
  const stats = await dashboardStats()
  const cards = [
    ["Accounts", stats.users],
    ["Rooms", stats.rooms],
    ["Live rooms", stats.activeRooms],
    ["Completed", stats.completed],
    ["Open reports", stats.reports],
  ]
  return (
    <main>
      <h1 className="font-display text-3xl font-bold">Overview</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-[20px] border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-display mt-2 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </div>
      <section className="mt-6 rounded-[20px] border border-border bg-card p-5">
        <h2 className="font-semibold">Recent activity</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {stats.activity.length === 0 ? <li>No staff actions yet.</li> : null}
          {stats.activity.map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3">
              <span>
                {entry.action} · {entry.actor?.username ?? entry.actor?.email ?? "system"}
              </span>
              <time className="text-muted-foreground">{entry.createdAt.toISOString()}</time>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
