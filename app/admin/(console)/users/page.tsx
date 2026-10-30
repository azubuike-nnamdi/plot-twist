import { userRoleAction, userStatusAction } from "@/app/actions/admin"
import { searchUsers } from "@/features/admin/service"
import { requireStaffPage } from "@/lib/auth/session"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const actor = await requireStaffPage()
  const params = await searchParams
  const users = await searchUsers(params.q ?? "")
  return (
    <main className="grid gap-6">
      <h1 className="font-display text-3xl font-bold">Users</h1>
      <form>
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search email or username" className="h-11 w-full max-w-md rounded-lg border border-border bg-card px-3 text-sm" />
      </form>
      <ul className="grid gap-2">
        {users.map((user) => (
          <li key={user.id} className="rounded-[16px] border border-border bg-card px-4 py-3 text-sm">
            <p className="font-semibold">{user.username ?? user.name}</p>
            <p className="text-muted-foreground">
              {user.email} · {user.role} · {user.status}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.status === "ACTIVE" ? (
                <form action={userStatusAction.bind(null, user.id, "SUSPENDED")}>
                  <button className="rounded-lg border border-border px-3 py-2">Suspend</button>
                </form>
              ) : (
                <form action={userStatusAction.bind(null, user.id, "ACTIVE")}>
                  <button className="rounded-lg border border-border px-3 py-2">Restore</button>
                </form>
              )}
              {actor.role === "SUPER_ADMIN" && user.id !== actor.id ? (
                <>
                  <form action={userRoleAction.bind(null, user.id, "USER")}>
                    <button className="rounded-lg border border-border px-3 py-2">User</button>
                  </form>
                  <form action={userRoleAction.bind(null, user.id, "ADMIN")}>
                    <button className="rounded-lg border border-border px-3 py-2">Admin</button>
                  </form>
                  <form action={userRoleAction.bind(null, user.id, "SUPER_ADMIN")}>
                    <button className="rounded-lg border border-border px-3 py-2">Super admin</button>
                  </form>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
