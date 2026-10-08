import type { Metadata } from "next"

import { AcademicsSection } from "@/components/home/academics-section"
import { FacilitiesSection } from "@/components/home/facilities-section"
import { Hero } from "@/components/home/hero"
import { NewsSection } from "@/components/home/news-section"
import { Strengths } from "@/components/home/strengths"
import { StudentLifeSection } from "@/components/home/student-life-section"
import { WelcomeSection } from "@/components/home/welcome-section"
import { CtaBand } from "@/components/site/blocks"
import { demoNews } from "@/lib/demo/news"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} | ${siteConfig.tagline}` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: siteConfig.name, title: siteConfig.name, description: siteConfig.description, url: "/" },
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Strengths />
      <WelcomeSection />
      <AcademicsSection />
      <FacilitiesSection />
      <StudentLifeSection />
      {/* TEMPORARY: demo content. Replace with published news from the data layer later. */}
      <NewsSection items={demoNews} />
      <CtaBand
        title="Admissions Are Open"
        description="Give your child a strong foundation for academic success, character and purpose."
        primary={{ label: "Apply Now", href: "/admissions#apply" }}
        secondary={{ label: "Enquire About Admissions", href: "/contact?topic=admissions" }}
      />
    </>
  )
}
