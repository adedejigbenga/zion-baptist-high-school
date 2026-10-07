import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

/**
 * A styled native <select>. Native is deliberate for short lists: it is fully keyboard and screen-reader accessible,
 * and phones show their own touch-friendly picker. Same size, border and focus treatment as Input.
 * Always pair it with a <Label htmlFor>.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-card py-1 pr-10 pl-3 text-base text-foreground shadow-xs transition-colors outline-none hover:border-primary/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive md:h-10 md:text-sm",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}

export { NativeSelect }
