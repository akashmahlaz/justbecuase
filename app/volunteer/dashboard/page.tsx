import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getVolunteerProfile, getMyApplications, getMatchedOpportunitiesForVolunteer } from "@/lib/actions"
import { Clock, CheckCircle2, FolderKanban, TrendingUp, Star, ArrowRight, Edit, Briefcase } from "lucide-react"
import Link from "next/link"

export default async function VolunteerDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Role verification: Ensure user is a volunteer
  if (session.user.role !== "volunteer") {
    if (session.user.role === "ngo") {
      redirect("/ngo/dashboard")
    } else if (session.user.role === "admin") {
      redirect("/admin")
    } else {
      redirect("/auth/role-select")
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    redirect("/volunteer/onboarding")
  }

  const profile = await getVolunteerProfile()
  const applications = await getMyApplications()
  const matchedOpportunities = await getMatchedOpportunitiesForVolunteer()

  // Calculate stats
  const pendingApplications = applications.filter((a) => a.status === "pending")
  const acceptedApplications = applications.filter((a) => a.status === "accepted")
  const completedProjects = profile?.completedProjects || 0
  const hoursContributed = profile?.hoursContributed || 0
  
  // Profile completion calculation
  let profileCompletion = 20 // Base for having account
  if (profile?.phone) profileCompletion += 10
  if (profile?.location) profileCompletion += 10
  if (profile?.bio) profileCompletion += 15
  if (profile?.skills?.length) profileCompletion += 20
  if (profile?.causes?.length) profileCompletion += 10
  if (profile?.linkedinUrl || profile?.portfolioUrl) profileCompletion += 15

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
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome back, {session.user.name?.split(" ")[0] || "Volunteer"}!
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your volunteering journey.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FolderKanban className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{applications.length}</p>
                    <p className="text-sm text-muted-foreground">Applications</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{acceptedApplications.length}</p>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{completedProjects}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{hoursContributed}</p>
                    <p className="text-sm text-muted-foreground">Hours Given</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recommended Opportunities</CardTitle>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/volunteer/opportunities">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {matchedOpportunities.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No opportunities matched yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Complete your profile to get personalized recommendations
                      </p>
                      <Button variant="link" asChild>
                        <Link href="/volunteer/profile">Complete Profile</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matchedOpportunities.slice(0, 4).map((match) => (
                        <Link
                          key={match.projectId}
                          href={`/projects/${match.projectId}`}
                          className="block p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-foreground line-clamp-1">
                              {match.project.title}
                            </h3>
                            <Badge
                              className={
                                match.score >= 70
                                  ? "bg-green-100 text-green-700"
                                  : match.score >= 50
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                              }
                            >
                              {Math.round(match.score)}% match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {match.project.description}
                          </p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span className="capitalize">{match.project.workMode}</span>
                            <span>•</span>
                            <span>{match.project.timeCommitment}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">My Profile</CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/volunteer/profile">
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 overflow-hidden">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {session.user.name?.charAt(0) || "V"}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground">{session.user.name}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.location || "Location not set"}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{profile?.rating || "New"}</span>
                      <span className="text-muted-foreground">({completedProjects} projects)</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Profile Completion</span>
                        <span className="font-medium">{profileCompletion}%</span>
                      </div>
                      <Progress value={profileCompletion} className="h-2" />
                    </div>
                  </div>

                  {profile?.skills && profile.skills.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-medium text-foreground mb-3">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.slice(0, 5).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="bg-accent text-accent-foreground">
                            {skill.subskillId}
                          </Badge>
                        ))}
                        {profile.skills.length > 5 && (
                          <Badge variant="secondary">+{profile.skills.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Impact Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        ₹{(hoursContributed * 500).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Estimated value contributed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
