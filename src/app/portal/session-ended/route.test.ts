import { NextRequest } from "next/server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { SESSION_COOKIE_NAME } from "@/lib/auth/config"
import { GET } from "@/app/portal/session-ended/route"
import { db } from "@/lib/db"
import { createSession } from "@/lib/auth/service"
import { hash } from "@node-rs/argon2"
import { createUser, resetDatabase } from "@/test/helpers"

let passwordHash: string
beforeAll(async () => {
  passwordHash = await hash("x", { memoryCost: 1024, timeCost: 1, parallelism: 1 })
})
beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

function request(to: string | null, cookie?: string) {
  const url = new URL("http://localhost:3000/portal/session-ended")
  if (to !== null) url.searchParams.set("to", to)
  return new NextRequest(url, { headers: cookie ? { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : {} })
}

const location = (res: Response) => new URL(res.headers.get("location") ?? "", "http://localhost:3000").pathname
const clearsCookie = (res: Response) => (res.headers.get("set-cookie") ?? "").includes(`${SESSION_COOKIE_NAME}=;`)

describe("GET /portal/session-ended", () => {
  it("removes a dead cookie and sends the visitor to the requested sign-in page", async () => {
    const res = await GET(request("/portal/teacher/login", "forged-or-expired-token"))
    expect(location(res)).toBe("/portal/teacher/login")
    expect(clearsCookie(res)).toBe(true)
    const setCookie = res.headers.get("set-cookie") ?? ""
    expect(setCookie.toLowerCase()).toContain("httponly")
    expect(setCookie.toLowerCase()).toContain("path=/")
    expect(res.headers.get("cache-control")).toBe("no-store")
  })

  it("does nothing to a session that is still valid (so a link cannot sign anyone out)", async () => {
    const user = await createUser({ loginId: "ZBHS/T/1", role: "STUDENT", passwordHash })
    const { token } = await createSession({ id: user.id, role: "STUDENT" })
    const res = await GET(request("/portal/teacher/login", token))
    expect(location(res)).toBe("/portal/student") // their own home
    expect(clearsCookie(res)).toBe(false)
    expect((await db.session.findFirstOrThrow()).revokedAt).toBeNull()
  })

  it("only redirects to the fixed allow-list, never to an outside address", async () => {
    for (const evil of ["https://evil.example/phish", "//evil.example", "/portal/student", "javascript:alert(1)", ""]) {
      const res = await GET(request(evil, "dead"))
      expect(location(res)).toBe("/portal")
      expect(res.headers.get("location") ?? "").not.toContain("evil.example")
    }
    expect(location(await GET(request(null)))).toBe("/portal")
  })

  it("sets no cookie header when the visitor had no cookie", async () => {
    const res = await GET(request("/portal/student/login"))
    expect(clearsCookie(res)).toBe(false)
    expect(location(res)).toBe("/portal/student/login")
  })
})
