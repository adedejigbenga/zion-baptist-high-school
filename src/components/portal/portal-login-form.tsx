"use client"

import * as React from "react"
import { InfoIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormHint } from "@/components/ui/form-message"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"

/**
 * VISUAL PROTOTYPE ONLY. There is no authentication here.
 * - The inputs deliberately have no `name`, so nothing can be submitted (not even by a no-JS GET to the URL).
 * - The submit handler never reads the field values; it only shows a notice.
 * - Nothing is stored, sent or logged.
 * Replace this component when real authentication is built.
 */
function PortalLoginForm({ roleName }: { roleName: string }) {
  const [notice, setNotice] = React.useState<string | null>(null)
  const id = React.useId()

  return (
    <form
      noValidate
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault()
        setNotice(`Sign-in is not active yet. The ${roleName} login is a design preview only.`)
      }}
    >
      <div className="stack-field">
        <Label htmlFor={`${id}-login`}>Login ID</Label>
        <Input
          id={`${id}-login`}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={`${id}-login-hint`}
        />
        <FormHint id={`${id}-login-hint`}>Enter the Login ID provided by the school.</FormHint>
      </div>

      <div className="stack-field">
        <Label htmlFor={`${id}-password`}>Password</Label>
        <PasswordInput id={`${id}-password`} autoComplete="off" />
      </div>

      <Button type="submit" size="lg" className="w-full">
        Sign In
      </Button>

      <div className="-mt-1 flex justify-center">
        <Button
          type="button"
          variant="link"
          onClick={() => setNotice("Password recovery is not available in this design preview.")}
        >
          Forgot password?
        </Button>
      </div>

      {notice && (
        <Alert variant="info" role="status">
          <InfoIcon aria-hidden="true" />
          <AlertTitle>Design preview</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}

export { PortalLoginForm }
