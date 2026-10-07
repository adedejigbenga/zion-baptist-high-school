import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

/** "← Back ..." link used at the top of portal pages. */
function PortalBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex w-fit items-center gap-2 rounded-lg px-1 py-1.5 type-label text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:py-3"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      {label}
    </Link>
  )
}

export { PortalBackLink }
