import { CloseRoomForm } from "@/components/admin/staff-forms"
import { formatRoomCode } from "@/features/rooms/codes"
import { listRooms } from "@/features/admin/service"

export default async function AdminRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const rooms = await listRooms(params.status ?? "")
  return (
    <main className="grid gap-6">
      <h1 className="font-display text-3xl font-bold">Rooms</h1>
      <form className="flex gap-2">
        <select name="status" defaultValue={params.status ?? ""} className="h-11 rounded-lg border border-border bg-card px-3 text-sm">
          <option value="">All</option>
          <option value="WAITING">Waiting</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CLOSED">Closed</option>
        </select>
        <button className="h-11 rounded-lg border border-border bg-card px-4 text-sm">Filter</button>
      </form>
      <section className="rounded-[20px] border border-border bg-card p-5">
        <CloseRoomForm />
      </section>
      <ul className="grid gap-2">
        {rooms.map((room) => (
          <li key={room.id} className="rounded-[16px] border border-border bg-card px-4 py-3 text-sm">
            <p className="font-semibold">{room.name}</p>
            <p className="font-mono text-xs">{formatRoomCode(room.roomCode)}</p>
            <p className="text-muted-foreground">
              {room.status} · {room._count.players} players · host {room.host.username ?? room.host.email}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}
