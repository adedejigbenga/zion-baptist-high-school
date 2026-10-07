import * as React from "react"

import { PortalBackLink } from "@/components/portal/portal-back-link"
import { PortalRoleCard } from "@/components/portal/portal-role-card"
import { PortalSignedInNotice } from "@/components/portal/portal-signed-in-notice"
import { portalRoleList } from "@/lib/portal-config"

/** Right-hand content of /portal: welcome text and the three account-type cards. */
function PortalGateway() {
  return (
    <div className="flex flex-col gap-8">
      <PortalBackLink href="/" label="Back to School Website" />

      <div className="flex flex-col gap-3">
        <h1 className="type-page-title text-brand-950">Welcome to the School Portal</h1>
        <p className="type-body text-muted-foreground">Select your account type to continue.</p>
      </div>

      <React.Suspense fallback={null}>
        <PortalSignedInNotice />
      </React.Suspense>

      <ul className="flex flex-col gap-4">
        {portalRoleList.map((role, index) => (
          <li key={role.id}>
            <PortalRoleCard role={role} featured={index === 0} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export { PortalGateway }
