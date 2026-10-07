import { BookOpenCheckIcon, MegaphoneIcon, UserRoundIcon, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { BrandLogo } from "@/components/layout/brand-logo"

const features: { icon: LucideIcon; title: string; text: string; offset: string }[] = [
  { icon: BookOpenCheckIcon, title: "Academic results", text: "Published results in one place", offset: "" },
  { icon: UserRoundIcon, title: "Profiles", text: "Student and teacher information", offset: "xl:ml-8" },
  { icon: MegaphoneIcon, title: "Announcements", text: "News from the school", offset: "xl:ml-16" },
]

/**
 * Branded left panel shared by the portal gateway and the login pages.
 * Compact banner on phones and tablets; full-height sticky column from lg up.
 */
function PortalBrandPanel() {
  return (
    <aside
      aria-label="Zion Baptist High School"
      className="relative isolate overflow-hidden bg-brand-gradient px-(--page-gutter) py-6 sm:py-8 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[42%] lg:max-w-[40rem] lg:shrink-0 lg:flex-col lg:justify-between lg:p-12"
    >
      {/* decorative rings */}
      <div aria-hidden="true" className="absolute -top-28 -right-24 -z-10 size-80 rounded-full border border-white/15" />
      <div aria-hidden="true" className="absolute -top-12 -right-8 -z-10 size-52 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-24 -z-10 size-96 rounded-full bg-white/5" />
      <div aria-hidden="true" className="absolute -bottom-10 left-1/2 -z-10 hidden size-64 rounded-full border border-white/10 lg:block" />

      <BrandLogo tone="inverse" className="self-start" />

      <div className="mt-6 flex flex-col gap-4 lg:mt-0">
        <p className="type-caption font-semibold tracking-[0.14em] text-brand-200 uppercase">School Portal</p>
        <p
          className="type-page-title max-w-[16ch] text-balance text-white sm:text-[1.875rem] lg:text-[2.5rem] lg:leading-[1.1]"
        >
          Your school experience, connected.
        </p>
        <p className="hidden max-w-[44ch] type-body text-pretty text-brand-100 sm:block">
          Students, teachers and administrators can securely access their school information in one place.
        </p>

        <ul className="mt-4 hidden flex-col gap-3 lg:flex">
          {features.map(({ icon: Icon, title, text, offset }) => (
            <li
              key={title}
              className={cn(
                "flex w-full max-w-[22rem] items-center gap-4 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm",
                offset
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col">
                <span className="type-label text-white">{title}</span>
                <span className="type-caption font-normal text-brand-200">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="hidden type-caption font-normal text-brand-200 lg:block">
        &copy; 2026 Zion Baptist High School
      </p>
    </aside>
  )
}

export { PortalBrandPanel }
