import Link from "next/link"
import { ArrowRightIcon, UserCheckIcon } from "lucide-react"

import { SignOutButton } from "@/components/portal/sign-out-button"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ROLE_HOME, ROLE_PORTAL_NAME } from "@/lib/auth/config"
import { getCurrentUser } from "@/lib/auth/current-user"

/**
 * Shown on the portal gateway only when the visitor already has a valid session: a clear way to carry on
 * to their own dashboard (or log out). It never redirects, so there is no redirect loop. Reads the session,
 * so it must sit under <Suspense>.
 */
async function PortalSignedInNotice() {
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <Card variant="subtle" size="sm" className="gap-4" role="region" aria-label="You are signed in">
      <div className="flex items-start gap-3 px-(--card-spacing)">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-brand-100">
          <UserCheckIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="type-card-title text-foreground">
            You are signed in as {user.firstName} {user.lastName}
          </p>
          <p className="type-body-sm text-muted-foreground">{ROLE_PORTAL_NAME[user.role]}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-(--card-spacing) sm:flex-row sm:items-center">
        <Link href={ROLE_HOME[user.role]} className={buttonVariants({ className: "w-full sm:w-auto" })}>
          Continue to your dashboard
          <ArrowRightIcon aria-hidden="true" />
        </Link>
        <SignOutButton />
      </div>
    </Card>
  )
}

export { PortalSignedInNotice }
