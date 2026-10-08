import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// One family, variable weights (400-700 used). Exposed to Tailwind as --font-sans in globals.css.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

// Absolute base for canonical and Open Graph URLs. Set NEXT_PUBLIC_SITE_URL to the real domain when it exists.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zion Baptist High School",
    template: "%s | Zion Baptist High School",
  },
  description: "Zion Baptist High School",
  // Placeholder content: hidden from search engines until NEXT_PUBLIC_ALLOW_INDEXING=true (see app/robots.ts).
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#6d28d9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
