import { db } from "@/lib/db"
import { classKey, classLabel } from "@/lib/academic"
import { isActiveAdmin, recordAdminDenied } from "@/lib/services/admin-guard"
import { endOfSchoolDay, startOfSchoolDay, type AnnouncementInput } from "@/lib/validation/announcement"
import type { AdminActor } from "@/lib/services/admin-results"
import type { AnnouncementRow } from "@/types/admin"

/**
 * Announcement administration (internal; reached only through admin-actions.ts / admin.ts after an ADMIN session check, and
 * every write also re-confirms the actor is an active admin). Students read announcements through student-dashboard.ts,
 * which only returns rows that are published, already live, not expired, and school-wide or for the student's own class.
 */

export type AnnouncementOutcome =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Partial<Record<"title" | "content" | "target" | "expires" | "publishOn", string>> }

const NOT_ADMIN: AnnouncementOutcome = { ok: false, message: "Only an administrator can do this." }

function stateOf(a: { isPublished: boolean; publishedAt: Date | null; expiresAt: Date | null }, now: Date): AnnouncementRow["state"] {
  if (!a.isPublished) return "DRAFT"
  if (a.expiresAt && a.expiresAt <= now) return "EXPIRED"
  if (a.publishedAt && a.publishedAt > now) return "SCHEDULED"
  return "LIVE"
}

export type AnnouncementFilters = { q?: string; state?: string; target?: string }

export async function loadAnnouncements(now: Date, filters: AnnouncementFilters = {}): Promise<AnnouncementRow[]> {
  const rows = await db.announcement.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      isPublished: true,
      publishedAt: true,
      expiresAt: true,
      updatedAt: true,
      targetClass: { select: { name: true, section: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })
  const all = rows.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    isPublished: a.isPublished,
    publishedAt: a.publishedAt,
    expiresAt: a.expiresAt,
    target: a.targetClass ? classKey(a.targetClass.name, a.targetClass.section) : "school",
    targetLabel: a.targetClass ? classLabel(a.targetClass.name, a.targetClass.section) : "Whole school",
    state: stateOf(a, now),
    createdBy: `${a.createdBy.firstName} ${a.createdBy.lastName}`,
    updatedAt: a.updatedAt,
  }))

  // Search and filters (the full list is small; this runs on the server, after the admin check).
  const words = (filters.q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5)
  return all.filter(
    (a) =>
      (!filters.state || a.state === filters.state.toUpperCase()) &&
      (!filters.target || a.target === filters.target) &&
      words.every((w) => a.title.toLowerCase().includes(w) || a.content.toLowerCase().includes(w)),
  )
}

/** Class options for the announcement form. */
export async function loadTargetOptions(): Promise<{ key: string; label: string }[]> {
  const classes = await db.schoolClass.findMany({ where: { isActive: true }, orderBy: [{ level: "asc" }, { name: "asc" }, { section: "asc" }], select: { name: true, section: true } })
  return classes.map((c) => ({ key: classKey(c.name, c.section), label: classLabel(c.name, c.section) }))
}

async function resolveTarget(target: string): Promise<{ ok: true; classId: string | null; label: string } | { ok: false }> {
  if (target === "school") return { ok: true, classId: null, label: "Whole school" }
  const classes = await db.schoolClass.findMany({ where: { isActive: true }, select: { id: true, name: true, section: true } })
  const match = classes.find((c) => classKey(c.name, c.section) === target)
  return match ? { ok: true, classId: match.id, label: classLabel(match.name, match.section) } : { ok: false }
}

export async function saveAnnouncement(actor: AdminActor, input: AnnouncementInput, now: Date): Promise<AnnouncementOutcome> {
  if (!(await isActiveAdmin(actor.userId))) {
    await recordAdminDenied(actor.userId, "Announcement", "save")
    return NOT_ADMIN
  }

  const target = await resolveTarget(input.target)
  if (!target.ok) return { ok: false, message: "Please correct the form.", fieldErrors: { target: "Choose the whole school or one of the listed classes." } }
  const expiresAt = input.expires ? endOfSchoolDay(input.expires) : null
  const publishAt = input.publishOn ? startOfSchoolDay(input.publishOn) : null
  if (expiresAt && expiresAt <= now) return { ok: false, message: "Please correct the form.", fieldErrors: { expires: "The expiry date must be in the future." } }
  if (expiresAt && publishAt && expiresAt <= publishAt) {
    return { ok: false, message: "Please correct the form.", fieldErrors: { expires: "The expiry date must be after the publish date." } }
  }

  const audit = {
    title: input.title.slice(0, 80),
    target: target.label,
    publishOn: publishAt ? publishAt.toISOString() : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  }

  if (input.id) {
    const existing = await db.announcement.findUnique({ where: { id: input.id }, select: { id: true, isPublished: true } })
    if (!existing) return { ok: false, message: "That announcement no longer exists." }
    // A draft keeps only the date the admin chose; a published one keeps the date it went live unless a new date is chosen.
    const publishedAt = publishAt ?? (existing.isPublished ? undefined : null)
    await db.$transaction([
      db.announcement.update({ where: { id: input.id }, data: { title: input.title, content: input.content, targetClassId: target.classId, expiresAt, publishedAt } }),
      db.auditLog.create({ data: { userId: actor.userId, action: "ANNOUNCEMENT_UPDATED", entityType: "Announcement", entityId: input.id, metadata: audit } }),
    ])
    return { ok: true, message: "Announcement updated." }
  }

  const created = await db.announcement.create({
    data: { title: input.title, content: input.content, targetClassId: target.classId, expiresAt, publishedAt: publishAt, createdById: actor.userId, isPublished: false },
    select: { id: true },
  })
  await db.auditLog.create({ data: { userId: actor.userId, action: "ANNOUNCEMENT_CREATED", entityType: "Announcement", entityId: created.id, metadata: audit } })
  return { ok: true, message: "Announcement saved as a draft. Publish it when you are ready for students to see it." }
}

export async function setAnnouncementPublished(actor: AdminActor, id: string, publish: boolean, now: Date): Promise<AnnouncementOutcome> {
  if (!(await isActiveAdmin(actor.userId))) {
    await recordAdminDenied(actor.userId, "Announcement", publish ? "publish" : "unpublish")
    return NOT_ADMIN
  }
  const existing = await db.announcement.findUnique({
    where: { id },
    select: { title: true, isPublished: true, publishedAt: true, expiresAt: true, targetClass: { select: { name: true, section: true } } },
  })
  if (!existing) return { ok: false, message: "That announcement no longer exists." }
  if (existing.isPublished === publish) return { ok: true, message: publish ? "Already published." : "Already unpublished." }
  if (publish && existing.expiresAt && existing.expiresAt <= now) {
    return { ok: false, message: "This announcement has already expired. Edit it and choose a new expiry date before publishing." }
  }

  // A publish date chosen in the future is kept (the announcement is then scheduled); otherwise it goes live now.
  const goLive = existing.publishedAt && existing.publishedAt > now ? existing.publishedAt : now
  await db.$transaction([
    db.announcement.update({ where: { id }, data: publish ? { isPublished: true, publishedAt: goLive } : { isPublished: false } }),
    db.auditLog.create({
      data: {
        userId: actor.userId,
        action: publish ? "ANNOUNCEMENT_PUBLISHED" : "ANNOUNCEMENT_UNPUBLISHED",
        entityType: "Announcement",
        entityId: id,
        metadata: { title: existing.title.slice(0, 80), target: existing.targetClass ? classLabel(existing.targetClass.name, existing.targetClass.section) : "Whole school", ...(publish ? { liveFrom: goLive.toISOString() } : {}) },
      },
    }),
  ])
  return {
    ok: true,
    message: publish
      ? goLive > now
        ? "Announcement scheduled. It becomes visible on its publish date."
        : "Announcement published. Students can see it now."
      : "Announcement unpublished. Students can no longer see it.",
  }
}
