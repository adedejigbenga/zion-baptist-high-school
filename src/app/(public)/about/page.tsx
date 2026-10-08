import type { Metadata } from "next"
import { CompassIcon, EyeIcon, HandHeartIcon, HeartHandshakeIcon, TargetIcon, UsersIcon } from "lucide-react"

import { CtaBand, FeatureGrid, Section } from "@/components/site/blocks"
import { PageHero } from "@/components/site/page-hero"
import { SchoolImage } from "@/components/site/school-image"
import { Card, CardContent } from "@/components/ui/card"
import { coreValues } from "@/lib/public-content"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description: "Learn about Zion Baptist High School: our mission, vision, values and the educational philosophy behind our school community.",
  path: "/about",
})

const whyChoose = [
  { icon: UsersIcon, title: "Teachers who know your child", description: "Students are known by name and encouraged to ask, try and improve." },
  { icon: HeartHandshakeIcon, title: "Values you can trust", description: "A Christ-centred community with clear expectations for conduct." },
  { icon: CompassIcon, title: "More than examinations", description: "Leadership, service and purpose are part of school life." },
  { icon: HandHeartIcon, title: "A partnership with families", description: "Parents and teachers work together for each student's progress." },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="A school built on learning, character and faith"
        description="Zion Baptist High School is a Christian secondary school committed to sound learning, good character and a caring school community."
        trail={[{ label: "About Us" }]}
      />

      <Section id="introduction" eyebrow="Our school" title="Who we are">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-4 type-body text-pretty text-muted-foreground">
            <p>
              Zion Baptist High School exists to help young people become capable, confident and principled. We teach
              the curriculum well, and we also teach students how to live: with honesty, respect and a sense of
              responsibility to others.
            </p>
            <p>
              Our teachers set clear expectations, explain patiently and notice each student&apos;s progress. Our
              community is guided by Christian values, and we welcome families who share a commitment to learning,
              discipline and care.
            </p>
          </div>
          <SchoolImage slot="about" className="aspect-[4/3] rounded-2xl border border-border shadow-md" />
        </div>
      </Section>

      <Section id="mission-vision" tone="subtle" eyebrow="Purpose" title="Mission and vision">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { icon: TargetIcon, title: "Our mission", text: "To provide a sound, Christ-centred education that develops each student's mind, character and sense of purpose." },
            { icon: EyeIcon, title: "Our vision", text: "A school community whose graduates serve their families, their communities and their country with knowledge, integrity and faith." },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} className="h-full">
              <CardContent className="flex flex-col gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="type-card-title text-foreground">{title}</h3>
                <p className="type-body text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="type-caption font-normal text-muted-foreground">
          The mission and vision above are working statements. The school may replace them with its official wording.
        </p>
      </Section>

      <Section id="values" eyebrow="What we stand for" title="Core values">
        <FeatureGrid items={coreValues} />
      </Section>

      <Section id="philosophy" tone="subtle" eyebrow="How we teach" title="Educational philosophy and character development">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            { title: "Educational philosophy", text: "Learning works best when expectations are high and support is steady. We teach concepts clearly, practise them regularly, and check understanding often." },
            { title: "Character development", text: "Good habits are taught, not assumed. Punctuality, respect, honesty and self-control are part of daily routines, assemblies and the way staff relate to students." },
            { title: "Leadership and student development", text: "Students are given real responsibilities, from class duties to leading activities, so that confidence and service grow together." },
          ].map(({ title, text }) => (
            <div key={title} className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-card p-6">
              <h3 className="type-card-title text-foreground">{title}</h3>
              <p className="type-body-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="why" eyebrow="Why Zion" title="Why choose Zion Baptist High School">
        <FeatureGrid items={whyChoose} />
      </Section>

      <CtaBand
        title="Come and see our school"
        description="Talk to us about admissions and how Zion Baptist High School can support your child."
        primary={{ label: "Admissions", href: "/admissions" }}
        secondary={{ label: "Contact Us", href: "/contact" }}
      />
    </>
  )
}
