import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { CampusIllustration } from "@/components/home/campus-illustration"
import { SchoolImage } from "@/components/site/school-image"
import { buttonVariants } from "@/components/ui/button"
import { siteImages } from "@/lib/site-images"

/**
 * Large homepage hero. Shows the campus photo when one is set in src/lib/site-images.ts; until then a tinted campus
 * illustration stands in. A deep-purple overlay keeps the white text readable either way.
 */
function Hero() {
  const hasPhoto = Boolean(siteImages.hero.src)

  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-brand-950">
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        {hasPhoto ? (
          <SchoolImage slot="hero" priority sizes="100vw" className="size-full" />
        ) : (
          <CampusIllustration className="size-full object-cover opacity-45 mix-blend-luminosity" />
        )}
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-brand-950 via-brand-950/80 to-brand-900/30 max-md:bg-brand-950/75" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-linear-to-t from-brand-950/70 to-transparent" />

      <div className="page-container flex min-h-[28rem] flex-col justify-center gap-6 pt-14 pb-32 md:min-h-[32rem] md:pt-20 md:pb-40 lg:min-h-[36rem] lg:pb-44">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 type-caption font-semibold text-brand-100 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-brand-300" aria-hidden="true" />
          Zion Baptist High School
        </p>

        <h1 id="hero-heading" className="type-display max-w-3xl text-balance text-white">
          Building Character.
          <span className="block text-brand-200">Inspiring Excellence.</span>
        </h1>

        <p className="type-body max-w-[52ch] text-pretty text-brand-100 md:text-lg md:leading-relaxed">
          Zion Baptist High School is a Christian secondary school where students are taught to think well, work hard
          and live with integrity, supported by teachers who care and a community that holds them to a high standard.
        </p>

        <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
          <Link href="/admissions#apply" className={buttonVariants({ variant: "inverse", size: "lg" })}>
            Apply Now
            <ArrowRightIcon aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className={buttonVariants({ variant: "outline", size: "lg", className: "border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white" })}
          >
            Explore Our School
          </Link>
        </div>
      </div>
    </section>
  )
}

export { Hero }
