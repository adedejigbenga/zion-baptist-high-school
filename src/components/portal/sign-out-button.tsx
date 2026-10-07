import { LogOutIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth/actions"

/** A real <form> posting to the signOut Server Action: signing out changes state, so it is a button, never a link. */
function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        <LogOutIcon aria-hidden="true" />
        Logout
      </Button>
    </form>
  )
}

export { SignOutButton }
