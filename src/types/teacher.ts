import type { TermName } from "@/generated/prisma/enums"
import type { GradingScheme } from "@/lib/services/grading"

/**
 * Teacher-facing data. Classes and subjects are identified by a class key ("jss-1") and a subject code ("MTH"),
 * never by database IDs, and the server only accepts keys that match one of the signed-in teacher's own assignments.
 */

export type AssignmentStatus = "NO_STUDENTS" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "PUBLISHED"

export type TeacherAssignmentSummary = {
  classKey: string
  className: string
  subjectCode: string
  subjectName: string
  studentCount: number
  /** Students with no entry yet for this subject. */
  notStarted: number
  /** Students whose entry is still a draft. */
  drafts: number
  /** Students whose entry is submitted and waiting for an administrator. */
  submitted: number
  /** Students whose whole result is already published. */
  published: number
  status: AssignmentStatus
}

export type TeacherOverview = {
  sessionName: string | null
  termName: TermName | null
  assignments: TeacherAssignmentSummary[]
  totals: {
    /** Distinct classes. */
    classes: number
    /** Distinct subjects. */
    subjects: number
    /** Student results still to submit (not started + drafts), across all assignments. */
    pending: number
    /** Student results submitted (including those since published). */
    submitted: number
  }
}

export type RowStatus = "NOT_STARTED" | "DRAFT" | "SUBMITTED" | "PUBLISHED"

export type WorkspaceRow = {
  admissionNumber: string
  firstName: string
  lastName: string
  /** Score per assessment component (by shortName); null = not entered. */
  scores: Record<string, number | null>
  total: number | null
  grade: string | null
  remark: string | null
  status: RowStatus
  /** Submitted, published, or under another scheme: the teacher cannot edit this row. */
  locked: boolean
  lockNote: string | null
}

export type WorkspaceOption = { classKey: string; className: string; subjects: { code: string; name: string }[] }

export type TeacherWorkspace =
  | { kind: "NO_TERM" }
  | { kind: "NO_SCHEME" }
  | { kind: "NO_ASSIGNMENTS"; sessionName: string; termName: TermName }
  /** The requested class/subject is not one of this teacher's assignments. */
  | { kind: "NOT_AUTHORIZED" }
  | {
      kind: "READY"
      sessionName: string
      termName: TermName
      options: WorkspaceOption[]
      selected: { classKey: string; className: string; subjectCode: string; subjectName: string }
      scheme: GradingScheme
      /** The students shown (after the search filter). */
      rows: WorkspaceRow[]
      totalStudents: number
      query: string
      counts: { notStarted: number; drafts: number; submitted: number; published: number }
      /** How many students can still be edited (not locked). */
      editableCount: number
      /** Changes whenever the saved data changes, so the form can reload its values. */
      version: string
    }
