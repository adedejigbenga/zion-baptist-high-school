import { siteConfig } from "@/lib/site-config"

/** Hour of the day (0-23) in the school's time zone, whatever time zone the server runs in. */
export function schoolHour(now: Date, timeZone: string = siteConfig.timeZone): number {
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now)
  return Number(hour)
}

/** "Good morning" (before 12:00), "Good afternoon" (12:00-16:59), "Good evening" (17:00 onwards), in school time. */
export function greetingFor(now: Date, timeZone: string = siteConfig.timeZone): string {
  const hour = schoolHour(now, timeZone)
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
