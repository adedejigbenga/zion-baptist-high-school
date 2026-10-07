import * as React from "react"
import { cn } from "cn"

type SectionHeadingProps = {
  /** Small label above the title. */
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: "left" | "center"
  /** Heading level to render. The look is always the section-title style. */
  as?: "h1" | "h2" | "h3"
  id?: string
  className?: string
}

/** Consistent heading block for public-site sections. */
function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Tag = "h2",
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      {eyebrow && (
        <p className="type-caption font-semibold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
      )}
      <Tag id={id} className="type-section-title text-balance text-brand-900 md:text-[1.75rem] lg:text-[2rem]">
        {title}
      </Tag>
      {description && (
        <p className={cn("type-body max-w-[60ch] text-pretty text-muted-foreground", align === "center" && "mx-auto")}>
          {description}
        </p>
      )}
    </div>
  )
}

export { SectionHeading }
