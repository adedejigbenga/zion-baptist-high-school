import type { Metadata } from "next"

import { AboutSection } from "@/components/home/about-section"
import { AcademicsSection } from "@/components/home/academics-section"
import { AdmissionsSection } from "@/components/home/admissions-section"
import { Hero } from "@/components/home/hero"
import { Highlights } from "@/components/home/highlights"
import { NewsSection } from "@/components/home/news-section"
import { PortalCta } from "@/components/home/portal-cta"
import { demoNews } from "@/lib/demo/news"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} | ${siteConfig.tagline}` },
  description: siteConfig.description,
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Highlights />
      <AboutSection />
      <AcademicsSection />
      <AdmissionsSection />
      {/* TEMPORARY: demo content. Replace with published news from the data layer later. */}
      <NewsSection items={demoNews} />
      <PortalCta />
    </>
  )
}
