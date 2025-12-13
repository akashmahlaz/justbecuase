import { Suspense } from "react"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getNGOProfile, getNGOApplications, getProject, getVolunteerProfile, updateApplicationStatus } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Clock, CheckCircle, XCircle, MessageSquare, ExternalLink, FileText, Loader2 } from "lucide-react"
import { skillCategories } from "@/lib/skills-data"
import { ApplicationActions } from "./application-actions"

export default async function ApplicationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const ngoProfile = await getNGOProfile()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        userType="ngo" 
        userName={ngoProfile?.orgName || session.user.name || "NGO"} 
        userAvatar={ngoProfile?.logo || session.user.image || undefined} 
      />

      <div className="flex">
        <NGOSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Applications</h1>
            <p className="text-muted-foreground">Review and manage volunteer applications for your projects</p>
          </div>

          <Suspense fallback={<ApplicationsSkeleton />}>
            <ApplicationsList />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

async function ApplicationsList() {
  const applications = await getNGOApplications()
  
  // Enrich applications with project and volunteer data
  const enrichedApplications = await Promise.all(
    applications.map(async (app) => {
      const [project, volunteerProfile] = await Promise.all([
        getProject(app.projectId),
        getVolunteerProfile(app.volunteerId),
      ])
      return {
        ...app,
        project,
        volunteerProfile,
      }
    })
  )

  const pendingCount = enrichedApplications.filter((a) => a.status === "pending").length
  const acceptedCount = enrichedApplications.filter((a) => a.status === "accepted").length
  const shortlistedCount = enrichedApplications.filter((a) => a.status === "shortlisted").length

  if (enrichedApplications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No applications yet</p>
          <p className="text-sm text-muted-foreground">
            When volunteers apply to your projects, they will appear here.
          </p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/ngo/post-project">Post a Project</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    shortlisted: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-gray-100 text-gray-700",
  }

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
        <TabsTrigger value="shortlisted">Shortlisted ({shortlistedCount})</TabsTrigger>
        <TabsTrigger value="accepted">Accepted ({acceptedCount})</TabsTrigger>
        <TabsTrigger value="all">All ({enrichedApplications.length})</TabsTrigger>
      </TabsList>

      {["pending", "shortlisted", "accepted", "all"].map((tab) => (
        <TabsContent key={tab} value={tab} className="space-y-4">
          {enrichedApplications
            .filter((a) => tab === "all" || a.status === tab)
            .map((application) => {
              const skills = application.volunteerProfile?.skills?.slice(0, 4) || []
              
              return (
                <Card key={application._id?.toString()} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <img
                        src={application.volunteerProfile?.avatar || "/placeholder.svg?height=64&width=64"}
                        alt="Volunteer"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {application.volunteerProfile?.name || "Volunteer"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {application.volunteerProfile?.location || "Location not specified"}
                            </p>
                          </div>
                          <Badge className={statusColors[application.status]}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </div>

                        <p className="text-sm text-foreground mb-2">
                          Applied for: <span className="font-medium">{application.project?.title || "Project"}</span>
                        </p>

                        {application.coverMessage && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            "{application.coverMessage}"
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(application.appliedAt).toLocaleDateString()}
                          </span>
                          <span>
                            {application.volunteerProfile?.completedProjects || 0} projects completed
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {skills.map((skill: any, idx: number) => {
                            const category = skillCategories.find(c => c.id === skill.categoryId)
                            const subskill = category?.subskills.find(s => s.id === skill.subskillId)
                            return (
                              <Badge key={idx} variant="secondary" className="text-xs bg-accent text-accent-foreground">
                                {subskill?.name || skill.subskillId}
                              </Badge>
                            )
                          })}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/volunteers/${application.volunteerId}`}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Profile
                            </Link>
                          </Button>
                          
                          <ApplicationActions 
                            applicationId={application._id?.toString() || ""} 
                            currentStatus={application.status}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          
          {enrichedApplications.filter((a) => tab === "all" || a.status === tab).length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No {tab} applications</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      ))}
    </Tabs>
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
