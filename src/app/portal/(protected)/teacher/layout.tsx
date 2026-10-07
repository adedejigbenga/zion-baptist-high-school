import { TeacherShell } from "@/components/teacher/teacher-shell"

/** Frame for every teacher page. It protects nothing by itself: each page and data function checks the session. */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <TeacherShell>{children}</TeacherShell>
}
