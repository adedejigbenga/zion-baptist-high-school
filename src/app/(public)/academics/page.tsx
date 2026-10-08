import type { Metadata } from "next"
import { BookOpenIcon, ClipboardCheckIcon, HandHeartIcon, LightbulbIcon, MessageCircleIcon, TrophyIcon, UsersIcon } from "lucide-react"

import { CtaBand, FeatureGrid, Section, ToBeConfirmed } from "@/components/site/blocks"
import { PageHero } from "@/components/site/page-hero"
import { academicCards, programmeAreas } from "@/lib/public-content"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Academics",
  description: "How teaching and learning work at Zion Baptist High School: our academic philosophy, programme areas, assessment and student support.",
  path: "/academics",
})

const approach = [
  { icon: LightbulbIcon, title: "Explain clearly", description: "Lessons start from what students already know and build step by step." },
  { icon: ClipboardCheckIcon, title: "Practise and check", description: "Regular exercises, questions and feedback show where help is needed." },
  { icon: HandHeartIcon, title: "Support every learner", description: "Teachers follow up with students who are struggling and stretch those who are ready." },
  { icon: TrophyIcon, title: "Celebrate progress", description: "Effort and improvement are recognised, not only top scores." },
]

const supportItems = [
  { icon: UsersIcon, title: "Close monitoring", description: "Teachers follow each student's progress through the term." },
  { icon: MessageCircleIcon, title: "Talking with families", description: "Parents and guardians are contacted when a student needs encouragement or extra help." },
  { icon: BookOpenIcon, title: "Good study habits", description: "Students are taught how to revise, organise their work and manage their time." },
]

export default function AcademicsPage() {
  return (
    <>
      <PageHero
        eyebrow="Academics"
        title="Academic excellence, step by step"
        description="Good teaching, clear expectations and steady support, so every student can learn, improve and succeed."
        trail={[{ label: "Academics" }]}
      />

      <Section id="philosophy" eyebrow="Our approach" title="Academic philosophy" description="We believe every student can make real progress when teaching is clear, expectations are high and help is close at hand.">
        <FeatureGrid items={academicCards} />
      </Section>

      <Section id="curriculum" tone="subtle" eyebrow="Curriculum" title="What students study" description="Learning is organised into broad programme areas. The exact subjects offered in each class are set by the school each session.">
        <FeatureGrid items={programmeAreas} columns={3} />
        <p className="flex flex-wrap items-center gap-2 type-body-sm text-muted-foreground">
          <ToBeConfirmed>Subject list and curriculum details to be confirmed by the school</ToBeConfirmed>
        </p>
      </Section>

      <Section id="teaching" eyebrow="Teaching" title="Teaching approach">
        <FeatureGrid items={approach} />
      </Section>

      <Section id="assessment" tone="subtle" eyebrow="Assessment" title="How progress is measured" description="Students are assessed through continuous work during the term and an end-of-term examination. Results are recorded by their teachers and published to students and families through the school portal.">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { title: "Continuous assessment", text: "Class work, tests and projects during the term." },
            { title: "End-of-term examination", text: "A formal check of what has been learned." },
            { title: "Results in the portal", text: "Published results can be viewed by students once the school has reviewed and released them." },
          ].map(({ title, text }) => (
            <div key={title} className="rounded-xl border border-brand-100 bg-card p-6">
              <h3 className="type-card-title text-foreground">{title}</h3>
              <p className="mt-2 type-body-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="support" eyebrow="Support" title="Student support and academic excellence" description="Students who aim higher are challenged; those who need extra help are supported early.">
        <FeatureGrid items={supportItems} columns={3} />
      </Section>

      <CtaBand
        title="Start your child's journey with us"
        description="Find out how admission works and what to prepare."
        primary={{ label: "Admissions", href: "/admissions" }}
        secondary={{ label: "Contact Us", href: "/contact" }}
      />
    </>
  )
}
