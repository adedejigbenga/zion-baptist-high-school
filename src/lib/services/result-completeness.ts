import { calculateEntry, round2, type GradingScheme } from "@/lib/services/grading"

/**
 * Is a student's result complete enough to publish? Pure, so it can be tested without a database.
 *
 * Nothing here is hardcoded: the subjects a result must contain come from the class's `ClassSubject` rows, and the scores a
 * subject must contain come from the grading scheme's assessment components. A subject only counts as complete when
 *   1. an entry exists,
 *   2. every assessment component has a score,
 *   3. the stored total / grade / remark still match what the scores produce under the scheme (nobody edited the database
 *      by hand, and the scheme has a grade band for the total),
 *   4. the teacher has submitted it.
 */

export type RequiredSubject = { subjectId: string; code: string; name: string }

export type EntrySnapshot = {
  subjectId: string
  status: "DRAFT" | "SUBMITTED"
  totalScore: number | null
  grade: string | null
  remark: string | null
  /** Score by component shortName. */
  scores: Record<string, number>
}

export type SubjectReview = {
  code: string
  name: string
  entryStatus: "MISSING" | "DRAFT" | "SUBMITTED"
  scores: Record<string, number | null>
  total: number | null
  grade: string | null
  remark: string | null
  /** What is wrong with this subject; empty when it is ready. */
  issues: string[]
}

export type Completeness = {
  complete: boolean
  /** Plain-language reasons the result cannot be published (empty when complete). */
  issues: string[]
  subjects: SubjectReview[]
}

export function evaluateResult(scheme: GradingScheme, required: RequiredSubject[], entries: EntrySnapshot[]): Completeness {
  const issues: string[] = []
  if (scheme.components.length === 0) issues.push("The grading scheme for this result has no assessment components.")
  if (required.length === 0) issues.push("No subjects are set up for this class in this session, so there is nothing to publish.")

  const byId = new Map(entries.map((e) => [e.subjectId, e]))
  const subjects: SubjectReview[] = required.map((subject) => {
    const entry = byId.get(subject.subjectId)
    const scores: Record<string, number | null> = {}
    for (const c of scheme.components) scores[c.shortName] = entry?.scores[c.shortName] ?? null

    const problems: string[] = []
    if (!entry) {
      problems.push("No scores have been entered.")
    } else {
      const missing = scheme.components.filter((c) => scores[c.shortName] === null).map((c) => c.name)
      if (missing.length > 0) {
        problems.push(`Missing ${missing.join(" and ")} ${missing.length === 1 ? "score" : "scores"}.`)
      } else {
        const outcome = calculateEntry(scheme, scores)
        if (outcome.gradeMissing) {
          problems.push(`The grading scheme has no grade band for a total of ${outcome.total}.`)
        } else if (
          entry.totalScore === null ||
          round2(entry.totalScore) !== outcome.total ||
          entry.grade !== outcome.grade ||
          entry.remark !== outcome.remark
        ) {
          problems.push("The saved total, grade or remark does not match the scores. Ask the teacher to save this subject again.")
        }
      }
      if (entry.status !== "SUBMITTED") problems.push("The teacher has not submitted this subject yet.")
    }

    for (const p of problems) issues.push(`${subject.name}: ${p}`)
    return {
      code: subject.code,
      name: subject.name,
      entryStatus: entry ? entry.status : "MISSING",
      scores,
      total: entry?.totalScore ?? null,
      grade: entry?.grade ?? null,
      remark: entry?.remark ?? null,
      issues: problems,
    }
  })

  return { complete: issues.length === 0, issues, subjects }
}
