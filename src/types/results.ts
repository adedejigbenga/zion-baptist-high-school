import type { TermName } from "@/generated/prisma/enums"

/**
 * Result data as the student result page receives it. A `ResultSheet` exists ONLY for a PUBLISHED result: the type of
 * every other state carries no marks at all, so there is nothing to leak. No database IDs appear anywhere.
 */

/** One assessment column (e.g. CA 40, Exam 60). Comes from the result's own grading scheme, not from code. */
export type SheetComponent = { shortName: string; name: string; maxScore: number; weight: number }

export type SheetRow = {
  subject: string
  /** Same order and length as `components`; null when no score was recorded for that component. */
  scores: (number | null)[]
  total: number | null
  grade: string | null
  remark: string | null
}

export type SheetGradeBand = { grade: string; minScore: number; maxScore: number; remark: string }

export type ResultSheet = {
  student: { firstName: string; lastName: string; admissionNumber: string }
  /** The class the student was in at that time (can differ from their current class). */
  className: string
  sessionName: string
  termName: TermName
  publishedAt: Date | null
  components: SheetComponent[]
  rows: SheetRow[]
  summary: {
    subjectCount: number
    /** Sum of the stored totals. null when no subject has a total. */
    overallTotal: number | null
    /** overallTotal divided by the number of subjects that have a total, to 2 decimal places. */
    average: number | null
    /** How many subjects got each stored grade, in the order of the grading scheme's grade bands. */
    gradeCounts: { grade: string; count: number }[]
  }
  /** The grading scheme's own grade bands, shown as the grading key. */
  gradeKey: SheetGradeBand[]
}

export type ResultTermOption = { key: string; label: string; isCurrent: boolean }

export type StudentResultView =
  /** The student has no term to show (not enrolled anywhere yet). */
  | { kind: "NO_TERMS" }
  /** The requested term key is not one of this student's terms. */
  | { kind: "UNKNOWN_TERM" }
  /** The selected term has no PUBLISHED result (draft, submitted, or nothing yet): status only, never marks. */
  | { kind: "NOT_PUBLISHED"; terms: ResultTermOption[]; selected: ResultTermOption }
  | { kind: "PUBLISHED"; terms: ResultTermOption[]; selected: ResultTermOption; sheet: ResultSheet }
