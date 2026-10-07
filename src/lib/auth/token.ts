import "server-only"

import { createHash, randomBytes } from "node:crypto"

/** 32 random bytes (256 bits) from the operating system's CSPRNG, URL-safe. This is the value placed in the cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

/**
 * SHA-256 of the token, hex encoded. Only this hash is stored in the database, so a leaked database
 * cannot be used to sign in. A fast hash is correct here because the token already has 256 bits of entropy
 * (unlike a password, it cannot be guessed or brute-forced).
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Stable, non-reversible key for "this login ID" used by rate limiting, so typed login IDs are never logged in clear. */
export function hashLoginId(loginId: string): string {
  return createHash("sha256").update(`loginId:${loginId.trim().toLowerCase()}`).digest("hex")
}
