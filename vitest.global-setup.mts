import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

import pg from "pg"

import { developmentDatabaseUrl, testDatabaseName, testDatabaseUrl } from "./vitest.env.mts"

/**
 * Runs once before all tests: make sure the *_test database exists and has the latest migrations.
 * (The development role has CREATEDB, so it can create the sibling database.)
 */
export default async function setup() {
  const name = testDatabaseName()
  const url = new URL(testDatabaseUrl())

  // Safety rails: never prepare, migrate or later truncate anything except a local database named *_test.
  if (!/^[a-z0-9_]+_test$/.test(name)) throw new Error(`Refusing: "${name}" is not a safe test database name.`)
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error("Refusing: tests only run against a local database.")
  }

  const admin = new pg.Client({ connectionString: developmentDatabaseUrl() })
  await admin.connect()
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name])
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${name}"`)
  } finally {
    await admin.end()
  }

  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js")
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    encoding: "utf8",
  })
  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy failed for the test database:\n${result.stdout}\n${result.stderr}`)
  }
}
