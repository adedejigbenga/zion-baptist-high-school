import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon, GraduationCapIcon, SchoolIcon, TrophyIcon, type LucideIcon } from "lucide-react"

import { SectionHeading } from "@/components/layout/section-heading"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

const areas: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: BookOpenIcon,
    title: "Academic Excellence",
    description: "A structured curriculum that helps students build knowledge, confidence and good study habits.",
  },
  {
    icon: GraduationCapIcon,
    title: "Qualified Teachers",
    description: "Teachers who guide, encourage and keep high standards in every classroom.",
  },
  {
    icon: TrophyIcon,
    title: "Student Development",
    description: "Opportunities beyond lessons to grow in leadership, teamwork and responsibility.",
  },
  {
    icon: SchoolIcon,
    title: "Learning Environment",
    description: "A safe, orderly and welcoming campus where students can focus and do well.",
  },
]

function AcademicsSection() {
  return (
    <section aria-labelledby="academics-heading" className="page-section border-y border-border bg-card">
      <div className="page-container flex flex-col gap-10 lg:gap-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Academics"
            id="academics-heading"
            title="Preparing Students for Excellence"
            description="From the first day in class to the final examinations, we support students at every stage."
          />
          <Link href="/academics" className={buttonVariants({ variant: "outline", className: "self-start md:self-auto" })}>
            Explore Academics
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {areas.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex">
              <Card variant="subtle" className="w-full">
                <CardHeader className="gap-4">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-brand-100">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="type-card-title text-foreground">
                    {title}
                  </h3>
                </CardHeader>
                <CardContent>
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export { AcademicsSection }
