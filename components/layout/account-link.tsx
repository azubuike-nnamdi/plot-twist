"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { AvatarImage } from "@/components/avatars/avatar-image"
import { isAvatar } from "@/lib/avatars"

type AccountUser = {
  id: string
  name: string
  username: string | null
  avatar: string | null
}

function accountAvatar(avatar: string | null) {
  return avatar && isAvatar(avatar) ? avatar : "cipher"
}

export function AccountLink({
  user,
  compact = false,
}: {
  user: AccountUser
  compact?: boolean
}) {
  const query = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await fetch("/api/me", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load your profile.")
      return (await response.json()) as AccountUser
    },
    initialData: user,
    staleTime: 30_000,
  })
  const me = query.data
  const label = me.name || me.username || "Account"

  return (
    <Link
      href="/account"
      className={
        compact
          ? "flex max-w-36 items-center gap-2 text-sm text-foreground"
          : "flex max-w-52 items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-white/10"
      }
    >
      <AvatarImage
        avatar={accountAvatar(me.avatar)}
        alt=""
        className="size-8 shrink-0"
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}
