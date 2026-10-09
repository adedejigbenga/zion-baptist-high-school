import "server-only"

import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

/**
 * The ONE Prisma Client for the application (Prisma 7: PostgreSQL through the `pg` driver adapter).
 * Import it only from the data layer (src/lib/dal, src/lib/services, src/lib/auth), never from pages or components.
 *
 * - Created lazily, on the first query. Importing this module never needs a database, so `next build` works on a
 *   machine (or a CI/hosting build) that has no DATABASE_URL.
 * - In development Next.js reloads modules often; keeping the client on `globalThis` stops every reload from
 *   opening a new connection pool.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local (or set it in the host's settings).")
  }

  const adapter = new PrismaPg({
    connectionString,
    // Small pool: serverless instances each hold their own pool.
    max: 5,
    // A hosted database that scales to zero (Neon) needs a moment to wake: wait for it, but never hang forever.
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
  })

  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient()
  return globalForPrisma.prisma
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient()
    const value = Reflect.get(client, property, client)
    return typeof value === "function" ? value.bind(client) : value
  },
})
