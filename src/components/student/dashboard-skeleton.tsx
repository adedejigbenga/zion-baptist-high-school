import { Skeleton } from "@/components/ui/skeleton"

/** Loading state shaped like the dashboard, so the page does not jump when the data arrives. */
function DashboardSkeleton() {
  return (
    <div className="stack-page" role="status" aria-label="Loading your dashboard">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-52 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-72 rounded-xl xl:row-span-2" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-56 rounded-xl xl:col-span-2" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export { DashboardSkeleton }
