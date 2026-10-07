"use client"

import * as React from "react"
import { AlertCircleIcon, InfoIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormHint } from "@/components/ui/form-message"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { signIn, type SignInState } from "@/lib/auth/actions"
import type { PortalRoleId } from "@/types/portal"

const initialState: SignInState = {}

/**
 * Sign-in form for one portal. It only collects the two fields and shows the result; all checking happens
 * on the server in the `signIn` Server Action. The browser never decides who is allowed in.
 */
function PortalLoginForm({ roleId }: { roleId: PortalRoleId }) {
  const [state, formAction, isPending] = React.useActionState(signIn.bind(null, roleId), initialState)
  const [showReset, setShowReset] = React.useState(false)
  const id = React.useId()
  const errorId = `${id}-error`

  return (
    <form action={formAction} className="stack-form">
      {state.error && (
        <Alert variant="destructive" id={errorId}>
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>Could not sign in</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="stack-field">
        <Label htmlFor={`${id}-login`}>Login ID</Label>
        <Input
          id={`${id}-login`}
          name="loginId"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={100}
          defaultValue={state.loginId ?? ""}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? `${errorId} ${id}-login-hint` : `${id}-login-hint`}
        />
        <FormHint id={`${id}-login-hint`}>Enter the Login ID provided by the school.</FormHint>
      </div>

      <div className="stack-field">
        <Label htmlFor={`${id}-password`}>Password</Label>
        <PasswordInput
          id={`${id}-password`}
          name="password"
          autoComplete="current-password"
          required
          maxLength={256}
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isPending}>
        {isPending ? "Signing in..." : "Sign In"}
      </Button>

      <div className="-mt-1 flex justify-center">
        <Button type="button" variant="link" onClick={() => setShowReset(true)}>
          Forgot password?
        </Button>
      </div>

      {showReset && (
        <Alert variant="info" role="status">
          <InfoIcon aria-hidden="true" />
          <AlertTitle>Resetting your password</AlertTitle>
          <AlertDescription>
            Password reset is handled by the school. Please contact the school office or your administrator.
          </AlertDescription>
        </Alert>
      )}
    </form>
  )
}

export { PortalLoginForm }
