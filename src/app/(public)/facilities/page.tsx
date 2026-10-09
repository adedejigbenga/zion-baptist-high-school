import type { Metadata } from "next"
import { ShieldCheckIcon, SmileIcon, TreesIcon, UsersIcon } from "lucide-react"

import { FacilityCards } from "@/components/home/facilities-section"
import { CtaBand, FeatureGrid, Section } from "@/components/site/blocks"
import { PageHero } from "@/components/site/page-hero"
import { SchoolImage } from "@/components/site/school-image"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Facilities",
  description: "The classrooms, laboratory, ICT lab, library and sports spaces that support learning at Zion Baptist High School.",
  path: "/facilities",
})

const environment = [
  { icon: ShieldCheckIcon, title: "Safe and supervised", description: "Students are looked after by staff throughout the school day." },
  { icon: SmileIcon, title: "Calm and orderly", description: "Clear routines help classrooms stay focused and respectful." },
  { icon: UsersIcon, title: "Student spaces", description: "Places to gather, eat and relax between lessons." },
  { icon: TreesIcon, title: "Room to play", description: "Outdoor space for breaks, games and school events." },
]

export default function FacilitiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Facilities"
        title="A learning environment that supports every student"
        description="Classrooms, laboratory, ICT, library and sports spaces that help students study, explore and grow."
        trail={[{ label: "Facilities" }]}
      />

      <Section id="learning-spaces" eyebrow="Learning spaces" title="Classrooms, labs, library and sport">
        <FacilityCards />
      </Section>

      <Section id="environment" tone="subtle" eyebrow="Safety and wellbeing" title="Safety and the learning environment" description="A school works best when students feel safe, known and settled.">
        <FeatureGrid items={environment} />
      </Section>

      <Section id="gallery" eyebrow="Gallery" title="Around the school">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SchoolImage slot="campus" className="aspect-[4/3] rounded-xl sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:min-h-80" />
          <SchoolImage slot="assembly" className="aspect-[4/3] rounded-xl" />
          <SchoolImage slot="classrooms" className="aspect-[4/3] rounded-xl" />
        </div>
        <p className="type-caption font-normal text-muted-foreground">Illustrations are shown until the school adds its own photographs.</p>
      </Section>

      <CtaBand
        title="See it for yourself"
        description="Contact the school to ask about visiting and meeting our teachers."
        primary={{ label: "Contact Us", href: "/contact" }}
        secondary={{ label: "Admissions", href: "/admissions" }}
      />
    </>
  )
}
