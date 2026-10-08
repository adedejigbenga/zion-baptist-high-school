import { AdminShell } from "@/components/admin/admin-shell"

/** Frame for every admin page. It protects nothing by itself: each page and data function checks the ADMIN role. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
