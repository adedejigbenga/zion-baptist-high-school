import type { ResultStatus, TermName } from "@/generated/prisma/enums"
import type { GradingScheme } from "@/lib/services/grading"
import type { Completeness } from "@/lib/services/result-completeness"

/**
 * Admin-facing data. Admins are not restricted to a subset of records, but the browser still names things by key
 * (admission number, term key, class key, subject code) rather than database IDs, and the acting admin always
 * comes from the validated session.
 */

export type Paged<T> = { rows: T[]; total: number; page: number; pageCount: number; pageSize: number }

export type AdminOverview = {
  sessionName: string | null
  termName: TermName | null
  totalStudents: number
  totalTeachers: number
  activeClasses: number
  awaitingPublication: number
  recent: AuditRow[]
}

export type StudentRow = {
  name: string
  admissionNumber: string
  /** "JSS 1" etc. for the current session, null when not enrolled. */
  className: string | null
  sessionName: string | null
  active: boolean
}

export type TeacherRow = { name: string; loginId: string; employeeNumber: string; department: string | null; assignmentCount: number; active: boolean }
export type ClassRow = { name: string; section: string | null; level: number; active: boolean; studentCount: number }
export type SubjectRow = { name: string; code: string; active: boolean }

export type AcademicsView = {
  sessions: {
    name: string
    startDate: Date
    endDate: Date
    isCurrent: boolean
    terms: { name: TermName; startDate: Date; endDate: Date; isCurrent: boolean }[]
  }[]
}

export type AuditRow = {
  id: string
  createdAt: Date
  userName: string | null
  userLoginId: string | null
  action: string
  entityType: string
  entityId: string | null
  /** Sensitive keys removed, long values shortened. */
  summary: string
}

export type ResultFilters = {
  /** "2026-2027" style key; defaults to the current session. */
  session: string
  /** "first" | "second" | "third" | "all" */
  term: string
  classKey: string
  subject: string
  /** "ALL" | ResultStatus */
  status: string
  page: number
}

export type FilterOptions = {
  sessions: { key: string; name: string }[]
  classes: { key: string; label: string }[]
  subjects: { code: string; name: string }[]
}

export type AdminResultRow = {
  studentName: string
  admissionNumber: string
  className: string
  termKey: string
  termLabel: string
  status: ResultStatus
  /** How many of the class's subjects are submitted / required. */
  submittedSubjects: number
  requiredSubjects: number
  publishedAt: Date | null
}

export type ResultList = Paged<AdminResultRow> & {
  filters: ResultFilters
  counts: Record<ResultStatus, number>
}

export type ResultReview = {
  student: { name: string; admissionNumber: string }
  className: string
  sessionName: string
  termName: TermName
  termKey: string
  status: ResultStatus
  publishedAt: Date | null
  publishedBy: string | null
  scheme: GradingScheme
  completeness: Completeness
  /** Sum and average of the subject totals, only when every subject has one. */
  overall: { total: number; average: number } | null
  history: { action: "PUBLISHED" | "UNPUBLISHED"; at: Date; by: string }[]
}

export type AnnouncementRow = {
  id: string
  title: string
  content: string
  isPublished: boolean
  publishedAt: Date | null
  expiresAt: Date | null
  /** "school" or a class key. */
  target: string
  targetLabel: string
  state: "DRAFT" | "LIVE" | "SCHEDULED" | "EXPIRED"
  createdBy: string
  updatedAt: Date
}
