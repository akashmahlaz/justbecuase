import { Suspense } from "react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getVolunteerProfile, getMatchedOpportunitiesForVolunteer, browseProjects } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  Search,
  Filter,
  Clock,
  MapPin,
  Building2,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react"

export default async function VolunteerOpportunitiesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userType="volunteer"
        userName={session.user.name || "Volunteer"}
        userAvatar={session.user.image || undefined}
      />

      <div className="flex">
        <VolunteerSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Browse Opportunities</h1>
            <p className="text-muted-foreground">
              Find volunteer opportunities that match your skills
            </p>
          </div>

          {/* Search & Filters */}
          <Card className="mb-8">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, skills, or cause..."
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <select className="border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">All Work Modes</option>
                    <option value="remote">Remote</option>
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                  <select className="border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">All Types</option>
                    <option value="short-term">Short-term</option>
                    <option value="long-term">Long-term</option>
                    <option value="consultation">Consultation</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Recommended for You</h2>
            </div>
            <Suspense fallback={<OpportunitiesSkeleton />}>
              <RecommendedOpportunities />
            </Suspense>
          </div>

          {/* All Opportunities */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">All Opportunities</h2>
            <Suspense fallback={<OpportunitiesSkeleton />}>
              <AllOpportunities />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

async function RecommendedOpportunities() {
  const matches = await getMatchedOpportunitiesForVolunteer()

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Complete your profile to get personalized recommendations
          </p>
          <Button variant="link" asChild>
            <Link href="/volunteer/profile">Complete Profile</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.slice(0, 6).map((match) => (
        <OpportunityCard
          key={match.projectId}
          project={match.project}
          matchScore={match.score}
        />
      ))}
    </div>
  )
}

async function AllOpportunities() {
  const projects = await browseProjects()

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No opportunities available at the moment</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back later for new volunteer opportunities
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <OpportunityCard key={project._id?.toString()} project={project} />
      ))}
    </div>
  )
}

function OpportunityCard({
  project,
  matchScore,
}: {
  project: any
  matchScore?: number
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <Badge variant="outline" className="text-xs">
            {project.projectType}
          </Badge>
          {matchScore !== undefined && (
            <Badge
              className={
                matchScore >= 70
                  ? "bg-green-100 text-green-700"
                  : matchScore >= 50
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }
            >
              {Math.round(matchScore)}% match
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
          {project.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {project.description}
        </p>

        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {project.workMode}
            {project.location && ` • ${project.location}`}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {project.timeCommitment}
          </div>
          {project.deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Deadline: {new Date(project.deadline).toLocaleDateString()}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {project.applicantsCount} applicants
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {project.skillsRequired?.slice(0, 3).map((skill: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {skill.subskillId}
            </Badge>
          ))}
          {project.skillsRequired?.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{project.skillsRequired.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/projects/${project._id?.toString()}`}>
              View Details
            </Link>
          </Button>
          <Button size="sm" className="flex-1">
            Apply
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OpportunitiesSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-48 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
