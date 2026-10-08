import {
  AwardIcon,
  BookOpenIcon,
  BrainIcon,
  CompassIcon,
  FlaskConicalIcon,
  GraduationCapIcon,
  HandHeartIcon,
  HeartHandshakeIcon,
  LaptopIcon,
  LibraryIcon,
  MicroscopeIcon,
  PaletteIcon,
  SchoolIcon,
  ShieldCheckIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import type { ImageSlot } from "@/lib/site-images"

/**
 * Descriptive public-site content shared by the homepage and the inner pages, so wording lives in one place.
 * It deliberately makes NO numerical or official claims (no pass rates, years of operation, affiliations, class sizes or
 * accreditations): add those only when the school confirms them.
 */

export type Feature = { icon: LucideIcon; title: string; description: string }
export type Showcase = { slot: ImageSlot; icon: LucideIcon; title: string; description: string }

/** The five-item strip under the hero. */
export const strengths: Feature[] = [
  { icon: GraduationCapIcon, title: "Qualified Teachers", description: "Committed educators who guide every student." },
  { icon: AwardIcon, title: "Academic Excellence", description: "High standards in every subject." },
  { icon: ShieldCheckIcon, title: "Safe Environment", description: "A caring, well-supervised school community." },
  { icon: HeartHandshakeIcon, title: "Character Development", description: "Discipline, integrity and Christ-centred values." },
  { icon: LaptopIcon, title: "Modern Learning", description: "Practical, well-organised learning spaces." },
]

export const welcomeHighlights: Feature[] = [
  { icon: BookOpenIcon, title: "Strong Academic Foundation", description: "Solid teaching in the core subjects, built up year by year." },
  { icon: UsersIcon, title: "Qualified Teachers", description: "Teachers who know their students and expect their best." },
  { icon: HandHeartIcon, title: "Character Focused", description: "Good conduct and sound values taught alongside the curriculum." },
  { icon: CompassIcon, title: "Student Development", description: "Leadership, confidence and purpose beyond examinations." },
]

export const academicCards: Feature[] = [
  { icon: BookOpenIcon, title: "Strong Curriculum", description: "A well-planned programme that builds knowledge and understanding step by step." },
  { icon: UsersIcon, title: "Experienced Teachers", description: "Teachers who explain clearly, give feedback and support every learner." },
  { icon: FlaskConicalIcon, title: "Practical Learning", description: "Hands-on work, discussion and projects that make lessons stick." },
  { icon: TrophyIcon, title: "Student Success", description: "Regular assessment and guidance that help each student improve." },
]

export const facilities: Showcase[] = [
  { slot: "classrooms", icon: SchoolIcon, title: "Modern Classrooms", description: "Bright, orderly rooms designed for focused teaching and learning." },
  { slot: "laboratory", icon: MicroscopeIcon, title: "Science Laboratory", description: "A space for practical experiments that bring science lessons to life." },
  { slot: "ict", icon: LaptopIcon, title: "ICT / Computer Lab", description: "Computers for learning digital skills and researching responsibly." },
  { slot: "library", icon: LibraryIcon, title: "Library", description: "A quiet place to read, study and discover through books." },
  { slot: "sports", icon: TrophyIcon, title: "Sports & Recreation", description: "Space to play, exercise and learn teamwork." },
]

export const studentLife: { slot: ImageSlot; title: string; description: string }[] = [
  { slot: "sports", title: "Sports", description: "Team games and athletics that build fitness, fair play and school spirit." },
  { slot: "science", title: "Science Activities", description: "Experiments, projects and curiosity-driven learning outside the timetable." },
  { slot: "events", title: "School Events", description: "Assemblies, ceremonies and programmes that bring the school community together." },
  { slot: "arts", title: "Arts & Culture", description: "Music, drama, creative work and cultural celebrations." },
  { slot: "activities", title: "Student Activities", description: "Clubs and responsibilities that grow leadership and friendship." },
]

export const programmeAreas: Feature[] = [
  { icon: BookOpenIcon, title: "Languages & Communication", description: "Reading, writing, speaking and listening, in English and other languages offered." },
  { icon: BrainIcon, title: "Mathematics", description: "Number, algebra, geometry and problem solving, developed progressively." },
  { icon: FlaskConicalIcon, title: "Sciences", description: "Observation, experiment and scientific thinking." },
  { icon: CompassIcon, title: "Humanities & Social Studies", description: "Understanding people, society, history and citizenship." },
  { icon: LaptopIcon, title: "Technology & ICT", description: "Practical digital skills for study and the modern world." },
  { icon: PaletteIcon, title: "Arts, Faith & Values", description: "Creative expression, Christian religious knowledge and moral education." },
]

export const coreValues: Feature[] = [
  { icon: HeartHandshakeIcon, title: "Faith", description: "A Christ-centred outlook that shapes how we treat one another." },
  { icon: ShieldCheckIcon, title: "Integrity", description: "Honesty and responsibility in work and in conduct." },
  { icon: AwardIcon, title: "Excellence", description: "Doing our best and aiming higher each term." },
  { icon: UsersIcon, title: "Community", description: "Respect, care and service within and beyond the school." },
]
