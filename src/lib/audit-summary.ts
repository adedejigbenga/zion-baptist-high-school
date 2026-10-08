/**
 * Turns an audit log's JSON metadata into one short line for the admin audit page.
 *
 * Anything that could be a secret is never shown: keys that look like passwords, hashes, tokens, secrets or cookies are
 * dropped entirely (their values are not even read into the output), and so are keys that hold nested objects of unknown
 * shape (shown only as a count). Values are shortened so a long text can never flood the page.
 */

const SENSITIVE_KEY = /pass(word|wd)?|hash|token|secret|cookie|authorization|credential|session(id)?$/i
const MAX_VALUE = 60
const MAX_PAIRS = 8

function shorten(text: string): string {
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE - 1)}…` : text
}

function show(value: unknown): string | null {
  if (value === null || value === undefined) return "none"
  if (typeof value === "string") return shorten(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`
  return null // nested object: not summarised
}

export function summarizeMetadata(metadata: unknown): string {
  if (metadata === null || metadata === undefined) return "–"
  if (typeof metadata !== "object" || Array.isArray(metadata)) return show(metadata) ?? "–"

  const parts: string[] = []
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) continue
    const shown = show(value)
    if (shown === null) continue
    parts.push(`${key}: ${shown}`)
    if (parts.length === MAX_PAIRS) break
  }
  return parts.length > 0 ? parts.join(" · ") : "–"
}
