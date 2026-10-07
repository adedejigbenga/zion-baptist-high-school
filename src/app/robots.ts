import type { MetadataRoute } from "next"

/**
 * Keeps search engines away while the site still contains placeholder content (demo news, sample contact details).
 * When the school approves the content, set NEXT_PUBLIC_ALLOW_INDEXING=true in the hosting settings to open it up.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true") {
    return { rules: { userAgent: "*", allow: "/", disallow: "/portal" } }
  }
  return { rules: { userAgent: "*", disallow: "/" } }
}
