import type { Metadata } from "next"

import { siteConfig } from "@/lib/site-config"

/**
 * Title, description, canonical path and Open Graph / Twitter text for a public page.
 * The root layout supplies `metadataBase`, so `path` can stay relative. No social image exists yet: add one to
 * `openGraph.images` here once the school has a real photograph.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: `${title} | ${siteConfig.name}`,
      description,
      url: path,
      locale: "en_NG",
    },
    twitter: { card: "summary", title: `${title} | ${siteConfig.name}`, description },
  }
}
