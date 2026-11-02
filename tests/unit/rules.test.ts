import { describe, expect, it } from "vitest"

import { answerError } from "@/features/answers/rules"
import { guessError } from "@/features/guesses/rules"
import { formatRoomCode, parseRoomCode } from "@/features/rooms/codes"
import { presentAnswer } from "@/features/rooms/present"
import { choosePrompt } from "@/features/rooms/prompts"
import {
  chooseNextHost,
  canTransitionRoom,
  canTransitionRound,
  phaseNeedsAdvance,
} from "@/features/rooms/transitions"
import { buildRoomView, type ViewInput } from "@/features/rooms/view"
import { guessesToScore, pointsForGuess } from "@/features/scoring/score"
import { readServerEnv } from "@/lib/env-schema"
import {
  ANSWER_TIMERS,
  ROUND_CHOICES,
  estimateSessionMinutes,
  guessTimerFor,
} from "@/lib/game/options"
import { safeNextPath } from "@/lib/security/next-path"

const env = {
  DATABASE_URL: "postgresql://localhost/plottwist",
  BETTER_AUTH_SECRET: "12345678901234567890123456789012",
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  MAILTRAP_API_TOKEN: "token",
  MAILTRAP_FROM_EMAIL: "play@example.com",
}

describe("scoring", () => {
  it("awards 100 for a correct guess and 0 otherwise", () => {
    expect(pointsForGuess(true)).toBe(100)
    expect(pointsForGuess(false)).toBe(0)
  })

  it("scores a guess once", () => {
    const scored = guessesToScore([
      { id: "new", isCorrect: true, pointsAwarded: null },
      { id: "done", isCorrect: false, pointsAwarded: 0 },
    ])
    expect(scored).toEqual([
      { id: "new", isCorrect: true, pointsAwarded: 100 },
    ])
  })
})

describe("transitions and host", () => {
  it("allows only the legal room and round steps", () => {
    expect(canTransitionRoom("WAITING", "IN_PROGRESS")).toBe(true)
    expect(canTransitionRoom("COMPLETED", "IN_PROGRESS")).toBe(false)
    expect(canTransitionRound("ANSWERING", "GUESSING")).toBe(true)
    expect(canTransitionRound("ANSWERING", "REVEAL")).toBe(false)
  })

  it("promotes the earliest active player when the host is stale", () => {
    const now = 200_000
    const next = chooseNextHost(
      [
        { userId: "host", joinedAt: 1, lastSeenAt: now - 120_000, status: "JOINED" },
        { userId: "early", joinedAt: 2, lastSeenAt: now, status: "READY" },
        { userId: "late", joinedAt: 3, lastSeenAt: now, status: "JOINED" },
      ],
      "host",
      now
    )
    expect(next).toBe("early")
  })

  it("keeps a host who is still active", () => {
    const now = 10_000
    expect(
      chooseNextHost(
        [
          { userId: "host", joinedAt: 1, lastSeenAt: now, status: "JOINED" },
          { userId: "other", joinedAt: 2, lastSeenAt: now, status: "JOINED" },
        ],
        "host",
        now
      )
    ).toBe("host")
  })

  it("does not hand the room to a guest", () => {
    const now = 200_000
    expect(
      chooseNextHost(
        [
          { userId: "host", joinedAt: 1, lastSeenAt: now - 120_000, status: "LEFT" },
          { userId: "guest", joinedAt: 2, lastSeenAt: now, status: "JOINED", canHost: false },
          { userId: "member", joinedAt: 3, lastSeenAt: now, status: "JOINED", canHost: true },
        ],
        "host",
        now
      )
    ).toBe("member")
  })

  it("closes the host seat when a departed host has only guests left", () => {
    const now = 200_000
    expect(
      chooseNextHost(
        [
          { userId: "host", joinedAt: 1, lastSeenAt: now, status: "LEFT" },
          { userId: "guest", joinedAt: 2, lastSeenAt: now, status: "READY", canHost: false },
        ],
        "host",
        now
      )
    ).toBeNull()
  })

  it("keeps a live host when the only other players are guests", () => {
    const now = 200_000
    expect(
      chooseNextHost(
        [
          { userId: "host", joinedAt: 1, lastSeenAt: now - 120_000, status: "JOINED" },
          { userId: "guest", joinedAt: 2, lastSeenAt: now, status: "JOINED", canHost: false },
        ],
        "host",
        now
      )
    ).toBe("host")
  })
})

describe("phase advance", () => {
  const players = ["a", "b"]
  const base = {
    status: "IN_PROGRESS" as const,
    roundStatus: "ANSWERING" as const,
    deadlineAt: 100,
    now: 50,
    activePlayerIds: players,
    answers: [] as { playerId: string; guesses: { guesserId: string }[] }[],
  }

  it("waits while answers are still open", () => {
    expect(phaseNeedsAdvance(base)).toBe(false)
  })

  it("advances when the answer deadline has passed", () => {
    expect(phaseNeedsAdvance({ ...base, now: 100 })).toBe(true)
  })

  it("advances when every active player has answered", () => {
    expect(
      phaseNeedsAdvance({
        ...base,
        answers: [
          { playerId: "a", guesses: [] },
          { playerId: "b", guesses: [] },
        ],
      })
    ).toBe(true)
  })

  it("advances guessing when every other answer has a vote", () => {
    expect(
      phaseNeedsAdvance({
        ...base,
        roundStatus: "GUESSING",
        answers: [
          { playerId: "a", guesses: [{ guesserId: "b" }] },
          { playerId: "b", guesses: [{ guesserId: "a" }] },
        ],
      })
    ).toBe(true)
  })

  it("leaves a waiting room alone", () => {
    expect(phaseNeedsAdvance({ ...base, status: "WAITING" })).toBe(false)
  })
})

describe("answers and guesses", () => {
  it("rejects a late or empty answer", () => {
    expect(
      answerError({
        phase: "ANSWERING",
        isActiveMember: true,
        alreadySubmitted: false,
        text: "  ",
        now: 1,
        deadline: 2,
      })
    ).toMatch(/Write an answer/)
    expect(
      answerError({
        phase: "GUESSING",
        isActiveMember: true,
        alreadySubmitted: false,
        text: "hello",
        now: 1,
        deadline: 2,
      })
    ).toMatch(/closed/)
  })

  it("rejects guessing yourself or your own answer", () => {
    const base = {
      phase: "GUESSING" as const,
      isActiveMember: true,
      guesserPlayerId: "me",
      authorPlayerId: "them",
      guessedPlayerId: "them",
      activePlayerIds: ["me", "them"],
      alreadyGuessed: false,
      now: 1,
      deadline: 5,
    }
    expect(guessError({ ...base, guessedPlayerId: "me" })).toMatch(/yourself/)
    expect(guessError({ ...base, authorPlayerId: "me" })).toMatch(/own answer/)
    expect(guessError(base)).toBeNull()
  })
})

describe("anonymity", () => {
  it("omits the author until reveal", () => {
    const hidden = presentAnswer({
      id: "a",
      text: "secret",
      phase: "GUESSING",
      removed: false,
      author: { playerId: "p", displayName: "Ada" },
    })
    expect(hidden).toEqual({ id: "a", text: "secret" })
    expect(hidden).not.toHaveProperty("author")
  })

  it("hides authors and the viewer's own answer while guessing", () => {
    const input: ViewInput = {
      now: "2026-10-30T12:00:00.000Z",
      code: "ABCDEFGH",
      name: "Night",
      status: "IN_PROGRESS",
      hostId: "user-a",
      viewerUserId: "user-a",
      maxPlayers: 8,
      totalRounds: 3,
      currentRound: 1,
      answerSeconds: 60,
      guessingSeconds: 45,
      categories: ["Wholesome Nonsense"],
      players: [
        {
          id: "player-a",
          userId: "user-a",
          displayName: "Ada",
          avatar: "cipher",
          score: 0,
          status: "JOINED",
          joinedAt: "2026-10-30T11:00:00.000Z",
        },
        {
          id: "player-b",
          userId: "user-b",
          displayName: "Bea",
          avatar: "joy",
          score: 0,
          status: "JOINED",
          joinedAt: "2026-10-30T11:01:00.000Z",
        },
      ],
      round: {
        status: "GUESSING",
        deadlineAt: "2026-10-30T12:01:00.000Z",
        question: "Which snack?",
        categoryName: "Wholesome Nonsense",
        askedBy: "Bea",
        reactions: [],
        answers: [
          {
            id: "own",
            playerId: "player-a",
            text: "mine",
            removed: false,
            sortKey: 1,
            guesses: [],
          },
          {
            id: "other",
            playerId: "player-b",
            text: "theirs",
            removed: false,
            sortKey: 2,
            guesses: [],
          },
        ],
      },
      history: [],
    }
    const view = buildRoomView(input)
    expect(view.players.find((player) => player.isYou)?.lockedIn).toBe(false)
    expect(view.answers.map((answer) => answer.id)).toEqual(["other"])
    expect(view.answers[0]).not.toHaveProperty("author")
    expect(view.askedBy).toBeNull()
    expect(JSON.stringify(view.answers)).not.toContain("player-b")
    expect(JSON.stringify(view.answers)).not.toContain("Bea")
    expect(view.players.map((player) => player.displayName)).toContain("Bea")
  })
})

describe("prompt draw", () => {
  const first = () => 0

  it("uses a player question before any pack card", () => {
    expect(
      choosePrompt(
        { playerPromptIds: ["asked"], unseenPackIds: ["fresh"], seenPackIds: ["old"] },
        first
      )
    ).toEqual({ kind: "player", id: "asked" })
  })

  it("uses an unseen pack card when nobody asked a question", () => {
    expect(
      choosePrompt(
        { playerPromptIds: [], unseenPackIds: ["fresh"], seenPackIds: ["old"] },
        first
      )
    ).toEqual({ kind: "pack", id: "fresh", isReplay: false })
  })

  it("replays a pack card only after the unseen pile is empty", () => {
    expect(
      choosePrompt({ playerPromptIds: [], unseenPackIds: [], seenPackIds: ["old"] }, first)
    ).toEqual({ kind: "pack", id: "old", isReplay: true })
  })
})

describe("session length", () => {
  it("keeps every setup at or under 10 minutes", () => {
    for (const rounds of ROUND_CHOICES) {
      for (const answerTimer of ANSWER_TIMERS) {
        const seconds = rounds * (answerTimer + guessTimerFor(answerTimer))
        expect(seconds).toBeLessThanOrEqual(10 * 60)
        expect(estimateSessionMinutes(rounds, answerTimer)).toBeLessThanOrEqual(10)
      }
    }
  })

  it("tops out at 10 minutes for the longest match", () => {
    expect(estimateSessionMinutes(8, 45)).toBe(10)
  })
})

describe("codes and config", () => {
  it("formats and parses an invite code", () => {
    expect(formatRoomCode("ABCDEFGH")).toBe("TWST-ABCDEFGH")
    expect(parseRoomCode("twst-abcdefgh")).toBe("ABCDEFGH")
  })

  it("rejects a redirect that leaves the site", () => {
    expect(safeNextPath("https://evil.test")).toBe("/")
    expect(safeNextPath("/room/ABCDEFGH")).toBe("/room/ABCDEFGH")
  })

  it("names the missing configuration", () => {
    expect(() => readServerEnv({})).toThrow(/Missing or invalid configuration/)
    expect(readServerEnv(env).MAILTRAP_FROM_EMAIL).toBe("play@example.com")
  })
})
