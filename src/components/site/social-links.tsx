import { cn } from "cn"

import { siteConfig } from "@/lib/site-config"

type Network = "facebook" | "instagram" | "youtube" | "x"

const networks: { key: Network; label: string; path: React.ReactNode }[] = [
  {
    key: "facebook",
    label: "Facebook",
    path: <path d="M14 8.5V7c0-.8.4-1.2 1.3-1.2H17V3h-2.4C12 3 10.7 4.6 10.7 6.8v1.7H8.5V11.5h2.2V21H14v-9.5h2.6l.4-3H14Z" fill="currentColor" stroke="none" />,
  },
  {
    key: "instagram",
    label: "Instagram",
    path: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    key: "youtube",
    label: "YouTube",
    path: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
        <path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  { key: "x", label: "X", path: <path d="m5 4 14 16M19 4 5 20" /> },
]

/** Social icons. A network with no URL in siteConfig is shown as an inactive icon ("link coming soon"), never as a dead link. */
function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {networks.map(({ key, label, path }) => {
        const url = siteConfig.social[key]
        const icon = (
          <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {path}
          </svg>
        )
        const base = "flex size-10 items-center justify-center rounded-full border border-white/25 text-brand-100"
        return (
          <li key={key}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} className={cn(base, "transition-colors hover:bg-white hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white")}>
                {icon}
              </a>
            ) : (
              <span role="img" aria-label={`${label}: link coming soon`} title={`${label}: coming soon`} className={cn(base, "opacity-60")}>
                {icon}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export { SocialLinks }
