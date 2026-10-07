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
