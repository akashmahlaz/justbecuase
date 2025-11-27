import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { sampleProjects, sampleNGOs, sampleVolunteers } from "@/lib/data"
import { PlusCircle, FolderKanban, Users, CheckCircle2, Eye, MessageSquare, Clock } from "lucide-react"
import Link from "next/link"

export default function NGODashboard() {
  const ngo = sampleNGOs[0]

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userType="ngo" userName={ngo.name} userAvatar={ngo.logo} />

      <div className="flex">
        <NGOSidebar />

        <main className="flex-1 p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Welcome, {ngo.name}</h1>
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
                    <p className="text-2xl font-bold text-foreground">4</p>
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
                    <p className="text-2xl font-bold text-foreground">28</p>
                    <p className="text-sm text-muted-foreground">New Applications</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success-light flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{ngo.projectsCompleted}</p>
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
                    <p className="text-2xl font-bold text-foreground">{ngo.volunteersEngaged}</p>
                    <p className="text-sm text-muted-foreground">Volunteers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Projects */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="active" className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="active">Active (4)</TabsTrigger>
                    <TabsTrigger value="in-progress">In Progress (2)</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="drafts">Drafts (1)</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="active" className="space-y-4">
                  {sampleProjects.slice(0, 4).map((project) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
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
                                {project.applicants} applications
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                156 views
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Due {project.deadline}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              View Applications
                            </Button>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="in-progress" className="space-y-4">
                  {sampleProjects.slice(0, 2).map((project) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-2">{project.title}</h3>
                            <div className="flex items-center gap-3 mb-4">
                              <img
                                src={sampleVolunteers[0].avatar || "/placeholder.svg"}
                                alt={sampleVolunteers[0].name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div>
                                <p className="text-sm font-medium text-foreground">{sampleVolunteers[0].name}</p>
                                <p className="text-xs text-muted-foreground">Assigned volunteer</p>
                              </div>
                            </div>
                            <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message
                            </Button>
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="completed">
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-success" />
                    <p>You have {ngo.projectsCompleted} completed projects.</p>
                    <Button variant="link" className="mt-2">
                      View all completed projects
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="drafts">
                  <Card className="border-dashed">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Community Outreach Campaign</h3>
                          <p className="text-sm text-muted-foreground">Last edited 3 days ago</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Continue Editing
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
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
                <CardContent className="space-y-4">
                  {sampleVolunteers.map((volunteer) => (
                    <div key={volunteer.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <img
                        src={volunteer.avatar || "/placeholder.svg"}
                        alt={volunteer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{volunteer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">Applied for: Social Media Strategy</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-primary">
                        View
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">This Month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Projects Posted</span>
                    <span className="font-semibold text-foreground">2</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Applications Received</span>
                    <span className="font-semibold text-foreground">28</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">Volunteers Engaged</span>
                    <span className="font-semibold text-foreground">6</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success-light">
                    <span className="text-sm text-success">Value Received</span>
                    <span className="font-semibold text-success">$4,500</span>
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
