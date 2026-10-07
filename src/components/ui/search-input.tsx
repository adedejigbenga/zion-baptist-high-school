import * as React from "react"
import { SearchIcon } from "lucide-react"
import { cn } from "cn"

import { Input } from "@/components/ui/input"

/**
 * Search field with a leading icon. Presentational only.
 * Pair it with a visible or screen-reader-only label, and pass aria-label if there is no <label>.
 */
function SearchInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input {...props} type="search" className={cn("pl-9", className)} />
    </div>
  )
}

export { SearchInput }
