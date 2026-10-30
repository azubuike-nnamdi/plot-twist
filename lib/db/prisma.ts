import "server-only"

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  prismaUrl?: string
}

function databaseUrl() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  if (/[?&]connect_timeout=/.test(url)) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}connect_timeout=30`
}

function createPrismaClient(url: string) {
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

function getPrismaClient() {
  const url = databaseUrl()
  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== url) {
    void globalForPrisma.prisma?.$disconnect()
    globalForPrisma.prisma = createPrismaClient(url)
    globalForPrisma.prismaUrl = url
  }
  return globalForPrisma.prisma
}

export const prisma = getPrismaClient()

export type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]
