import type { Metadata } from "next"

import { StudentProfileCard } from "@/components/student/student-profile-card"
import { getStudentProfile } from "@/lib/services/student"

export const metadata: Metadata = { title: "My Profile" }

/** The signed-in student's profile. getStudentProfile() takes no ID, so nothing in the URL can select another student. */
export default async function StudentProfilePage() {
  const profile = await getStudentProfile()
  return (
    <div className="stack-page">
      <div className="flex flex-col gap-1">
        <h1 className="type-page-title text-brand-950">My profile</h1>
        <p className="type-body text-muted-foreground">Your details as held by the school.</p>
      </div>
      <StudentProfileCard profile={profile} />
    </div>
  )
}
