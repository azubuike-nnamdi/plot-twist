"use client"

import Image from "next/image"
import { useState } from "react"

import { avatarSrc } from "@/lib/avatars"
import { cn } from "@/lib/utils"

export function AvatarImage({
  avatar,
  className,
  alt = "",
}: {
  avatar: string
  className?: string
  alt?: string
}) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  const src = failedAvatar === avatar ? avatarSrc("cipher") : avatarSrc(avatar)

  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-full bg-[#221c33]", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes="64px"
        className="object-cover"
        onError={() => {
          if (avatar !== "cipher") setFailedAvatar(avatar)
        }}
      />
    </span>
  )
}
