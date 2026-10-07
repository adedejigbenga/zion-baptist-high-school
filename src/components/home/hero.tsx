import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react"

import { CampusIllustration } from "@/components/home/campus-illustration"
import { buttonVariants } from "@/components/ui/button"
import { siteConfig } from "@/lib/site-config"

function Hero() {
  const photo = siteConfig.heroImage

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-[linear-gradient(to_bottom,transparent_60%,var(--background)),radial-gradient(48rem_28rem_at_88%_-8%,var(--color-brand-100),transparent_70%),radial-gradient(36rem_24rem_at_-6%_105%,var(--color-brand-50),transparent_70%)]"
    >
      <div className="page-container grid items-center gap-10 pt-10 pb-20 md:pt-14 md:pb-24 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-20 lg:pb-32">
        <div className="flex flex-col items-start gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-card px-3.5 py-1.5 type-caption font-semibold text-brand-800 shadow-xs">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {siteConfig.tagline}
          </p>

          <h1 id="hero-heading" className="type-display text-brand-950">
            Welcome to
            <span className="block text-primary">{siteConfig.name}</span>
          </h1>

          <p className="type-body max-w-[52ch] text-pretty text-muted-foreground md:text-lg md:leading-relaxed">
            A school where students are taught to think well, work hard and live with integrity, supported by
            teachers who care and a community that holds them to a high standard.
          </p>

          <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
            <Link href={siteConfig.portalHref} className={buttonVariants({ size: "lg" })}>
              Visit the Portal
              <ArrowRightIcon aria-hidden="true" />
            </Link>
            <Link href="/about" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Learn More
            </Link>
          </div>
        </div>

        <div className="relative pr-3 pb-3 sm:pr-5 sm:pb-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000">
          {/* offset lavender shape behind the visual */}
          <div aria-hidden="true" className="absolute inset-0 top-5 left-5 rounded-xl border border-brand-200 bg-brand-100" />

          <div className="relative aspect-[5/4] overflow-hidden rounded-xl border border-border bg-brand-50 shadow-md">
            {photo ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            ) : (
              <CampusIllustration className="size-full" />
            )}
          </div>

          <div className="absolute bottom-0 left-0 hidden items-center gap-3 rounded-xl border border-border bg-card p-3 pr-4 shadow-md sm:flex lg:-left-6 lg:bottom-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-primary">
              <ShieldCheckIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="type-label text-foreground">Safe and supportive</span>
              <span className="type-caption font-normal text-muted-foreground">learning environment</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Hero }
