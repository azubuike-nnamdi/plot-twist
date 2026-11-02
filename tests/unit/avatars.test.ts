import { describe, expect, it } from "vitest"

import {
  AVATAR_MAX_BYTES,
  isAvatar,
  isGeneratedAvatar,
  isUploadAvatar,
  partyChoices,
  randomAvatarSeed,
  readAvatarPhoto,
  uploadAvatarId,
  uploadOwnerId,
} from "@/lib/avatars"

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])

describe("avatars", () => {
  it("accepts a generated seed, a legacy seed, and this user's photo id", () => {
    const seed = randomAvatarSeed()
    expect(isGeneratedAvatar(seed)).toBe(true)
    expect(isAvatar("cipher")).toBe(true)
    const photo = uploadAvatarId("user_12345678", "ab12cd34")
    expect(uploadOwnerId(photo)).toBe("user_12345678")
    expect(isUploadAvatar(photo)).toBe(true)
    expect(isAvatar("not-an-avatar")).toBe(false)
    expect(isUploadAvatar("upload:otheruser:ab12cd34")).toBe(true)
    expect(uploadOwnerId("upload:otheruser:ab12cd34")).not.toBe("user_12345678")
  })

  it("keeps the current generated face as the first party choice", () => {
    const choices = partyChoices("joy")
    expect(choices[0]).toBe("joy")
    expect(new Set(choices).size).toBe(3)
  })

  it("reads png and jpeg bytes and rejects anything else or a file over 1 MB", () => {
    expect(readAvatarPhoto(PNG)?.mime).toBe("image/png")
    expect(readAvatarPhoto(JPEG)?.mime).toBe("image/jpeg")
    expect(readAvatarPhoto(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]))).toBeNull()
    expect(readAvatarPhoto(new Uint8Array(AVATAR_MAX_BYTES + 1))).toBeNull()
  })
})
