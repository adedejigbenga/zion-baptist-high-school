import type { MetadataRoute } from "next"

const paths = ["/", "/about", "/academics", "/facilities", "/admissions", "/student-life", "/news", "/contact", "/privacy", "/terms"]

/** Public pages only. The portal is deliberately not listed. Absolute URLs come from metadataBase (see app/layout.tsx). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  return paths.map((path) => ({ url: `${base}${path === "/" ? "" : path}` }))
}
