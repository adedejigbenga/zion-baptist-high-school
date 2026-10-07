import { CircleCheckIcon, FlaskConicalIcon } from "lucide-react"

import { PortalBackLink } from "@/components/portal/portal-back-link"
import { PortalLoginForm } from "@/components/portal/portal-login-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { portalRoles } from "@/lib/portal-config"
import { siteConfig } from "@/lib/site-config"
import type { PortalRoleId } from "@/types/portal"

/** Reusable (prototype) sign-in screen for any portal role. */
function PortalLogin({ roleId }: { roleId: PortalRoleId }) {
  const role = portalRoles[roleId]
  const Icon = role.icon

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6">
        <PortalBackLink href="/portal" label="All portals" />
        <PortalBackLink href="/" label="School website" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-brand-100 text-primary">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="type-caption font-semibold text-muted-foreground">{siteConfig.name}</p>
            <Badge variant="info">
              <FlaskConicalIcon aria-hidden="true" />
              Prototype
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="type-page-title text-brand-950">{role.name}</h1>
          <p className="type-body text-muted-foreground">{role.loginSubtitle}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <PortalLoginForm roleName={role.name} />
        </CardContent>
      </Card>

      <section aria-labelledby={`${roleId}-access`} className="rounded-xl border border-brand-100 bg-surface-subtle p-5">
        <h2 id={`${roleId}-access`} className="type-card-title mb-3 text-foreground">
          {role.accessHeading}
        </h2>
        <ul className="flex flex-col gap-2.5">
          {role.access.map((item) => (
            <li key={item} className="flex items-center gap-3 type-body-sm text-foreground">
              <CircleCheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export { PortalLogin }
