import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "cn"

import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { PortalRoleConfig } from "@/lib/portal-config"

type PortalRoleCardProps = {
  role: PortalRoleConfig
  /** Visually emphasise this option (primary button, tinted border). */
  featured?: boolean
}

/**
 * One selectable portal option. The whole card is clickable through a stretched link on the CTA,
 * so there is a single, labelled tab stop per card.
 */
function PortalRoleCard({ role, featured = false }: PortalRoleCardProps) {
  const Icon = role.icon

  return (
    <Card
      interactive
      className={cn("gap-4", featured && "border-primary/40 shadow-sm")}
      data-role={role.id}
    >
      <div className="flex items-start gap-4 px-(--card-spacing)">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg",
            featured ? "bg-primary text-primary-foreground" : "bg-brand-100 text-primary"
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="type-card-title text-foreground md:text-lg">{role.name}</h2>
          <p className="type-body-sm text-muted-foreground">{role.gatewayDescription}</p>
        </div>
      </div>

      <div className="px-(--card-spacing)">
        <Link
          href={role.loginHref}
          className={buttonVariants({
            variant: featured ? "default" : "outline",
            className: "w-full after:absolute after:inset-0 after:content-[''] sm:w-auto",
          })}
        >
          {role.gatewayCta}
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}

export { PortalRoleCard }
