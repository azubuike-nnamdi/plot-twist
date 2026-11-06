import { describe, expect, it } from "vitest"

import {
  canReuseView,
  parseKnownVersion,
  pollIntervalFor,
  presenceIsStale,
  PRESENCE_WRITE_MS,
  PUSH_SAFETY_POLL_MS,
} from "@/features/rooms/poll"
import { roomChannel, roomCodeFromChannel } from "@/lib/realtime/channels"
import { channelAuth, isSocketId, signedEventQuery } from "@/lib/realtime/sign"
import { clientIpFrom } from "@/lib/security/client-ip"

const base = {
  knownVersion: 7,
  version: 7,
  status: "IN_PROGRESS",
  roundStatus: "ANSWERING",
  deadlineAt: 10_000,
  now: 5_000,
  hostChanges: false,
}

describe("room poll reuse", () => {
  it("reuses the client's view when nothing was written and no timer is due", () => {
    expect(canReuseView(base)).toBe(true)
  })

  it("rebuilds when the version moved or the client has no copy", () => {
    expect(canReuseView({ ...base, version: 8 })).toBe(false)
    expect(canReuseView({ ...base, knownVersion: null })).toBe(false)
  })

  it("rebuilds once the answer or guess timer runs out so the round advances", () => {
    expect(canReuseView({ ...base, now: 10_000 })).toBe(false)
    expect(canReuseView({ ...base, roundStatus: "GUESSING", now: 12_000 })).toBe(false)
  })

  it("ignores deadlines outside timed phases", () => {
    expect(canReuseView({ ...base, roundStatus: "REVEAL", now: 12_000 })).toBe(true)
    expect(canReuseView({ ...base, status: "WAITING", now: 12_000 })).toBe(true)
  })

  it("rebuilds when the host seat needs to move", () => {
    expect(canReuseView({ ...base, hostChanges: true })).toBe(false)
  })
})

describe("poll inputs", () => {
  it("accepts only plain non-negative integers as a version", () => {
    expect(parseKnownVersion("12")).toBe(12)
    expect(parseKnownVersion(null)).toBeNull()
    expect(parseKnownVersion("-1")).toBeNull()
    expect(parseKnownVersion("1e3")).toBeNull()
    expect(parseKnownVersion("abc")).toBeNull()
  })

  it("writes presence at most every 15 seconds", () => {
    expect(presenceIsStale(0, PRESENCE_WRITE_MS - 1)).toBe(false)
    expect(presenceIsStale(0, PRESENCE_WRITE_MS)).toBe(true)
  })

  it("polls every second during play and backs off on idle screens", () => {
    expect(pollIntervalFor("ANSWERING")).toBe(1_000)
    expect(pollIntervalFor("GUESSING")).toBe(1_000)
    expect(pollIntervalFor("REVEAL")).toBe(1_000)
    expect(pollIntervalFor("LOBBY")).toBe(1_500)
    expect(pollIntervalFor("RESULTS")).toBe(5_000)
  })
})

describe("client ip", () => {
  const from = (values: Record<string, string>) =>
    clientIpFrom({ get: (name) => values[name] ?? null })

  it("prefers the proxy-set x-real-ip", () => {
    expect(from({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" })).toBe("203.0.113.9")
  })

  it("never trusts a client-supplied first hop in x-forwarded-for", () => {
    expect(from({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" })).toBe("203.0.113.9")
  })

  it("rejects junk and falls back to unknown", () => {
    expect(from({ "x-real-ip": "<script>" })).toBe("unknown")
    expect(from({})).toBe("unknown")
  })
})

describe("push signals", () => {
  it("polls only as a safety net while push is connected", () => {
    expect(pollIntervalFor("ANSWERING", true)).toBe(PUSH_SAFETY_POLL_MS)
    expect(pollIntervalFor("LOBBY", true)).toBe(PUSH_SAFETY_POLL_MS)
  })

  it("maps room codes to private channels and back", () => {
    expect(roomChannel("ABCD2345")).toBe("private-room-ABCD2345")
    expect(roomCodeFromChannel("private-room-ABCD2345")).toBe("ABCD2345")
    expect(roomCodeFromChannel("presence-room-ABCD2345")).toBeNull()
    expect(roomCodeFromChannel("private-room-abcd")).toBeNull()
  })

  it("signs channel subscriptions like Pusher expects", () => {
    // Example from https://pusher.com/docs/channels/library_auth_reference/auth-signatures/
    expect(
      channelAuth({
        key: "278d425bdf160c739803",
        secret: "7ad3773142a6692b25b8",
        socketId: "1234.1234",
        channel: "private-foobar",
      })
    ).toEqual({
      auth: "278d425bdf160c739803:58df8b0c36d6982b82c3ecf6b4662e34fe8c25bba48f5369f135bf843651c3a4",
    })
    expect(isSocketId("1234.1234")).toBe(true)
    expect(isSocketId("1234.1234:evil")).toBe(false)
  })

  it("signs REST events with sorted params and a body hash", () => {
    const signed = signedEventQuery({
      appId: "3",
      key: "278d425bdf160c739803",
      secret: "7ad3773142a6692b25b8",
      body: '{"name":"foo","channels":["project-3"],"data":"{\\"some\\":\\"data\\"}"}',
      timestamp: 1353088179,
    })
    expect(signed.path).toBe("/apps/3/events")
    expect(signed.query).toBe(
      "auth_key=278d425bdf160c739803&auth_timestamp=1353088179&auth_version=1.0&body_md5=ec365a775a4cd0599faeb73354201b6f&auth_signature=da454824c97ba181a32ccc17a72625ba02771f50b50e1e7430e47a1f3f457e6c"
    )
  })
})
