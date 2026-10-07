import { CircleCheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { ROLE_PORTAL_NAME } from "@/lib/auth/config"
import type { SessionUser } from "@/types/auth"

/** TEMPORARY landing content shown after sign-in until the role dashboards are built. */
function SignedInWelcome({ user }: { user: SessionUser }) {
  return (
    <div className="stack-page max-w-xl">
      <div className="flex flex-col gap-2">
        <h1 className="type-page-title text-brand-950">Welcome, {user.firstName}</h1>
        <p className="type-body text-muted-foreground">{ROLE_PORTAL_NAME[user.role]}</p>
      </div>
      <Card variant="subtle">
        <CardHeader className="gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-brand-100">
            <CircleCheckIcon className="size-5" aria-hidden="true" />
          </span>
          <h2 className="type-card-title text-foreground">
            {user.firstName} {user.lastName}
          </h2>
          <div>
            <Badge variant="secondary">{ROLE_PORTAL_NAME[user.role]}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>Your dashboard is being prepared.</CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}

export { SignedInWelcome }
