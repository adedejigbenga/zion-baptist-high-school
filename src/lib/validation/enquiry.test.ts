import { describe, expect, it } from "vitest"

import { parseEnquiryForm } from "@/lib/validation/enquiry"

function form(values: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(values)) f.set(k, v)
  return f
}
const valid = { name: "Ada Obi", email: "ada@example.com", phone: "", topic: "admissions", message: "I would like to ask about admission." }

describe("contact form validation", () => {
  it("accepts a valid enquiry, with or without a phone number", () => {
    expect(parseEnquiryForm(form(valid)).ok).toBe(true)
    expect(parseEnquiryForm(form({ ...valid, phone: "+234 801 234 5678" })).ok).toBe(true)
  })

  it("trims whitespace", () => {
    const r = parseEnquiryForm(form({ ...valid, name: "  Ada Obi  " }))
    expect(r.ok && r.input.name).toBe("Ada Obi")
  })

  it.each([
    ["name", { name: "A" }],
    ["email", { email: "nope" }],
    ["email", { email: "a@b" }],
    ["phone", { phone: "abc" }],
    ["topic", { topic: "hack" }],
    ["message", { message: "too short" }],
    ["message", { message: "x".repeat(2001) }],
    ["name", { name: "x".repeat(81) }],
  ])("rejects a bad %s", (field, override) => {
    const r = parseEnquiryForm(form({ ...valid, ...override }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldErrors[field as keyof typeof r.fieldErrors]).toBeTruthy()
  })

  it("reports every problem at once, and treats missing fields as empty", () => {
    const r = parseEnquiryForm(new FormData())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["email", "message", "name", "topic"])
  })
})
