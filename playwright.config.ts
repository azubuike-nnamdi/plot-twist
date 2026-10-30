import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.DATABASE_URL
    ? {
        command: "pnpm exec next dev --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
})
