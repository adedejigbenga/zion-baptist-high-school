import type { Metadata } from "next"
import { CalendarDaysIcon, CompassIcon, GraduationCapIcon, MusicIcon, PaletteIcon, TrophyIcon, UsersIcon } from "lucide-react"

import { GalleryGrid } from "@/components/home/student-life-section"
import { CtaBand, FeatureGrid, Section } from "@/components/site/blocks"
import { PageHero } from "@/components/site/page-hero"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Student Life",
  description: "Sports, clubs, arts, cultural activities, leadership and events: life beyond the classroom at Zion Baptist High School.",
  path: "/student-life",
})

const activities = [
  { icon: TrophyIcon, title: "Sports", description: "Team games and athletics that build fitness, teamwork and fair play." },
  { icon: UsersIcon, title: "Clubs", description: "Interest groups where students explore science, reading, debate and more." },
  { icon: PaletteIcon, title: "Arts", description: "Drawing, crafts and creative projects that build imagination." },
  { icon: MusicIcon, title: "Cultural activities", description: "Music, drama and celebrations of our heritage." },
  { icon: CompassIcon, title: "Leadership", description: "Prefects, class monitors and student-led responsibilities." },
  { icon: CalendarDaysIcon, title: "Events", description: "Assemblies, ceremonies and programmes through the school year." },
]

export default function StudentLifePage() {
  return (
    <>
      <PageHero
        eyebrow="Student Life"
        title="Learning beyond the classroom"
        description="Sport, science, the arts and school events give students room to discover their talents and grow in confidence."
        trail={[{ label: "Student Life" }]}
      />

      <Section id="activities" eyebrow="Get involved" title="Activities and programmes" description="Each term the school sets out which clubs and activities are running. Students are encouraged to take part in at least one.">
        <FeatureGrid items={activities} columns={3} />
      </Section>

      <Section id="development" tone="subtle" eyebrow="Growing up well" title="Student development" description="We want students to leave school with more than good grades: confidence, kindness, and the habit of serving others. Leadership roles, group projects and community activities all help.">
        <div className="flex items-center gap-3 type-body-sm text-muted-foreground">
          <GraduationCapIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
          Specific clubs and programmes are confirmed by the school each session.
        </div>
      </Section>

      <Section id="gallery" eyebrow="Gallery" title="Moments from school life">
        <GalleryGrid />
        <p className="type-caption font-normal text-muted-foreground">Illustrations are shown until the school adds its own photographs.</p>
      </Section>

      <Section id="alumni" tone="subtle" eyebrow="Alumni" title="Our alumni" description="Former students remain part of the Zion Baptist High School family. An alumni page and contact form will be added; until then, alumni are welcome to get in touch through the school office."/>

      <CtaBand
        title="Be part of our community"
        description="Find out how your child can join Zion Baptist High School."
        primary={{ label: "Admissions", href: "/admissions" }}
        secondary={{ label: "Contact Us", href: "/contact" }}
      />
    </>
  )
}
