import { describe, expect, it } from "vitest"

import { Role } from "@/generated/prisma/enums"
import { PORTAL_ROLE, ROLE_HOME, ROLE_LOGIN_PATH, SESSION_COOKIE_NAME, SESSION_LIFETIMES } from "@/lib/auth/config"
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password"
import { generateSessionToken, hashLoginId, hashSessionToken } from "@/lib/auth/token"
import { signInSchema } from "@/lib/validation/auth"

describe("session tokens", () => {
  it("generates long, unique, URL-safe tokens", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateSessionToken))
    expect(tokens.size).toBe(200)
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(token.length).toBeGreaterThanOrEqual(43) // 32 bytes, base64url
    }
  })

  it("hashes deterministically to a value that does not contain the token", () => {
    const token = generateSessionToken()
    const hash = hashSessionToken(token)
    expect(hash).toBe(hashSessionToken(token))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain(token)
    expect(hashSessionToken(generateSessionToken())).not.toBe(hash)
  })

  it("keys login IDs without case or whitespace tricks, and never reveals them", () => {
    expect(hashLoginId("ZBHS/2026/001")).toBe(hashLoginId("  zbhs/2026/001 "))
    expect(hashLoginId("a")).not.toBe(hashLoginId("b"))
    expect(hashLoginId("ZBHS/2026/001")).not.toContain("ZBHS")
  })
})

describe("passwords", () => {
  it("hashes with Argon2id and verifies only the right password", async () => {
    const hash = await hashPassword("Correct-Horse-9")
    expect(hash.startsWith("$argon2id$")).toBe(true)
    expect(hash).not.toContain("Correct-Horse-9")
    expect(await verifyPassword(hash, "Correct-Horse-9")).toBe(true)
    expect(await verifyPassword(hash, "correct-horse-9")).toBe(false)
    expect(await verifyPassword(hash, "")).toBe(false)
  })

  it("salts every hash, so equal passwords give different hashes", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"))
  })

  it("returns false (does not throw) for a malformed or empty stored hash", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false)
    expect(await verifyPassword("", "anything")).toBe(false)
  })

  it("provides a real dummy hash that never matches a typed password", async () => {
    const dummy = await getDummyHash()
    expect(dummy.startsWith("$argon2id$")).toBe(true)
    expect(await verifyPassword(dummy, "password")).toBe(false)
  })
})

describe("sign-in input validation", () => {
  const ok = { portal: "student", loginId: "ZBHS/2026/001", password: "x" }

  it("accepts valid input and trims the login ID", () => {
    const parsed = signInSchema.parse({ ...ok, loginId: "  ZBHS/2026/001  " })
    expect(parsed.loginId).toBe("ZBHS/2026/001")
  })

  it("rejects an unknown portal, empty fields and oversized input", () => {
    expect(signInSchema.safeParse({ ...ok, portal: "parent" }).success).toBe(false)
    expect(signInSchema.safeParse({ ...ok, loginId: "   " }).success).toBe(false)
    expect(signInSchema.safeParse({ ...ok, password: "" }).success).toBe(false)
    expect(signInSchema.safeParse({ ...ok, loginId: "a".repeat(101) }).success).toBe(false)
    expect(signInSchema.safeParse({ ...ok, password: "a".repeat(257) }).success).toBe(false)
    expect(signInSchema.safeParse({ ...ok, password: null }).success).toBe(false)
  })

  it("never lets the browser choose a role: only portal names are accepted", () => {
    expect(signInSchema.safeParse({ ...ok, portal: "ADMIN" }).success).toBe(false)
  })
})

describe("auth configuration", () => {
  it("defines a home page, sign-in page and lifetime for every role", () => {
    for (const role of Object.values(Role)) {
      expect(ROLE_HOME[role]).toMatch(/^\/portal\/(student|teacher|admin)$/)
      expect(ROLE_LOGIN_PATH[role]).toBe(`${ROLE_HOME[role]}/login`)
      expect(SESSION_LIFETIMES[role].absolute).toBeGreaterThan(SESSION_LIFETIMES[role].idle)
    }
  })

  it("maps each portal to exactly one distinct role", () => {
    expect(new Set(Object.values(PORTAL_ROLE)).size).toBe(3)
    expect(PORTAL_ROLE.student).toBe("STUDENT")
  })

  it("keeps administrator sessions shorter than everyone else's", () => {
    expect(SESSION_LIFETIMES.ADMIN.absolute).toBeLessThan(SESSION_LIFETIMES.STUDENT.absolute)
    expect(SESSION_LIFETIMES.ADMIN.idle).toBeLessThan(SESSION_LIFETIMES.STUDENT.idle)
  })

  it("uses a cookie name that is valid for the current environment", () => {
    expect(SESSION_COOKIE_NAME).toMatch(/^(__Host-)?zbhs_session$/)
  })
})
