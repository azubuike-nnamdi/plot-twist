import { describe, expect, it } from "vitest"

import { formatClock, nextClockAnchor, remainingMs } from "@/features/rooms/clock"

describe("room clock", () => {
  it("shows a 20 second prompt as 20s, not 20 minutes", () => {
    expect(formatClock(20_000)).toBe("20s")
    expect(formatClock(10_000)).toBe("10s")
    expect(formatClock(60_000)).toBe("1:00")
  })

  it("counts down on the device between room refreshes", () => {
    const deadline = 20_000
    const anchor = nextClockAnchor({
      previous: null,
      deadline,
      serverNow: 0,
      clientNow: 0,
    })
    expect(anchor).not.toBeNull()
    expect(formatClock(remainingMs(anchor!, 0))).toBe("20s")
    expect(formatClock(remainingMs(anchor!, 1_000))).toBe("19s")
    const polled = nextClockAnchor({
      previous: anchor,
      deadline,
      serverNow: 4_000,
      clientNow: 4_000,
    })
    expect(polled).toBe(anchor)
    expect(formatClock(remainingMs(polled!, 4_000))).toBe("16s")
  })

  it("follows a new deadline when the phase changes", () => {
    const answering = nextClockAnchor({
      previous: null,
      deadline: 20_000,
      serverNow: 0,
      clientNow: 0,
    })
    const guessing = nextClockAnchor({
      previous: answering,
      deadline: 25_000,
      serverNow: 10_000,
      clientNow: 10_000,
    })
    expect(formatClock(remainingMs(guessing!, 10_000))).toBe("15s")
  })
})
