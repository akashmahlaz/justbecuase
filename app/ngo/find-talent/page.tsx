import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getNGOProfile, browseVolunteers, getUnlockedProfiles } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { FindTalentClient } from "@/components/volunteers/find-talent-client"

export default async function NGOFindTalentPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const ngoProfile = await getNGOProfile()
  const volunteers = await browseVolunteers()
  const unlockedProfiles = await getUnlockedProfiles()

  // Get list of unlocked volunteer IDs
  const unlockedProfileIds = unlockedProfiles.map((p) => p.volunteerId?.toString() || "")

  // Serialize volunteers for client component
  const serializedVolunteers = volunteers.map((v: any) => ({
    id: v.id || "",
    userId: v.id,
    name: v.name || undefined,
    avatar: v.avatar || undefined,
    headline: (v as any).bio?.slice(0, 60) || undefined, // Use bio as headline fallback
    location: v.location,
    city: v.location?.split(',')[0]?.trim(),
    country: v.location?.split(',')[1]?.trim(),
    hoursPerWeek: typeof v.hoursPerWeek === 'number' ? v.hoursPerWeek : parseInt(v.hoursPerWeek) || 10,
    skills: v.skills,
    volunteerType: v.volunteerType as "free" | "paid" | undefined,
    hourlyRate: v.hourlyRate || undefined,
    rating: v.rating,
    completedProjects: v.completedProjects,
  }))

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userType="ngo"
        userName={ngoProfile?.organizationName || session.user.name || "NGO"}
        userAvatar={ngoProfile?.logo || session.user.image || undefined}
      />

      <div className="flex">
        <NGOSidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Find Talent</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Browse skilled volunteers to help with your projects
            </p>
          </div>

          <FindTalentClient 
            volunteers={serializedVolunteers}
            unlockedProfileIds={unlockedProfileIds}
          />
        </main>
      </div>
    </div>
  )
}
