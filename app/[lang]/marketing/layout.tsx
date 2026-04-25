import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { MarketingDashboardSidebar } from "@/components/admin/marketing-dashboard-sidebar"
import { MarketingHeader } from "@/components/admin/marketing-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export const metadata: Metadata = {
  title: "Marketing Intel — JustBeCause",
  robots: { index: false, follow: false },
}

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(`/${lang}/auth/signin`)
  }

  if (session.user.role !== "admin") {
    redirect(`/${lang}`)
  }

  return (
    <SidebarProvider>
      <MarketingDashboardSidebar />
      <SidebarInset>
        <MarketingHeader user={session.user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
