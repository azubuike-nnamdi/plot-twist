export const AVATAR_MAX_BYTES = 1024 * 1024

const LEGACY_SEEDS = new Set(["cipher", "joy", "wildcard", "cosmic", "retro"])
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]

function randomHex(size: number) {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")
}

export function randomAvatarSeed() {
  return `ava_${randomHex(8)}`
}

export function randomPhotoVersion() {
  return randomHex(4)
}

export function isGeneratedAvatar(value: string) {
  return LEGACY_SEEDS.has(value) || /^ava_[a-f0-9]{16}$/.test(value)
}

export function uploadAvatarId(userId: string, version: string) {
  return `upload:${userId}:${version}`
}

export function uploadOwnerId(value: string) {
  const match = /^upload:([A-Za-z0-9_-]{8,64}):[a-f0-9]{8}$/.exec(value)
  return match?.[1] ?? null
}

export function isUploadAvatar(value: string) {
  return uploadOwnerId(value) !== null
}

export function isAvatar(value: string) {
  return isGeneratedAvatar(value) || isUploadAvatar(value)
}

export function avatarSrc(avatar: string) {
  const owner = uploadOwnerId(avatar)
  if (owner) {
    const version = avatar.split(":").at(-1) ?? "1"
    return `/api/avatars/photo/${owner}?v=${version}`
  }
  const seed = isGeneratedAvatar(avatar) ? avatar : "cipher"
  return `/api/avatars/generated/${encodeURIComponent(seed)}`
}

export function partyChoices(current?: string | null) {
  const first = current && isGeneratedAvatar(current) ? current : randomAvatarSeed()
  return [first, randomAvatarSeed(), randomAvatarSeed()]
}

export function readAvatarPhoto(bytes: Uint8Array) {
  if (bytes.byteLength < PNG_SIGNATURE.length || bytes.byteLength > AVATAR_MAX_BYTES) return null
  const isPng = PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  const isJpeg = JPEG_SIGNATURE.every((value, index) => bytes[index] === value)
  if (!isPng && !isJpeg) return null
  return { mime: isPng ? "image/png" : "image/jpeg", bytes } as const
}
