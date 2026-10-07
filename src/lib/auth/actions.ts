"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ROLE_HOME } from "@/lib/auth/config"
import { clearSessionCookie, readSessionToken, setSessionCookie } from "@/lib/auth/cookies"
import { authenticate, revokeSessionByToken } from "@/lib/auth/service"
import { signInSchema } from "@/lib/validation/auth"

/**
 * Server Actions are public HTTP endpoints: everything is validated again here, nothing from the browser is trusted.
 * Next.js also rejects cross-origin calls to Server Actions (Origin vs Host check), which covers CSRF.
 */

export type SignInState = {
  error?: string
  /** Echoed back so the Login ID field keeps its value after a failed attempt. Never the password. */
  loginId?: string
}

const GENERIC_ERROR = "Invalid login ID or password."

async function clientIp(): Promise<string | null> {
  const h = await headers()
  // Behind Vercel these headers are set by the platform and cannot be forged by the visitor.
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || h.get("x-real-ip") || null
}

/** Bound to a portal on the login page: signIn.bind(null, "student"). */
export async function signIn(portal: string, _previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    portal,
    loginId: formData.get("loginId"),
    password: formData.get("password"),
  })

  const typedLoginId = typeof formData.get("loginId") === "string" ? String(formData.get("loginId")).slice(0, 100) : ""

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message
    return { error: message ?? GENERIC_ERROR, loginId: typedLoginId }
  }

  let result: Awaited<ReturnType<typeof authenticate>>
  try {
    result = await authenticate({ ...parsed.data, ip: await clientIp() })
  } catch (error) {
    // Database down or misconfigured: show a calm message instead of a crash page. Log only the error type/message.
    console.error("Sign-in failed unexpectedly:", error instanceof Error ? error.message : "unknown error")
    return { loginId: parsed.data.loginId, error: "Sign-in is temporarily unavailable. Please try again later." }
  }

  if (!result.ok) {
    return {
      loginId: parsed.data.loginId,
      error:
        result.reason === "RATE_LIMITED"
          ? "Too many unsuccessful attempts. Please wait 15 minutes and try again, or contact the school office."
          : GENERIC_ERROR,
    }
  }

  await setSessionCookie(result.token, result.expiresAt)
  // The destination comes from the database role, never from the browser.
  redirect(ROLE_HOME[result.user.role])
}

export async function signOut(): Promise<void> {
  await revokeSessionByToken(await readSessionToken())
  await clearSessionCookie()
  redirect("/portal")
}
