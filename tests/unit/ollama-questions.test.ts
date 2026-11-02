import { describe, expect, it } from "vitest"

import { parseGeneratedQuestions, questionPrompt } from "@/features/questions/ollama"

describe("ollama question drafts", () => {
  it("reads a JSON list and drops short, long, and repeated prompts", () => {
    const raw = JSON.stringify({
      questions: [
        "What is a habit this group would never admit to?",
        "What is a habit this group would never admit to?",
        "no",
        `${"a".repeat(281)}`,
        "Which snack would you defend in an argument?",
      ],
    })
    expect(parseGeneratedQuestions(raw, 8)).toEqual([
      "What is a habit this group would never admit to?",
      "Which snack would you defend in an argument?",
    ])
  })

  it("reads a fenced JSON payload", () => {
    const raw = '```json\n{"questions":["Who here is most likely to start a group chat?"]}\n```'
    expect(parseGeneratedQuestions(raw, 1)).toEqual([
      "Who here is most likely to start a group chat?",
    ])
  })

  it("asks for clean prompts unless the pack is adult", () => {
    const clean = questionPrompt({
      categoryName: "Wholesome Nonsense",
      description: "Gentle prompts.",
      count: 3,
      adult: false,
      avoid: ["Which snack?"],
    })
    expect(clean).toContain("Wholesome Nonsense")
    expect(clean).toContain("clean")
    expect(clean).toContain("Which snack?")
    const adult = questionPrompt({
      categoryName: "After Dark",
      description: "Spicy prompts.",
      count: 2,
      adult: true,
      avoid: [],
    })
    expect(adult).toContain("18+")
  })
})
