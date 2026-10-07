import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
 * One card for everything: statistics, announcements, result summaries, profile panels, action tiles.
 *   default : white, soft border, barely-there shadow (the standard surface)
 *   subtle  : lavender tint, no shadow (secondary panels, empty states, nested content)
 *   brand   : purple gradient (use at most once per view, for a featured/summary card)
 * `interactive` adds hover/focus affordance. Only use it when the whole card is a single link/button.
 * Padding comes from --card-pad (responsive); size="sm" is for dense cards.
 */
const cardVariants = cva(
  "group/card relative flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm [--card-spacing:var(--card-pad)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      variant: {
        default: "border border-border bg-card text-card-foreground shadow-xs",
        subtle: "border border-brand-100 bg-surface-subtle text-card-foreground",
        brand: "bg-brand-gradient shadow-md [--card-muted:var(--color-brand-100)]",
      },
      interactive: {
        true: "transition-[box-shadow,border-color] duration-150 hover:border-primary/40 hover:shadow-md focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25",
        false: "",
      },
    },
    defaultVariants: { variant: "default", interactive: false },
  }
)

function Card({
  className,
  size = "default",
  variant,
  interactive,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" } & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant ?? "default"}
      className={cn(cardVariants({ variant, interactive }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading type-card-title group-data-[size=sm]/card:text-sm", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "type-body-sm text-muted-foreground group-data-[variant=brand]/card:text-(--card-muted)",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-surface-subtle p-(--card-spacing) group-data-[variant=brand]/card:border-white/15 group-data-[variant=brand]/card:bg-black/10",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}

