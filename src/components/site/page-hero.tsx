import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

/** "Home > About Us" trail. The last item is the current page. */
function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 type-body-sm text-brand-100">
        <li>
          <Link href="/" className="rounded-sm hover:text-white hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Home
          </Link>
        </li>
        {trail.map((item, index) => {
          const last = index === trail.length - 1
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              <ChevronRightIcon className="size-3.5 text-brand-300" aria-hidden="true" />
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className="font-medium text-white">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="rounded-sm hover:text-white hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Banner at the top of every inner public page: breadcrumb, the page's only <h1>, a short description, optional actions. */
function PageHero({
  eyebrow,
  title,
  description,
  trail,
  children,
}: {
  eyebrow?: string
  title: string
  description: string
  trail: { label: string; href?: string }[]
  children?: React.ReactNode
}) {
  return (
    <section aria-labelledby="page-title" className="relative isolate overflow-hidden bg-brand-gradient">
      <div aria-hidden="true" className="absolute -top-24 -right-16 -z-10 size-72 rounded-full border border-white/15" />
      <div aria-hidden="true" className="absolute -top-6 right-8 -z-10 size-44 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -bottom-24 left-1/3 -z-10 size-64 rounded-full bg-white/5" />
      <div className="page-container flex flex-col gap-5 py-10 md:py-14 lg:py-16">
        <Breadcrumb trail={trail} />
        <div className="flex max-w-3xl flex-col gap-4">
          {eyebrow && <p className="type-caption font-semibold tracking-[0.14em] text-brand-200 uppercase">{eyebrow}</p>}
          <h1 id="page-title" className="type-display text-balance text-white">
            {title}
          </h1>
          <p className="type-body text-pretty text-brand-100 md:text-lg md:leading-relaxed">{description}</p>
        </div>
        {children && <div className="flex flex-col gap-3 pt-2 sm:flex-row">{children}</div>}
      </div>
    </section>
  )
}

export { Breadcrumb, PageHero }
