import "server-only"

import * as avataaars from "@dicebear/avataaars"
import { createAvatar } from "@dicebear/core"

import { isGeneratedAvatar } from "@/lib/avatars"

export function renderAvatarSvg(seed: string) {
  if (!isGeneratedAvatar(seed)) return null
  return createAvatar(avataaars, { seed }).toString()
}
