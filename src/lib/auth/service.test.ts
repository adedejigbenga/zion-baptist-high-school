import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/lib/db"
import { AUTH_AUDIT, LAST_USED_REFRESH_SECONDS, RATE_LIMIT, SESSION_LIFETIMES } from "@/lib/auth/config"
import { hash } from "@node-rs/argon2"
import {
  authenticate,
  revokeAllSessionsForUser,
  revokeSessionByToken,
  validateSessionToken,
} from "@/lib/auth/service"
import { hashLoginId, hashSessionToken } from "@/lib/auth/token"
import { createUser, resetDatabase } from "@/test/helpers"

const PASSWORD = "Correct-Horse-9"
const IP = "203.0.113.7"
const secondsAgo = (s: number) => new Date(Date.now() - s * 1000)

let passwordHash: string

beforeAll(async () => {
  // Fixture accounts use a deliberately cheap Argon2id hash so the suite is fast; the production cost is covered in unit.test.ts.
  passwordHash = await hash(PASSWORD, { memoryCost: 1024, timeCost: 1, parallelism: 1 })
})
beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

function signIn(loginId: string, password = PASSWORD, portal: "student" | "teacher" | "admin" = "student", ip: string | null = IP) {
  return authenticate({ portal, loginId, password, ip })
}

async function signedInStudent() {
  await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash })
  const result = await signIn("ZBHS/T/1")
  if (!result.ok) throw new Error("test setup: sign-in should have succeeded")
  return result
}

describe("authenticate: success", () => {
  it("signs a student in and stores only a hash of the session token", async () => {
    const user = await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash })
    const result = await signIn("ZBHS/T/1")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.user.role).toBe("STUDENT")
    expect(result.user.id).toBe(user.id)
    expect(result.user.studentId).toBeTruthy()
    expect(result.user.teacherId).toBeNull()
    expect(result.token.length).toBeGreaterThanOrEqual(43)

    const sessions = await db.session.findMany()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].tokenHash).toBe(hashSessionToken(result.token))
    expect(JSON.stringify(sessions)).not.toContain(result.token)

    const lifetimeMs = sessions[0].expiresAt.getTime() - Date.now()
    expect(lifetimeMs).toBeGreaterThan((SESSION_LIFETIMES.STUDENT.absolute - 60) * 1000)
    expect(lifetimeMs).toBeLessThanOrEqual(SESSION_LIFETIMES.STUDENT.absolute * 1000)

    expect(await db.auditLog.count({ where: { action: AUTH_AUDIT.loginSuccess, userId: user.id } })).toBe(1)
  })

  it("ignores spaces around the login ID", async () => {
    await createUser({ loginId: "teacher.math", role: "TEACHER", passwordHash })
    const result = await signIn("  teacher.math  ", PASSWORD, "teacher")
    expect(result.ok).toBe(true)
  })

  it("gives administrators a shorter session than students", async () => {
    await createUser({ loginId: "admin.t", role: "ADMIN", passwordHash })
    const result = await signIn("admin.t", PASSWORD, "admin")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const lifetime = result.expiresAt.getTime() - Date.now()
    expect(lifetime).toBeLessThanOrEqual(SESSION_LIFETIMES.ADMIN.absolute * 1000)
    expect(result.user.adminId).toBeTruthy()
  })
})

describe("authenticate: failure", () => {
  const generic = { ok: false, reason: "INVALID_CREDENTIALS" }

  it("rejects a wrong password without creating a session, and logs it safely", async () => {
    const user = await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash })
    const result = await signIn("ZBHS/T/1", "Wrong-Password-1")

    expect(result).toEqual(generic)
    expect(await db.session.count()).toBe(0)

    const log = await db.auditLog.findFirstOrThrow({ where: { action: AUTH_AUDIT.loginFailed } })
    expect(log.userId).toBe(user.id)
    expect(log.metadata).toMatchObject({ loginIdHash: hashLoginId("ZBHS/T/1"), reason: "wrong_password" })
    const serialised = JSON.stringify(log)
    expect(serialised).not.toContain("Wrong-Password-1")
    expect(serialised).not.toContain("ZBHS/T/1") // typed login IDs are stored hashed only
  })

  it("answers an unknown login ID exactly like a wrong password", async () => {
    await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash })
    const unknown = await signIn("does-not-exist")
    const wrong = await signIn("ZBHS/T/1", "Wrong-Password-1")
    expect(unknown).toEqual(wrong)
    expect(unknown).toEqual(generic)
    const log = await db.auditLog.findFirstOrThrow({ where: { metadata: { path: ["reason"], equals: "unknown_login_id" } } })
    expect(log.userId).toBeNull()
  })

  it("rejects the right password on the wrong portal", async () => {
    await createUser({ loginId: "teacher.math", role: "TEACHER", passwordHash })
    expect(await signIn("teacher.math", PASSWORD, "student")).toEqual(generic)
    expect(await signIn("teacher.math", PASSWORD, "admin")).toEqual(generic)
    expect(await db.session.count()).toBe(0)
  })

  it("rejects deactivated accounts even with the right password", async () => {
    await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash, isActive: false })
    expect(await signIn("ZBHS/T/1")).toEqual(generic)
    expect(await db.session.count()).toBe(0)
  })

  it("rejects an inconsistent account whose role has no profile", async () => {
    await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash, withProfile: false })
    expect(await signIn("ZBHS/T/1")).toEqual(generic)
    expect(await db.session.count()).toBe(0)
  })
})

describe("authenticate: rate limiting", () => {
  it("blocks a login ID after repeated failures, even with the correct password", async () => {
    await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash })
    for (let i = 0; i < RATE_LIMIT.maxFailuresPerLoginId; i++) {
      expect(await signIn("ZBHS/T/1", "Wrong-Password-1")).toMatchObject({ reason: "INVALID_CREDENTIALS" })
    }
    expect(await signIn("ZBHS/T/1")).toEqual({ ok: false, reason: "RATE_LIMITED" })
    expect(await db.session.count()).toBe(0)
    expect(await db.auditLog.count({ where: { action: AUTH_AUDIT.loginBlocked } })).toBe(1)
  })

  it("does not affect other accounts", async () => {
    await createUser({ loginId: "victim", role: "STUDENT", passwordHash })
    await createUser({ loginId: "other", role: "STUDENT", passwordHash })
    for (let i = 0; i < RATE_LIMIT.maxFailuresPerLoginId; i++) await signIn("victim", "Wrong-Password-1", "student", null)
    expect(await signIn("victim", PASSWORD, "student", null)).toMatchObject({ reason: "RATE_LIMITED" })
    expect((await signIn("other", PASSWORD, "student", null)).ok).toBe(true)
  })

  it("applies the same limit to login IDs that do not exist, so limits reveal nothing", async () => {
    for (let i = 0; i < RATE_LIMIT.maxFailuresPerLoginId; i++) await signIn("ghost", "x", "student", null)
    expect(await signIn("ghost", "x", "student", null)).toEqual({ ok: false, reason: "RATE_LIMITED" })
  })

  it("blocks an IP address that fails against many different accounts", async () => {
    await createUser({ loginId: "real", role: "STUDENT", passwordHash })
    const attacker = "198.51.100.9"
    for (let i = 0; i < RATE_LIMIT.maxFailuresPerIp; i++) await signIn(`guess-${i}`, "x", "student", attacker)
    expect(await signIn("real", PASSWORD, "student", attacker)).toEqual({ ok: false, reason: "RATE_LIMITED" })
    // someone else, from another address, can still sign in
    expect((await signIn("real", PASSWORD, "student", "192.0.2.1")).ok).toBe(true)
  })

  it("stops counting failures once they are older than the window", async () => {
    await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash })
    await db.auditLog.createMany({
      data: Array.from({ length: RATE_LIMIT.maxFailuresPerLoginId }, () => ({
        action: AUTH_AUDIT.loginFailed,
        entityType: "User",
        metadata: { loginIdHash: hashLoginId("ZBHS/T/1"), ip: IP },
        createdAt: secondsAgo(RATE_LIMIT.windowSeconds + 60),
      })),
    })
    expect((await signIn("ZBHS/T/1")).ok).toBe(true)
  })
})

describe("validateSessionToken", () => {
  it("returns the user for a live session", async () => {
    const { token, user } = await signedInStudent()
    expect(await validateSessionToken(token)).toEqual(user)
  })

  it("returns null for missing, unknown, empty and oversized tokens", async () => {
    await signedInStudent()
    expect(await validateSessionToken(undefined)).toBeNull()
    expect(await validateSessionToken("")).toBeNull()
    expect(await validateSessionToken("not-a-real-token")).toBeNull()
    expect(await validateSessionToken("a".repeat(500))).toBeNull()
  })

  it("does not accept the stored hash as if it were the token", async () => {
    await signedInStudent()
    const stored = (await db.session.findFirstOrThrow()).tokenHash
    expect(await validateSessionToken(stored)).toBeNull()
  })

  it("returns null once the session has expired", async () => {
    const { token } = await signedInStudent()
    await db.session.updateMany({ data: { expiresAt: secondsAgo(1) } })
    expect(await validateSessionToken(token)).toBeNull()
  })

  it("returns null after the idle timeout, which is shorter for administrators", async () => {
    await createUser({ loginId: "admin.t", role: "ADMIN", passwordHash })
    const admin = await signIn("admin.t", PASSWORD, "admin")
    const student = await signedInStudent()
    if (!admin.ok) throw new Error("setup")
    const threeHours = 3 * 60 * 60
    await db.session.updateMany({ data: { lastUsedAt: secondsAgo(threeHours) } })
    expect(await validateSessionToken(admin.token)).toBeNull() // admin idle limit is 2 hours
    expect(await validateSessionToken(student.token)).not.toBeNull() // student idle limit is 24 hours
  })

  it("returns null the moment the user is deactivated", async () => {
    const { token, user } = await signedInStudent()
    await db.user.update({ where: { id: user.id }, data: { isActive: false } })
    expect(await validateSessionToken(token)).toBeNull()
  })

  it("refreshes lastUsedAt only when it is stale", async () => {
    const { token } = await signedInStudent()
    const fresh = (await db.session.findFirstOrThrow()).lastUsedAt
    await validateSessionToken(token)
    expect((await db.session.findFirstOrThrow()).lastUsedAt).toEqual(fresh) // recent: no write

    await db.session.updateMany({ data: { lastUsedAt: secondsAgo(LAST_USED_REFRESH_SECONDS + 60) } })
    await validateSessionToken(token)
    const refreshed = (await db.session.findFirstOrThrow()).lastUsedAt
    expect(Date.now() - refreshed.getTime()).toBeLessThan(10_000)
  })

  it("takes the role from the database, so a role change applies immediately", async () => {
    const { token, user } = await signedInStudent()
    await db.user.update({ where: { id: user.id }, data: { role: "TEACHER" } })
    // role now has no matching profile -> the session is refused rather than trusted
    expect(await validateSessionToken(token)).toBeNull()
  })
})

describe("signing out and revoking", () => {
  it("revokes the session, records it once, and is safe to repeat", async () => {
    const { token, user } = await signedInStudent()
    await revokeSessionByToken(token)
    expect(await validateSessionToken(token)).toBeNull()
    expect((await db.session.findFirstOrThrow()).revokedAt).not.toBeNull()

    await revokeSessionByToken(token)
    await revokeSessionByToken(undefined)
    expect(await db.auditLog.count({ where: { action: AUTH_AUDIT.logout, userId: user.id } })).toBe(1)
  })

  it("revokes every session of one user and leaves other users alone", async () => {
    const first = await signedInStudent()
    const second = await signIn("ZBHS/T/1")
    await createUser({ loginId: "bystander", role: "STUDENT", passwordHash })
    const other = await signIn("bystander")
    if (!second.ok || !other.ok) throw new Error("setup")

    expect(await revokeAllSessionsForUser(first.user.id)).toBe(2)
    expect(await validateSessionToken(first.token)).toBeNull()
    expect(await validateSessionToken(second.token)).toBeNull()
    expect(await validateSessionToken(other.token)).not.toBeNull()
  })
})
