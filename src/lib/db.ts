import "server-only"

import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

/**
 * The ONE Prisma Client for the application (Prisma 7: PostgreSQL through the `pg` driver adapter).
 * Import it only from the data layer (src/lib/dal, src/lib/services), never from pages or components.
 *
 * In development Next.js reloads modules often; keeping the client on `globalThis` stops every reload from
 * opening a new connection pool.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.")
  }

  const adapter = new PrismaPg({
    connectionString,
    // Small pool: serverless instances each hold their own pool.
    max: 5,
  })

  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> }

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}
