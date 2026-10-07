/**
 * Grading service: the ONE place that turns component scores into a total, a grade and a remark.
 *
 * It is pure (no database, no server-only code), so the exact same functions run
 *  - on the server, which is the authority and recalculates everything before saving, and
 *  - in the browser, which only uses them for the live preview while a teacher types.
 * That way the grading rule is written once and the preview can never disagree with what is saved.
 *
 * Nothing here knows any grade letter, range or component name: the scheme (components and grade bands) is passed in
 * from the database.
 *
 * total = sum( score / maxScore * weight ) over the scheme's components, rounded to 2 decimal places
 * (the same rule used when the existing results were created, so old and new results are consistent).
 */

export type GradingComponent = { shortName: string; name: string; maxScore: number; weight: number }
export type GradingBand = { grade: string; minScore: number; maxScore: number; remark: string }
export type GradingScheme = { components: GradingComponent[]; bands: GradingBand[] }

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export type ScoreParse =
  | { ok: true; value: number | null } // null = left blank
  | { ok: false; error: string }

const MAX_DECIMALS = 2

/**
 * Reads what a teacher typed for one component. Blank is allowed here (callers decide whether a blank is acceptable).
 * Accepts only plain decimal numbers such as "34", "34.5", "34.25": no signs, exponents, hex or thousands separators.
 */
export function parseScoreInput(text: string, maxScore: number): ScoreParse {
  const raw = text.trim()
  if (raw === "") return { ok: true, value: null }
  if (/^-/.test(raw)) return { ok: false, error: "Score cannot be negative." }
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, error: "Enter a number." }
  const decimals = raw.split(".")[1]?.length ?? 0
  if (decimals > MAX_DECIMALS) return { ok: false, error: `Use at most ${MAX_DECIMALS} decimal places.` }
  const value = Number(raw)
  if (!Number.isFinite(value)) return { ok: false, error: "Enter a number." }
  if (value > maxScore) return { ok: false, error: `Cannot be more than ${maxScore}.` }
  return { ok: true, value }
}

/** The grade band that contains `total` (inclusive on both ends), or undefined if the bands leave a gap there. */
export function findBand(bands: GradingBand[], total: number): GradingBand | undefined {
  return bands.find((b) => total >= b.minScore && total <= b.maxScore)
}

export type EntryOutcome = {
  /** Every component has a score. */
  complete: boolean
  total: number | null
  grade: string | null
  remark: string | null
  /** All scores are present but no grade band covers the total (the scheme has a gap). */
  gradeMissing: boolean
}

/**
 * Calculates one subject entry. `scores` maps a component's shortName to its score (null / missing = not entered).
 * Until every component has a score there is no total, grade or remark: a partly filled entry is never graded.
 */
export function calculateEntry(scheme: GradingScheme, scores: Record<string, number | null | undefined>): EntryOutcome {
  const complete = scheme.components.length > 0 && scheme.components.every((c) => typeof scores[c.shortName] === "number")
  if (!complete) return { complete: false, total: null, grade: null, remark: null, gradeMissing: false }

  const total = round2(scheme.components.reduce((sum, c) => sum + ((scores[c.shortName] as number) / c.maxScore) * c.weight, 0))
  const band = findBand(scheme.bands, total)
  return { complete: true, total, grade: band?.grade ?? null, remark: band?.remark ?? null, gradeMissing: !band }
}
