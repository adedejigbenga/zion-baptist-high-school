import { siteConfig } from "@/lib/site-config"

/** "14 September 2026", in the school's time zone. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: siteConfig.timeZone,
  }).format(date)
}

/** Shortens text to at most `max` characters, on a word boundary where possible, adding an ellipsis. */
export function excerpt(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** "DA" for Daniel Ade. */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/** A score for display: "86" not "86.00", "33.5" not "33.50". */
export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
}
