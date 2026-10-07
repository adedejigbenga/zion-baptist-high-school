import { CircleCheckIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import type { SessionUser } from "@/types/auth"

const AREA = { STUDENT: "student", TEACHER: "teacher", ADMIN: "administrator" } as const

/** TEMPORARY landing content shown after sign-in until the role dashboards are built. */
function SignedInWelcome({ user }: { user: SessionUser }) {
  return (
    <div className="stack-page max-w-xl">
      <h1 className="type-page-title text-brand-950">Welcome, {user.firstName}</h1>
      <Card variant="subtle">
        <CardHeader className="gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-brand-100">
            <CircleCheckIcon className="size-5" aria-hidden="true" />
          </span>
          <h2 className="type-card-title text-foreground">You are signed in</h2>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Your {AREA[user.role]} dashboard is being built and will appear here.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}

export { SignedInWelcome }
