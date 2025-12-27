import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader user={session.user} />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
