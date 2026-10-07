import { readFileSync } from "node:fs"

/**
 * Work out which database the tests use. Tests NEVER touch the development database: they run against a
 * sibling database whose name ends in "_test", created and migrated automatically by vitest.global-setup.ts.
 */
function readDevelopmentUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const text = readFileSync(".env.local", "utf8")
  const match = text.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?\s*$/m)
  if (!match) throw new Error("DATABASE_URL not found in the environment or .env.local")
  return match[1]
}

export function developmentDatabaseUrl(): string {
  return readDevelopmentUrl()
}

export function testDatabaseName(): string {
  const name = decodeURIComponent(new URL(readDevelopmentUrl()).pathname.slice(1))
  return name.endsWith("_test") ? name : `${name}_test`
}

export function testDatabaseUrl(): string {
  const url = new URL(readDevelopmentUrl())
  url.pathname = `/${testDatabaseName()}`
  return url.toString()
}
