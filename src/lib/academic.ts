import type { TermName } from "@/generated/prisma/enums"

/** Display labels for the term enum. (Which term is current, and its dates, always come from the database.) */
export const TERM_LABEL: Record<TermName, string> = {
  FIRST: "First Term",
  SECOND: "Second Term",
  THIRD: "Third Term",
}

/** "JSS 1" or "JSS 1 A" when the class has a section. */
export function classLabel(name: string, section: string | null): string {
  return section ? `${name} ${section}` : name
}

/** "First Term, 2026/2027". */
export function termLabel(sessionName: string, termName: TermName): string {
  return `${TERM_LABEL[termName]}, ${sessionName}`
}

/**
 * A URL-safe reference to a term, e.g. "2026-2027-first". It is built from the session name and the term name, never
 * from a database ID, and the server only accepts keys that belong to the signed-in student's own list of terms.
 */
export function termKey(sessionName: string, termName: TermName): string {
  return `${sessionName.replace(/[^A-Za-z0-9]+/g, "-")}-${termName.toLowerCase()}`
}

/** A URL-safe reference to a class, e.g. "jss-1" or "jss-1-a". Built from the name, never from a database ID. */
export function classKey(name: string, section: string | null): string {
  return classLabel(name, section).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/** A URL-safe reference to an academic session, e.g. "2026-2027". */
export function sessionKey(sessionName: string): string {
  return sessionName.replace(/[^A-Za-z0-9]+/g, "-")
}
