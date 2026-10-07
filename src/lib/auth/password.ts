import "server-only"

import { hash, verify } from "@node-rs/argon2"

/**
 * Argon2id with the OWASP-recommended minimum cost (19 MiB memory, 2 passes, 1 lane).
 * The parameters are stored inside every hash, so they can be raised later without breaking old hashes.
 */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

/** Returns false (never throws) for a wrong password or a malformed/empty hash. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

/**
 * A real hash of a random value, used to spend the same time on a sign-in for a login ID that does not exist.
 * Without it, "unknown user" would answer faster than "wrong password" and reveal which login IDs are real.
 */
let dummyHash: Promise<string> | undefined
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(crypto.randomUUID() + crypto.randomUUID())
  return dummyHash
}
