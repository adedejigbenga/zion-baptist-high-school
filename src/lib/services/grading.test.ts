import { describe, expect, it } from "vitest"

import { calculateEntry, findBand, parseScoreInput, round2, type GradingScheme } from "@/lib/services/grading"

const twoPart: GradingScheme = {
  components: [
    { shortName: "CA", name: "Continuous Assessment", maxScore: 40, weight: 40 },
    { shortName: "Exam", name: "Examination", maxScore: 60, weight: 60 },
  ],
  bands: [
    { grade: "A", minScore: 70, maxScore: 100, remark: "Excellent" },
    { grade: "B", minScore: 60, maxScore: 69.99, remark: "Very Good" },
    { grade: "C", minScore: 50, maxScore: 59.99, remark: "Good" },
    { grade: "D", minScore: 40, maxScore: 49.99, remark: "Pass" },
    { grade: "F", minScore: 0, maxScore: 39.99, remark: "Fail" },
  ],
}

describe("parseScoreInput", () => {
  it.each([
    ["34", 34], ["0", 0], ["40", 40], ["34.5", 34.5], ["34.25", 34.25], ["  12  ", 12], ["007", 7],
  ])("accepts %j as %s", (text, value) => {
    expect(parseScoreInput(text, 40)).toEqual({ ok: true, value })
  })

  it("treats blank as 'not entered'", () => {
    expect(parseScoreInput("", 40)).toEqual({ ok: true, value: null })
    expect(parseScoreInput("   ", 40)).toEqual({ ok: true, value: null })
  })

  it("rejects negative scores with a clear message", () => {
    expect(parseScoreInput("-1", 40)).toEqual({ ok: false, error: "Score cannot be negative." })
    expect(parseScoreInput("-0.5", 40)).toEqual({ ok: false, error: "Score cannot be negative." })
  })

  it("rejects a score above the component's maximum, but accepts exactly the maximum", () => {
    expect(parseScoreInput("40.01", 40)).toEqual({ ok: false, error: "Cannot be more than 40." })
    expect(parseScoreInput("41", 40)).toEqual({ ok: false, error: "Cannot be more than 40." })
    expect(parseScoreInput("40", 40)).toEqual({ ok: true, value: 40 })
  })

  it.each(["abc", "1e3", "Infinity", "NaN", "0x10", "1,5", "4 0", "+5", ".5", "5.", "--5", "١٢", "40%", "<script>"])(
    "rejects non-numeric input %j",
    (text) => {
      const result = parseScoreInput(text, 100)
      expect(result.ok).toBe(false)
    },
  )

  it("rejects more than 2 decimal places", () => {
    expect(parseScoreInput("34.256", 40)).toEqual({ ok: false, error: "Use at most 2 decimal places." })
  })
})

describe("calculateEntry", () => {
  it("computes the weighted total, grade and remark from the scheme", () => {
    expect(calculateEntry(twoPart, { CA: 34, Exam: 52 })).toEqual({ complete: true, total: 86, grade: "A", remark: "Excellent", gradeMissing: false })
    expect(calculateEntry(twoPart, { CA: 27, Exam: 38 })).toMatchObject({ total: 65, grade: "B", remark: "Very Good" })
    expect(calculateEntry(twoPart, { CA: 15, Exam: 22 })).toMatchObject({ total: 37, grade: "F", remark: "Fail" })
  })

  it("respects component maximums and weights (not just adding the raw scores)", () => {
    const scheme: GradingScheme = {
      components: [
        { shortName: "T1", name: "Test 1", maxScore: 20, weight: 10 }, // half-weight
        { shortName: "Exam", name: "Exam", maxScore: 80, weight: 90 },
      ],
      bands: [{ grade: "X", minScore: 0, maxScore: 100, remark: "All" }],
    }
    expect(calculateEntry(scheme, { T1: 20, Exam: 80 }).total).toBe(100)
    expect(calculateEntry(scheme, { T1: 10, Exam: 40 }).total).toBe(50) // 5 + 45
  })

  it("works with any number of components", () => {
    const five: GradingScheme = {
      components: ["T1", "T2", "Prac", "Proj", "Exam"].map((shortName, i) => ({ shortName, name: shortName, maxScore: [10, 10, 20, 20, 40][i], weight: [10, 10, 20, 20, 40][i] })),
      bands: [{ grade: "A", minScore: 70, maxScore: 100, remark: "Excellent" }, { grade: "F", minScore: 0, maxScore: 69.99, remark: "Fail" }],
    }
    expect(calculateEntry(five, { T1: 8, T2: 9, Prac: 15, Proj: 18, Exam: 30 })).toMatchObject({ total: 80, grade: "A" })
  })

  it("gives no total, grade or remark until EVERY component has a score", () => {
    const partial = { complete: false, total: null, grade: null, remark: null, gradeMissing: false }
    expect(calculateEntry(twoPart, { CA: 30 })).toEqual(partial)
    expect(calculateEntry(twoPart, { CA: 30, Exam: null })).toEqual(partial)
    expect(calculateEntry(twoPart, {})).toEqual(partial)
  })

  it("treats a zero score as a real score, not as missing", () => {
    expect(calculateEntry(twoPart, { CA: 0, Exam: 0 })).toMatchObject({ complete: true, total: 0, grade: "F" })
  })

  it("flags a gap in the grade bands instead of inventing a grade", () => {
    const gappy: GradingScheme = { ...twoPart, bands: [{ grade: "A", minScore: 70, maxScore: 100, remark: "Excellent" }] }
    expect(calculateEntry(gappy, { CA: 10, Exam: 10 })).toEqual({ complete: true, total: 20, grade: null, remark: null, gradeMissing: true })
  })

  it("uses whatever grade letters the scheme defines (nothing is hard-coded)", () => {
    const custom: GradingScheme = {
      components: [{ shortName: "All", name: "All", maxScore: 100, weight: 100 }],
      bands: [{ grade: "Distinction", minScore: 80, maxScore: 100, remark: "Outstanding" }, { grade: "Merit", minScore: 0, maxScore: 79.99, remark: "Solid" }],
    }
    expect(calculateEntry(custom, { All: 91 })).toMatchObject({ grade: "Distinction", remark: "Outstanding" })
    expect(calculateEntry(custom, { All: 40 })).toMatchObject({ grade: "Merit", remark: "Solid" })
  })

  it("avoids floating-point surprises", () => {
    expect(calculateEntry(twoPart, { CA: 33.33, Exam: 54.01 }).total).toBe(87.34)
    expect(calculateEntry(twoPart, { CA: 0.1, Exam: 0.2 }).total).toBe(0.3)
  })
})

describe("findBand / round2", () => {
  it.each([[100, "A"], [70, "A"], [69.99, "B"], [60, "B"], [59.99, "C"], [40, "D"], [39.99, "F"], [0, "F"]])("total %s falls in band %s", (total, grade) => {
    expect(findBand(twoPart.bands, total)?.grade).toBe(grade)
  })
  it("returns undefined outside every band", () => {
    expect(findBand(twoPart.bands, 100.01)).toBeUndefined()
    expect(findBand(twoPart.bands, -1)).toBeUndefined()
  })
  it("rounds to 2 decimal places", () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(75.249999)).toBe(75.25)
  })
})
