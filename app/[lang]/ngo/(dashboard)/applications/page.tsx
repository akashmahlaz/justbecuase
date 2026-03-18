import { Suspense } from "react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"
import { getNGOProfile, getNGOApplicationsEnriched } from "@/lib/actions"
import { Card, CardContent } from "@/components/ui/card"
import { ApplicationsFilter } from "./applications-filter"

export default async function ApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ project?: string }>
}) {
  const { lang } = await params
  const { project: projectFilter } = await searchParams
  const dict = await getDictionary(lang as Locale) as any

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Role verification: Ensure user is an NGO
  if (session.user.role !== "ngo") {
    if (session.user.role === "volunteer") {
      redirect("/volunteer/dashboard")
    } else if (session.user.role === "admin") {
      redirect("/admin")
    } else {
      redirect("/auth/role-select")
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    redirect("/ngo/onboarding")
  }

  const ngoProfile = await getNGOProfile()

  return (
    <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{dict.ngo?.applications?.title || "Applications"}</h1>
            <p className="text-muted-foreground">{dict.ngo?.applications?.subtitle || "Review and manage impact agent applications for your opportunities"}</p>
          </div>

          <Suspense fallback={<ApplicationsSkeleton />}>
            <ApplicationsList dict={dict} initialProjectFilter={projectFilter} />
          </Suspense>
    </main>
  )
}

async function ApplicationsList({ dict, initialProjectFilter }: { dict: any; initialProjectFilter?: string }) {
  // Use optimized batch query instead of N+1 individual queries
  const enrichedApplications = await getNGOApplicationsEnriched()

  // Serialize ObjectIds for client component
  const serializedApps = JSON.parse(JSON.stringify(enrichedApplications))

  return (
    <ApplicationsFilter
      applications={serializedApps}
      dict={dict}
      initialProjectFilter={initialProjectFilter}
    />
  )
}

function ApplicationsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
