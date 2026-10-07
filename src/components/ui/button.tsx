import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

/*
 * Variants map to the design system (see DESIGN-SYSTEM.md):
 *   default     = Primary   (one per view: the main action)
 *   secondary   = Secondary (soft purple, supporting action)
 *   outline     = Outline   (neutral alternative, e.g. Cancel)
 *   ghost       = Ghost     (toolbar / low emphasis)
 *   destructive = Destructive (delete, suspend, unpublish)
 *   success     = Success   (confirming positive actions, e.g. Publish)
 *   link        = text link styled as an action
 * Hover/active darken via color-mix so no extra tokens are needed.
 * Touch devices (pointer: coarse) get 44px-high targets automatically.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-semibold whitespace-nowrap transition-colors select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-[color-mix(in_oklab,var(--primary),black_14%)] active:bg-[color-mix(in_oklab,var(--primary),black_26%)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--primary)_14%)] active:bg-[color-mix(in_oklab,var(--secondary),var(--primary)_24%)] aria-expanded:bg-[color-mix(in_oklab,var(--secondary),var(--primary)_14%)]",
        outline:
          "border-input bg-card text-foreground shadow-xs hover:bg-muted hover:border-primary/60 active:bg-secondary aria-expanded:bg-muted",
        ghost:
          "text-foreground hover:bg-muted active:bg-secondary aria-expanded:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-[color-mix(in_oklab,var(--destructive),black_14%)] active:bg-[color-mix(in_oklab,var(--destructive),black_26%)] focus-visible:outline-destructive",
        success:
          "bg-success text-success-foreground shadow-xs hover:bg-[color-mix(in_oklab,var(--success),black_14%)] active:bg-[color-mix(in_oklab,var(--success),black_26%)] focus-visible:outline-success",
        link: "text-link h-auto rounded-sm px-0.5 font-medium",
      },
      size: {
        default:
          "h-10 gap-2 px-4 pointer-coarse:h-11 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-md px-2 text-xs pointer-coarse:h-9 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 pointer-coarse:h-10 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-base",
        icon: "size-10 pointer-coarse:size-11",
        "icon-xs": "size-7 rounded-md pointer-coarse:size-9 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 pointer-coarse:size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, sets aria-busy and blocks further clicks. Keep the label so the action stays readable. */
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading && (
        <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      )}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
