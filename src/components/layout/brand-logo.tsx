import Link from "next/link"
import { BookOpenIcon } from "lucide-react"
import { cn } from "cn"

import { siteConfig } from "@/lib/site-config"

/**
 * TEMPORARY logo mark: a simple shield with an open book. This is NOT the school's official crest.
 * To use the real logo, replace the body of <LogoMark /> with <Image src="/images/logo.svg" ... />
 * (or swap the whole component). Nothing else needs to change.
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-10 shrink-0 items-center justify-center", className)}>
      <svg viewBox="0 0 40 46" className="absolute inset-0 size-full" aria-hidden="true" focusable="false">
        <path
          d="M20 1.5 3 7.5v13.2c0 11.1 7.1 19.6 17 23.8 9.9-4.2 17-12.7 17-23.8V7.5L20 1.5Z"
          className="fill-primary stroke-brand-900"
          strokeWidth="1.5"
        />
        <path
          d="M20 5.5 6.5 10.2v10.5c0 8.8 5.5 15.7 13.5 19.4 8-3.7 13.5-10.6 13.5-19.4V10.2L20 5.5Z"
          className="fill-none stroke-white/30"
          strokeWidth="1"
        />
      </svg>
      <BookOpenIcon className="relative size-[1.15rem] -translate-y-0.5 text-white" aria-hidden="true" />
    </span>
  )
}

type BrandLogoProps = {
  /** "inverse" is for use on dark / brand-coloured backgrounds. */
  tone?: "default" | "inverse"
  /** Render as a link to the homepage (header, footer). */
  asLink?: boolean
  className?: string
}

function BrandLogo({ tone = "default", asLink = true, className }: BrandLogoProps) {
  const content = (
    <>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[0.9375rem] font-bold tracking-[0.06em] whitespace-nowrap",
            tone === "inverse" ? "text-white" : "text-brand-900"
          )}
        >
          {siteConfig.wordmark.line1}
        </span>
        <span
          className={cn(
            "mt-1 text-[0.6875rem] font-semibold tracking-[0.3em] whitespace-nowrap",
            tone === "inverse" ? "text-brand-200" : "text-primary"
          )}
        >
          {siteConfig.wordmark.line2}
        </span>
      </span>
    </>
  )

  const classes = cn("inline-flex items-center gap-3 rounded-lg", className)

  if (!asLink) return <span className={classes}>{content}</span>

  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} - home`}
      className={cn(
        classes,
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      )}
    >
      {content}
    </Link>
  )
}

export { BrandLogo, LogoMark }
