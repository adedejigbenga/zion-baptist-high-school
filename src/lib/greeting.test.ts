import { describe, expect, it } from "vitest"

import { excerpt, formatDate, initials } from "@/lib/format"
import { greetingFor } from "@/lib/greeting"

// The school is in Lagos (UTC+1, no daylight saving). The server may run in any time zone (Vercel runs in UTC),
// so the greeting is computed from an explicit school time zone, never from the machine's clock.
describe("greetingFor (school time, Africa/Lagos)", () => {
  it.each([
    ["2026-10-07T23:00:00Z", "Good morning"], // 00:00 Lagos
    ["2026-10-07T06:59:00Z", "Good morning"], // 07:59
    ["2026-10-07T10:59:00Z", "Good morning"], // 11:59
    ["2026-10-07T11:00:00Z", "Good afternoon"], // 12:00
    ["2026-10-07T15:59:00Z", "Good afternoon"], // 16:59
    ["2026-10-07T16:00:00Z", "Good evening"], // 17:00
    ["2026-10-07T22:59:00Z", "Good evening"], // 23:59
  ])("%s -> %s", (iso, expected) => {
    expect(greetingFor(new Date(iso))).toBe(expected)
  })

  it("depends on the time zone passed in, not the server's", () => {
    const instant = new Date("2026-10-07T10:30:00Z")
    expect(greetingFor(instant, "Africa/Lagos")).toBe("Good morning") // 11:30
    expect(greetingFor(instant, "Asia/Tokyo")).toBe("Good evening") // 19:30
  })
})

describe("formatting helpers", () => {
  it("formats dates in school time", () => {
    expect(formatDate(new Date("2026-09-14T10:00:00Z"))).toBe("14 September 2026")
    expect(formatDate(new Date("2026-09-14T23:30:00Z"))).toBe("15 September 2026") // already the 15th in Lagos
  })

  it("shortens long text on a word boundary and leaves short text alone", () => {
    expect(excerpt("short text")).toBe("short text")
    const long = excerpt("word ".repeat(100), 50)
    expect(long.length).toBeLessThanOrEqual(51)
    expect(long.endsWith("…")).toBe(true)
    expect(long).not.toMatch(/wor…$/)
  })

  it("builds initials", () => {
    expect(initials("Daniel", "Ade")).toBe("DA")
    expect(initials("grace", "bello")).toBe("GB")
  })
})
