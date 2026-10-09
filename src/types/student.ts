import type { TermName } from "@/generated/prisma/enums"

/**
 * What the student dashboard is allowed to know about the student's result: ONLY a status.
 * There is deliberately no field for scores, grades, totals, remarks or subjects, so they cannot reach the browser.
 *
 *  - NO_TERM        no current academic session / term is set up
 *  - NO_ENROLLMENT  the student has no class in the current session
 *  - NOT_STARTED    no result exists yet for the current term
 *  - IN_PROGRESS    a result exists but is DRAFT or SUBMITTED (not visible to the student)
 *  - PUBLISHED      the result is published and can be opened
 */
export type StudentResultStatus =
  | { state: "NO_TERM" }
  | { state: "NO_ENROLLMENT" }
  | { state: "NOT_STARTED" }
  | { state: "IN_PROGRESS" }
  | { state: "PUBLISHED"; publishedAt: Date | null }

export type StudentAnnouncement = {
  title: string
  /** Shortened plain text. */
  excerpt: string
  publishedAt: Date | null
  /** null for a school-wide announcement, otherwise the class it is addressed to. */
  className: string | null
}

export type StudentDashboard = {
  student: { firstName: string; lastName: string; admissionNumber: string }
  /** The current academic session and term, as set in the database. Either can be null if not configured. */
  academic: { sessionName: string | null; termName: TermName | null }
  /** The student's class in the current session, or null if not enrolled. */
  enrollment: { className: string; section: string | null } | null
  result: StudentResultStatus
  announcements: StudentAnnouncement[]
}

/** Just enough for the sidebar. */
export type StudentProfileSummary = {
  firstName: string
  lastName: string
  admissionNumber: string
}

/** One announcement in the full list. `category` says who it is addressed to. */
export type StudentAnnouncementItem = {
  title: string
  /** Full text. Plain text: render it as text, never as HTML. */
  content: string
  publishedAt: Date | null
  expiresAt: Date | null
  category: "School-wide" | "Class"
  /** The class it is addressed to, or null for a school-wide announcement. */
  className: string | null
}

/**
 * Everything the profile page shows. Deliberately no internal IDs, password hash, session or audit data.
 * email and phone are the contact details the school holds for the student (often empty).
 */
export type StudentProfile = {
  firstName: string
  lastName: string
  admissionNumber: string
  className: string | null
  section: string | null
  sessionName: string | null
  email: string | null
  phone: string | null
}
