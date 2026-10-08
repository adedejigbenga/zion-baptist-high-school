import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { FeatureGrid, Section } from "@/components/site/blocks"
import { buttonVariants } from "@/components/ui/button"
import { academicCards } from "@/lib/public-content"

function AcademicsSection() {
  return (
    <Section
      id="academics"
      tone="subtle"
      eyebrow="Academics"
      title="Academic Excellence"
      description="Good teaching, clear expectations and steady support, so every student can learn, improve and succeed."
      action={
        <Link href="/academics" className={buttonVariants({ variant: "outline", className: "self-start md:self-auto" })}>
          Explore Academics
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      }
    >
      <FeatureGrid items={academicCards} />
    </Section>
  )
}

export { AcademicsSection }
