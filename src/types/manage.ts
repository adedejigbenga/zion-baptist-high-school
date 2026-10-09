/**
 * Shared shapes for the admin management modules (people, classes, subjects, academic sessions, grading).
 *
 * `Outcome` is what every internal write service returns; `ManageState` is what a Server Action hands back to its form.
 * Neither ever carries a password hash or session token. `credentials` appears only once, right after an account is
 * created or its password is reset.
 */

export type FieldErrors = Record<string, string>

export type Outcome =
  | { ok: true; message: string; credentials?: { loginId: string; password: string } }
  | { ok: false; message: string; fieldErrors?: FieldErrors }

export type ManageState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: FieldErrors
  credentials?: { loginId: string; password: string }
  at?: number
}
