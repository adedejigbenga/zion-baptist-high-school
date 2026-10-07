import { StudentShell } from "@/components/student/student-shell"

/** Frame for every student page. It protects nothing by itself: each page and data function checks the session. */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>
}
