import type { Prisma } from "@prisma/client"
import type { Metadata } from "next"

import { PasswordForm, ProfileForm, DeleteForm } from "@/components/account/account-forms"
import { ClaimAccountForm } from "@/components/forms/claim-account-form"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { formatRoomCode } from "@/features/rooms/codes"
import { requirePageUser } from "@/lib/auth/session"
import { prisma } from "@/lib/db/prisma"

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
}

type PlayedRoom = Prisma.RoomPlayerGetPayload<{
  include: {
    room: { select: { name: true; roomCode: true; status: true; createdAt: true } }
  }
}>

export default async function AccountPage() {
  const user = await requirePageUser("/account")
  const history: PlayedRoom[] = await prisma.roomPlayer.findMany({
    where: { userId: user.id },
    include: { room: { select: { name: true, roomCode: true, status: true, createdAt: true } } },
    orderBy: { joinedAt: "desc" },
    take: 20,
  })
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10">
        <h1 className="font-display text-4xl font-bold">Your account</h1>
        {user.isAnonymous ? (
          <section className="rounded-[20px] border border-border bg-card p-6">
            <h2 className="text-xl font-semibold">Keep this name and host next time</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save an email and password on this same seat. Rooms you already joined stay attached.
            </p>
            <ClaimAccountForm defaultName={user.name === "Anonymous" ? "" : user.name} />
          </section>
        ) : (
          <>
            <section className="rounded-[20px] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-4">
                <ProfileForm name={user.name} avatar={user.avatar ?? "cipher"} />
              </div>
            </section>
            <section className="rounded-[20px] border border-border bg-card p-6">
              <h2 className="text-xl font-semibold">Password</h2>
              <div className="mt-4">
                <PasswordForm />
              </div>
            </section>
          </>
        )}
        <section className="rounded-[20px] border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Recent rooms</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You have not joined a room yet.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between rounded-[16px] border border-border px-4 py-3 text-sm">
                  <span>
                    {entry.room.name}
                    <span className="mt-1 block font-mono text-xs text-muted-foreground">
                      {formatRoomCode(entry.room.roomCode)}
                    </span>
                  </span>
                  <span>
                    {entry.score} pts · {entry.room.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        {user.isAnonymous ? null : (
        <section className="rounded-[20px] border border-red-500/30 bg-card p-6">
          <h2 className="text-xl font-semibold">Delete account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This signs you out and retires the account. Past room scores stay attached to a deleted player name.
          </p>
          <div className="mt-4">
            <DeleteForm />
          </div>
        </section>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
