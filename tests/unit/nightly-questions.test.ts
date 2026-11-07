import { describe, expect, it } from "vitest"

import { fingerprint, freshQuestions, nextMidnightUtc } from "@/features/questions/batch"
import { anglesFor, questionPrompt } from "@/features/questions/ollama"
import { questionIsSafe, questionKey } from "@/features/questions/safety"

describe("question safety filter", () => {
  it("passes ordinary party questions", () => {
    expect(questionIsSafe("What snack would you defend in court?", false)).toBe(true)
  })

  it("requires a real question of sensible length", () => {
    expect(questionIsSafe("Tell us a secret.", false)).toBe(false)
    expect(questionIsSafe("Why?", false)).toBe(false)
    expect(questionIsSafe(`${"a".repeat(170)}?`, false)).toBe(false)
  })

  it("keeps clean packs free of sex, drugs, and swearing", () => {
    expect(questionIsSafe("What is your wildest hookup story?", false)).toBe(false)
    expect(questionIsSafe("When were you most drunk at a wedding?", false)).toBe(false)
    expect(questionIsSafe("What the hell, who broke the damn printer?", false)).toBe(false)
  })

  it("lets 18+ packs be cheeky but never crosses hard lines", () => {
    expect(questionIsSafe("What is your wildest hookup story?", true)).toBe(true)
    expect(questionIsSafe("Who would you date from your teen years at school?", true)).toBe(false)
    expect(questionIsSafe("Which religion would you start?", true)).toBe(false)
    expect(questionIsSafe("Have you ever thought about suicide?", true)).toBe(false)
    expect(questionIsSafe("What is at https://example.com?", true)).toBe(false)
  })
})

describe("nightly batch", () => {
  it("treats the same question with different punctuation as a repeat", () => {
    expect(questionKey("What's your  WORST habit?")).toBe(questionKey("whats your worst habit"))
    expect(fingerprint("What's your worst habit?")).toBe(fingerprint("Whats your worst habit"))
  })

  it("keeps only safe, unseen questions from an Ollama reply", () => {
    const seen = new Set([fingerprint("What did you eat for breakfast?")])
    const raw = JSON.stringify({
      questions: [
        "What did you eat for breakfast?",
        "Which song do you secretly know every word to?",
        "Which song do you secretly know every word to?",
        "What is your wildest hookup story?",
        "No question mark here",
        "What chore would you pay anything to skip?",
      ],
    })
    expect(freshQuestions({ raw, adult: false, seen, limit: 10 })).toEqual([
      "Which song do you secretly know every word to?",
      "What chore would you pay anything to skip?",
    ])
  })

  it("stops at the limit", () => {
    const raw = JSON.stringify({ questions: ["Which app do you open first?", "What smell takes you back?"] })
    expect(freshQuestions({ raw, adult: false, seen: new Set(), limit: 1 })).toHaveLength(1)
  })

  it("expires a batch at the next UTC midnight", () => {
    expect(nextMidnightUtc(new Date("2026-11-06T00:00:05Z")).toISOString()).toBe(
      "2026-11-07T00:00:00.000Z"
    )
    expect(nextMidnightUtc(new Date("2026-11-06T23:59:59Z")).toISOString()).toBe(
      "2026-11-07T00:00:00.000Z"
    )
  })

  it("rotates themes from night to night", () => {
    const today = anglesFor(new Date("2026-11-06T00:00:00Z"))
    const tomorrow = anglesFor(new Date("2026-11-07T00:00:00Z"))
    expect(today).toHaveLength(3)
    expect(today).not.toEqual(tomorrow)
  })

  it("tells the model which themes to use and what to avoid", () => {
    const prompt = questionPrompt({
      categoryName: "Wholesome Nonsense",
      description: "Goofy banter.",
      count: 10,
      adult: false,
      avoid: ["What is your comfort food?"],
      angles: ["pets and animals"],
    })
    expect(prompt).toContain("pets and animals")
    expect(prompt).toContain("What is your comfort food?")
    expect(prompt).toContain("No sex, drugs, alcohol")
  })
})
