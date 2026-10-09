import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { initials } from "@/lib/format"
import type { StudentProfile } from "@/types/student"

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="type-label text-muted-foreground">{label}</dt>
      <dd className="type-body min-w-0 break-words text-foreground">{value ?? <span className="text-muted-foreground">Not provided</span>}</dd>
    </div>
  )
}

/** The student's own details. Contact details the school does not hold show "Not provided". */
function StudentProfileCard({ profile }: { profile: StudentProfile }) {
  const className = profile.className ? `${profile.className}${profile.section ? ` ${profile.section}` : ""}` : null
  return (
    <Card className="max-w-2xl gap-0">
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-100 type-card-title text-primary"
        >
          {initials(profile.firstName, profile.lastName)}
        </span>
        <div className="min-w-0">
          <h2 className="type-card-title break-words text-foreground">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="type-body-sm text-muted-foreground">Student</p>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border border-t border-border">
          <Row label="Full name" value={`${profile.firstName} ${profile.lastName}`} />
          <Row label="Admission number" value={profile.admissionNumber} />
          <Row label="Class" value={className} />
          <Row label="Academic session" value={profile.sessionName} />
          <Row label="Email" value={profile.email} />
          <Row label="Phone" value={profile.phone} />
        </dl>
        <p className="type-body-sm mt-4 text-muted-foreground">To correct any detail here, please contact the school office.</p>
      </CardContent>
    </Card>
  )
}

export { StudentProfileCard }
