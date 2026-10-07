import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
 * Badges carry meaning, so NEVER rely on colour alone: every status badge must contain readable text and,
 * for status, a leading icon (e.g. <Badge variant="success"><CheckCircle2 /> Published</Badge>).
 * Soft backgrounds with dark text keep contrast >= 4.5:1.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 type-caption whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-brand-200",
        neutral:
          "border-neutral-soft-border bg-neutral-soft text-neutral-soft-foreground",
        info: "border-info-soft-border bg-info-soft text-info-soft-foreground",
        success: "border-success-soft-border bg-success-soft text-success-soft-foreground",
        warning: "border-warning-soft-border bg-warning-soft text-warning-soft-foreground",
        destructive:
          "border-destructive-soft-border bg-destructive-soft text-destructive-soft-foreground",
        outline: "border-input text-foreground [a]:hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
