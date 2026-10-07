import { Skeleton } from "@/components/ui/skeleton"
import { initials } from "@/lib/format"
import { getTeacherProfileSummary } from "@/lib/services/teacher"

/** The signed-in teacher's name and employee number. Reads the session, so it sits under <Suspense>. */
async function TeacherSidebarProfile() {
  const profile = await getTeacherProfileSummary()
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-surface-subtle p-3">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 type-label font-bold text-brand-800"
        aria-hidden="true"
      >
        {initials(profile.firstName, profile.lastName)}
      </span>
      <div className="min-w-0">
        <p className="truncate type-label text-foreground">
          {profile.firstName} {profile.lastName}
        </p>
        <p className="truncate type-caption font-normal text-muted-foreground">{profile.employeeNumber}</p>
      </div>
    </div>
  )
}

function TeacherSidebarProfileSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-surface-subtle p-3" aria-hidden="true">
      <Skeleton className="size-11 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export { TeacherSidebarProfile, TeacherSidebarProfileSkeleton }
