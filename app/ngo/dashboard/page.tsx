import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getNGOProfile, getMyProjectsAsNGO, getNGOApplications, getNGOSubscriptionStatus } from "@/lib/actions"
import { PlusCircle, FolderKanban, Users, CheckCircle2, Eye, MessageSquare, Clock, ArrowRight, CreditCard, Zap, Unlock } from "lucide-react"
import Link from "next/link"

export default async function NGODashboard() {
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
  const projects = await getMyProjectsAsNGO()
  const applications = await getNGOApplications()
  const subscriptionStatus = await getNGOSubscriptionStatus()

  // Calculate stats
  const activeProjects = projects.filter((p) => p.status === "open")
  const completedProjects = projects.filter((p) => p.status === "completed")
  const pendingApplications = applications.filter((a) => a.status === "pending")

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
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Welcome, {ngoProfile?.organizationName || session.user.name}
              </h1>
              <p className="text-muted-foreground">Manage your projects and connect with skilled volunteers.</p>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/ngo/post-project" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Post New Project
              </Link>
            </Button>
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
                    <p className="text-2xl font-bold text-foreground">{activeProjects.length}</p>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{pendingApplications.length}</p>
                    <p className="text-sm text-muted-foreground">Pending Applications</p>
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
                    <p className="text-2xl font-bold text-foreground">{completedProjects.length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{applications.length}</p>
                    <p className="text-sm text-muted-foreground">Total Applications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Projects */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Projects</CardTitle>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/ngo/projects">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No active projects</p>
                      <Button variant="link" asChild>
                        <Link href="/ngo/post-project">Create your first project</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeProjects.slice(0, 4).map((project) => (
                        <div key={project._id?.toString()} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{project.title}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {project.projectType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {project.applicantsCount || 0} applications
                                </span>
                                <span className="flex items-center gap-1 capitalize">
                                  <Clock className="h-4 w-4" />
                                  {project.workMode}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/ngo/applications?project=${project._id?.toString()}`}>
                                  View Applications
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Applications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Recent Applications</CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/ngo/applications">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {pendingApplications.length === 0 ? (
                    <div className="text-center py-6">
                      <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No pending applications</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingApplications.slice(0, 5).map((application) => (
                        <div key={application._id?.toString()} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">V</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              New Application
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {new Date(application.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-primary" asChild>
                            <Link href="/ngo/applications">View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/ngo/post-project">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Post New Project
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/ngo/find-talent">
                      <Users className="h-4 w-4 mr-2" />
                      Browse Volunteers
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/ngo/messages">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Messages
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Subscription Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Subscription
                    </CardTitle>
                    {subscriptionStatus?.plan === "pro" && (
                      <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                        <Zap className="h-3 w-3 mr-1" />
                        PRO
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionStatus?.plan === "free" ? (
                    <>
                      <div className="p-4 rounded-lg bg-muted/50 border border-yellow-200">
                        <div className="flex items-center gap-2 text-yellow-600 mb-2">
                          <Unlock className="h-4 w-4" />
                          <span className="text-sm font-medium">Free Plan - No Unlocks</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upgrade to Pro to unlock volunteer profiles
                        </p>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Upgrade to Pro for unlimited unlocks
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          View contact details of any volunteer
                        </p>
                        <Button asChild size="sm" className="w-full">
                          <Link href="/pricing">
                            <Zap className="h-4 w-4 mr-2" />
                            Upgrade to Pro
                          </Link>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-medium text-foreground">Pro Plan Active</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Unlimited volunteer profile unlocks
                      </p>
                      {subscriptionStatus?.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Renews: {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
