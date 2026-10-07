import * as React from "react"
import { AlertCircleIcon } from "lucide-react"
import { cn } from "cn"

/** Helper text under a control. Link it with aria-describedby. */
function FormHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="form-hint"
      className={cn("type-caption font-normal text-muted-foreground", className)}
      {...props}
    />
  )
}

/**
 * Validation message under a control. Renders nothing when there is no message.
 * Includes an icon so the error is not communicated by colour alone.
 * Link it with aria-describedby on the control and set aria-invalid on the control.
 */
function FormError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p
      data-slot="form-error"
      role="alert"
      className={cn("flex items-start gap-1.5 type-body-sm font-medium text-destructive", className)}
      {...props}
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export { FormHint, FormError }
