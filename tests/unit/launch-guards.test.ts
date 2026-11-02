import { describe, expect, it } from "vitest"

import { cleanupCutoffs, GUEST_TTL_MS, RATE_LIMIT_TTL_MS } from "@/features/maintenance/cutoffs"
import { adultPackError } from "@/features/rooms/audience"
import { showReconnecting } from "@/features/rooms/freshness"

describe("adult packs", () => {
  it("asks for an 18+ confirmation before an adult pack can be saved", () => {
    expect(
      adultPackError({ cleanFilter: false, adultConfirmed: false, hasAdultPack: true })
    ).toMatch(/18\+/)
    expect(
      adultPackError({ cleanFilter: false, adultConfirmed: true, hasAdultPack: true })
    ).toBeNull()
  })

  it("keeps an adult pack out while the clean filter is on", () => {
    expect(
      adultPackError({ cleanFilter: true, adultConfirmed: true, hasAdultPack: true })
    ).toMatch(/clean filter/)
  })
})

describe("cleanup cutoffs", () => {
  it("drops guests after 14 days and rate-limit rows after a day", () => {
    const now = new Date("2026-11-02T12:00:00.000Z")
    const cutoffs = cleanupCutoffs(now)
    expect(now.getTime() - cutoffs.guestCreatedBefore.getTime()).toBe(GUEST_TTL_MS)
    expect(now.getTime() - cutoffs.bucketWindowBefore.getTime()).toBe(RATE_LIMIT_TTL_MS)
  })
})

describe("room refresh", () => {
  it("shows reconnecting on answer and guess screens after 10 seconds", () => {
    const now = 20_000
    expect(
      showReconnecting({ phase: "ANSWERING", dataUpdatedAt: 9_000, now, isError: false })
    ).toBe(true)
    expect(
      showReconnecting({ phase: "GUESSING", dataUpdatedAt: 15_000, now, isError: false })
    ).toBe(false)
    expect(
      showReconnecting({ phase: "LOBBY", dataUpdatedAt: 0, now, isError: true })
    ).toBe(false)
  })
})
