import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { VolunteersList } from "@/components/volunteers/volunteers-list"
import { VolunteersFilters } from "@/components/volunteers/volunteers-filters"
import { VolunteersHero } from "@/components/volunteers/volunteers-hero"

export const metadata = {
  title: "Browse Volunteers | JustBecause.Asia",
  description: "Find skilled volunteers ready to contribute to your cause",
}

export default function VolunteersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <VolunteersHero />

        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
                <VolunteersFilters />
              </Suspense>
            </aside>

            {/* Volunteers Grid */}
            <div className="lg:col-span-3">
              <Suspense fallback={<VolunteersListSkeleton />}>
                <VolunteersList />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function VolunteersListSkeleton() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-72 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  )
}
