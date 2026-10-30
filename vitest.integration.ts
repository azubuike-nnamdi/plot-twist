import path from "node:path"
import { defineConfig } from "vitest/config"

if (!process.env.DATABASE_URL_TEST) {
  throw new Error(
    "DATABASE_URL_TEST is required for integration tests. Point it at a migrated Postgres database. These tests were not executed."
  )
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      "server-only": path.resolve(
        import.meta.dirname,
        "node_modules/server-only/empty.js"
      ),
    },
  },
})
