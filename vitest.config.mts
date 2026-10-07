import path from "node:path"

import { defineConfig } from "vitest/config"

import { testDatabaseUrl } from "./vitest.env.mts"

export default defineConfig({
  resolve: {
    alias: [
      // "server-only" throws outside Next.js's server build; tests are server code, so use an empty stand-in.
      { find: /^server-only$/, replacement: path.resolve("src/test/server-only-stub.ts") },
      { find: /^@\//, replacement: `${path.resolve("src")}/` },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./vitest.global-setup.mts"],
    // Every test run uses the *_test database, never the development one.
    env: { DATABASE_URL: testDatabaseUrl(), NODE_ENV: "test" },
    // The database tests share one database, so run test files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
