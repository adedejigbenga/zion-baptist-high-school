import Link from "next/link"
import { ArrowRightIcon, ClipboardListIcon, FileTextIcon, MapPinIcon, type LucideIcon } from "lucide-react"

import { SectionHeading } from "@/components/layout/section-heading"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const topics: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ClipboardListIcon, title: "Admission requirements", text: "What we ask of prospective students." },
  { icon: FileTextIcon, title: "How to apply", text: "The steps for joining the school." },
  { icon: MapPinIcon, title: "Visiting the school", text: "How to reach us and ask questions." },
]

function AdmissionsSection() {
  return (
    <section
      aria-labelledby="admissions-heading"
      className="page-section relative isolate overflow-hidden border-b border-brand-100 bg-brand-50"
    >
      {/* soft decorative circle */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-brand-100 lg:size-96"
      />
      <div className="page-container grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <SectionHeading
            eyebrow="Admissions"
            id="admissions-heading"
            title="Begin Your Journey With Us"
            description="Prospective students and parents can find out about admission opportunities at Zion Baptist High School and what the next steps are."
          />
          <Link href="/admissions" className={buttonVariants({ size: "lg" })}>
            Explore Admissions
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>

        <Card className="gap-0 py-2">
          <h3 className="type-card-title px-(--card-spacing) pt-3 pb-2 text-foreground">What you can find out</h3>
          <ul className="flex flex-col">
            {topics.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex items-center gap-4 border-t border-border px-(--card-spacing) py-4 first:border-t-0"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="type-label text-foreground">{title}</p>
                  <p className="type-body-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  )
}

export { AdmissionsSection }
