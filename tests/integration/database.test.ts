import { PrismaClient } from "@prisma/client"
import { afterAll, describe, expect, it } from "vitest"

const url = process.env.DATABASE_URL_TEST
if (!url) {
  throw new Error(
    "DATABASE_URL_TEST is required for integration tests. These tests were not executed."
  )
}

const prisma = new PrismaClient({
  datasources: { db: { url } },
})

describe("postgres", () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("reads the default platform settings row", async () => {
    const settings = await prisma.platformSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    })
    expect(settings.minPlayers).toBeGreaterThanOrEqual(2)
    expect(settings.defaultRounds).toBeGreaterThan(0)
  })
})
