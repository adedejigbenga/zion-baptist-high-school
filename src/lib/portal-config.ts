import { GraduationCapIcon, PresentationIcon, ShieldCheckIcon, type LucideIcon } from "lucide-react"

import type { PortalRoleId } from "@/types/portal"

/** Presentation content for the portal gateway and the login pages. No auth logic lives here. */
export type PortalRoleConfig = {
  id: PortalRoleId
  /** e.g. "Student Portal" */
  name: string
  icon: LucideIcon
  /** Gateway card text. */
  gatewayDescription: string
  gatewayCta: string
  /** Sign-in page for this role. */
  loginHref: string
  /** Login page text. */
  loginSubtitle: string
  accessHeading: string
  access: string[]
}

export const portalRoles: Record<PortalRoleId, PortalRoleConfig> = {
  student: {
    id: "student",
    name: "Student Portal",
    icon: GraduationCapIcon,
    gatewayDescription: "View your academic results, profile and school updates.",
    gatewayCta: "Continue as Student",
    loginHref: "/portal/student/login",
    loginSubtitle: "Sign in to access your student dashboard.",
    accessHeading: "Student access includes:",
    access: ["Academic results", "Student profile", "School announcements"],
  },
  teacher: {
    id: "teacher",
    name: "Teacher Portal",
    icon: PresentationIcon,
    gatewayDescription: "Manage student results and access your teaching workspace.",
    gatewayCta: "Continue as Teacher",
    loginHref: "/portal/teacher/login",
    loginSubtitle: "Sign in to access your teaching workspace.",
    accessHeading: "Teacher access includes:",
    access: ["Student result management", "Result uploads", "Teaching information", "School announcements"],
  },
  admin: {
    id: "admin",
    name: "Admin Portal",
    icon: ShieldCheckIcon,
    gatewayDescription: "Manage students, teachers, academics and school records.",
    gatewayCta: "Continue as Admin",
    loginHref: "/portal/admin/login",
    loginSubtitle: "Sign in to access the administration area.",
    accessHeading: "Administrator access includes:",
    access: ["Student management", "Teacher management", "Academic management", "Result management"],
  },
}

/** Order shown on the gateway. */
export const portalRoleList: PortalRoleConfig[] = [portalRoles.student, portalRoles.teacher, portalRoles.admin]
