import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDictionary } from "@/app/[lang]/dictionaries"
import { Locale } from "@/lib/i18n-config"
import { OpportunitiesBrowser } from "./opportunities-browser"

export default async function VolunteerOpportunitiesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(`/${lang}/auth/signin`)
  }

  // Role verification: Ensure user is a volunteer
  if (session.user.role !== "volunteer") {
    if (session.user.role === "ngo") {
      redirect(`/${lang}/ngo/dashboard`)
    } else if (session.user.role === "admin") {
      redirect(`/${lang}/admin`)
    } else {
      redirect(`/${lang}/auth/role-select`)
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    redirect(`/${lang}/volunteer/onboarding`)
  }

  return (
    <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{dict.volunteer?.opportunities?.title || "Browse Opportunities"}</h1>
            <p className="text-muted-foreground">
              {dict.volunteer?.opportunities?.subtitle || "Find impact agent opportunities that match your skills"}
            </p>
          </div>

          {/* All Opportunities — client component with search + filters + personalization */}
          <OpportunitiesBrowser />
    </main>
  )
}
