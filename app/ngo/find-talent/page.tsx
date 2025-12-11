import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getNGOProfile, browseVolunteers, getMatchedVolunteersForProject, browseProjects, getUnlockedProfiles } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Star,
  Lock,
  Unlock,
  ExternalLink,
  IndianRupee,
  Heart,
  MessageSquare,
  Sparkles,
} from "lucide-react"

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

  // Separate volunteers by type
  const paidVolunteers = volunteers.filter((v) => v.volunteerType === "paid")
  const freeVolunteers = volunteers.filter((v) => v.volunteerType === "free")

  // Check if volunteer profile is unlocked
  const isUnlocked = (volunteerId: string) => {
    return unlockedProfiles.some((p) => p.volunteerId.toString() === volunteerId)
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userType="ngo"
        userName={ngoProfile?.organizationName || session.user.name || "NGO"}
        userAvatar={ngoProfile?.logo || session.user.image || undefined}
      />

      <div className="flex">
        <NGOSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Find Talent</h1>
            <p className="text-muted-foreground">
              Browse skilled volunteers to help with your projects
            </p>
          </div>

          {/* Search & Filters */}
          <Card className="mb-8">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by skills, name, or location..." className="pl-9" />
                </div>
                <div className="flex gap-2">
                  <select className="border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">All Categories</option>
                    <option value="technology">Technology</option>
                    <option value="marketing">Marketing</option>
                    <option value="design">Design</option>
                    <option value="finance">Finance</option>
                    <option value="legal">Legal</option>
                  </select>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Banner */}
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Profile Visibility</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>Paid volunteers</strong> (charge for services) have fully visible profiles.{" "}
                    <strong>Free volunteers</strong> (work for free) require a small fee to unlock their full profile.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                All Volunteers
                <Badge variant="secondary" className="ml-2">{volunteers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="paid">
                <IndianRupee className="h-3 w-3 mr-1" />
                Paid
                <Badge variant="secondary" className="ml-2">{paidVolunteers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="free">
                <Heart className="h-3 w-3 mr-1" />
                Free
                <Badge variant="secondary" className="ml-2">{freeVolunteers.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="recommended">
                <Sparkles className="h-3 w-3 mr-1" />
                Recommended
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <VolunteerGrid
                volunteers={volunteers}
                isUnlocked={isUnlocked}
              />
            </TabsContent>

            <TabsContent value="paid">
              <VolunteerGrid
                volunteers={paidVolunteers}
                isUnlocked={isUnlocked}
              />
            </TabsContent>

            <TabsContent value="free">
              <VolunteerGrid
                volunteers={freeVolunteers}
                isUnlocked={isUnlocked}
              />
            </TabsContent>

            <TabsContent value="recommended">
              <RecommendedVolunteers />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

function VolunteerGrid({
  volunteers,
  isUnlocked,
}: {
  volunteers: any[]
  isUnlocked: (id: string) => boolean
}) {
  if (volunteers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No volunteers found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {volunteers.map((volunteer) => (
        <VolunteerCard
          key={volunteer._id?.toString()}
          volunteer={volunteer}
          unlocked={volunteer.volunteerType === "paid" || isUnlocked(volunteer._id?.toString() || "")}
        />
      ))}
    </div>
  )
}

function VolunteerCard({
  volunteer,
  unlocked,
}: {
  volunteer: any
  unlocked: boolean
}) {
  const isFree = volunteer.volunteerType === "free"

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {volunteer.avatar ? (
                <img
                  src={volunteer.avatar}
                  alt={unlocked ? volunteer.fullName : "Volunteer"}
                  className={isFree && !unlocked ? "blur-sm" : ""}
                />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">
                  {unlocked ? volunteer.fullName?.charAt(0) : "?"}
                </span>
              )}
            </div>
            {isFree && !unlocked && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                <Lock className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {unlocked ? volunteer.fullName : "Volunteer"}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {volunteer.headline || "Skilled Volunteer"}
            </p>
          </div>
          <Badge variant={isFree ? "secondary" : "outline"}>
            {isFree ? "Free" : `₹${volunteer.hourlyRate}/hr`}
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          {unlocked && volunteer.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {volunteer.location}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {volunteer.hoursPerWeek} hrs/week
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            {volunteer.rating || "New"} ({volunteer.completedProjects || 0} projects)
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {volunteer.skills?.slice(0, 3).map((skill: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {skill.subskillId}
            </Badge>
          ))}
          {volunteer.skills?.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{volunteer.skills.length - 3}
            </Badge>
          )}
        </div>

        {isFree && !unlocked ? (
          <Button className="w-full" asChild>
            <Link href={`/volunteers/${volunteer.userId}`}>
              <Unlock className="h-4 w-4 mr-2" />
              Unlock Profile
            </Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/volunteers/${volunteer.userId}`}>
                View Profile
              </Link>
            </Button>
            <Button size="sm" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-1" />
              Contact
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

async function RecommendedVolunteers() {
  // This would ideally get recommendations based on active projects
  const volunteers = await browseVolunteers()
  const recommended = volunteers.slice(0, 6) // Placeholder

  return (
    <div>
      <p className="text-muted-foreground mb-4">
        Volunteers recommended based on your active projects and hiring history
      </p>
      <VolunteerGrid
        volunteers={recommended}
        isUnlocked={() => false}
      />
    </div>
  )
}
