import Image from "next/image"
import {
  BookOpenIcon,
  CalendarDaysIcon,
  FlaskConicalIcon,
  GraduationCapIcon,
  LaptopIcon,
  LibraryIcon,
  MicroscopeIcon,
  PaletteIcon,
  SchoolIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

import { siteImages, type ImageSlot } from "@/lib/site-images"

const slotIcon: Record<ImageSlot, LucideIcon> = {
  hero: SchoolIcon,
  welcome: UsersIcon,
  about: UsersIcon,
  classrooms: BookOpenIcon,
  laboratory: MicroscopeIcon,
  ict: LaptopIcon,
  library: LibraryIcon,
  sports: TrophyIcon,
  science: FlaskConicalIcon,
  events: CalendarDaysIcon,
  arts: PaletteIcon,
  activities: UsersIcon,
  assembly: GraduationCapIcon,
  campus: SchoolIcon,
}

/**
 * One photograph of the school. Shows the real photo configured in src/lib/site-images.ts, or a clearly labelled
 * placeholder until then. The wrapper fills its parent: give it a size (aspect ratio or height) through `className`.
 */
function SchoolImage({
  slot,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  showLabel = true,
  position,
}: {
  slot: ImageSlot
  className?: string
  sizes?: string
  priority?: boolean
  /** Print the slot's label on the placeholder (turn off where a caption already names it). */
  showLabel?: boolean
  /** CSS object-position for the crop (e.g. "50% 30%" keeps the upper part of a tall picture). */
  position?: string
}) {
  const config = siteImages[slot]
  if (config.src) {
    return (
      <div className={cn("relative overflow-hidden bg-brand-100", className)}>
        {/* SVG illustrations are already tiny and vector: skip the raster optimiser (which refuses SVG by default). */}
        <Image src={config.src} alt={config.alt} fill sizes={sizes} priority={priority} unoptimized={config.src.endsWith(".svg")} className="object-cover" style={position ? { objectPosition: position } : undefined} />
      </div>
    )
  }

  const Icon = slotIcon[slot]
  return (
    <div
      role="img"
      aria-label={`${config.label} placeholder`}
      className={cn("relative isolate flex items-center justify-center overflow-hidden bg-linear-to-br from-brand-200 via-brand-100 to-brand-50", className)}
    >
      <div aria-hidden="true" className="absolute -top-12 -right-12 -z-10 size-48 rounded-full bg-white/50" />
      <div aria-hidden="true" className="absolute -bottom-16 -left-10 -z-10 size-44 rounded-full bg-brand-300/40" />
      <div aria-hidden="true" className="flex flex-col items-center gap-2 px-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
          <Icon className="size-6" />
        </span>
        {showLabel && <span className="type-caption text-brand-800">{config.label}</span>}
      </div>
    </div>
  )
}

export { SchoolImage }
