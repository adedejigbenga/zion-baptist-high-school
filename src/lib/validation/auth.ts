import { z } from "zod"

/** Sign-in form input. Length caps stop absurdly large inputs from reaching the password hasher. */
export const signInSchema = z.object({
  portal: z.enum(["student", "teacher", "admin"]),
  loginId: z.string().trim().min(1, "Enter your Login ID.").max(100),
  password: z.string().min(1, "Enter your password.").max(256),
})

export type SignInInput = z.infer<typeof signInSchema>
