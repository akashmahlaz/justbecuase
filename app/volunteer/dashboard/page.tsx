import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectCard } from "@/components/project-card"
import { sampleProjects, sampleVolunteers } from "@/lib/data"
import { Clock, CheckCircle2, FolderKanban, TrendingUp, Star, ArrowRight, Edit } from "lucide-react"
import Link from "next/link"

export default function VolunteerDashboard() {
  const volunteer = sampleVolunteers[0]
  const profileCompletion = 85

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userType="volunteer" userName={volunteer.name} userAvatar={volunteer.avatar} />

      <div className="flex">
        <VolunteerSidebar />

        <main className="flex-1 p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back, {volunteer.name.split(" ")[0]}!</h1>
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
                    <p className="text-2xl font-bold text-foreground">3</p>
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
                    <p className="text-2xl font-bold text-foreground">2</p>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
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
                    <p className="text-2xl font-bold text-foreground">{volunteer.completedProjects}</p>
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
                    <p className="text-2xl font-bold text-foreground">{volunteer.hoursContributed}</p>
                    <p className="text-sm text-muted-foreground">Hours Given</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="recommended" className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="recommended">Recommended</TabsTrigger>
                    <TabsTrigger value="applied">Applied (3)</TabsTrigger>
                    <TabsTrigger value="active">Active (2)</TabsTrigger>
                  </TabsList>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/projects">View All</Link>
                  </Button>
                </div>

                <TabsContent value="recommended" className="space-y-4">
                  {sampleProjects.slice(0, 3).map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </TabsContent>

                <TabsContent value="applied" className="space-y-4">
                  {sampleProjects.slice(0, 3).map((project) => (
                    <div key={project.id} className="relative">
                      <Badge className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 z-10">
                        Pending Review
                      </Badge>
                      <ProjectCard project={project} />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="active" className="space-y-4">
                  {sampleProjects.slice(0, 2).map((project) => (
                    <div key={project.id} className="relative">
                      <Badge className="absolute top-4 right-4 bg-blue-100 text-blue-800 z-10">In Progress</Badge>
                      <ProjectCard project={project} />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
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
                    <img
                      src={volunteer.avatar || "/placeholder.svg"}
                      alt={volunteer.name}
                      className="w-20 h-20 rounded-full object-cover mb-4"
                    />
                    <h3 className="font-semibold text-foreground">{volunteer.name}</h3>
                    <p className="text-sm text-muted-foreground">{volunteer.location}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{volunteer.rating}</span>
                      <span className="text-muted-foreground">({volunteer.completedProjects} projects)</span>
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

                  <div className="mt-6">
                    <p className="text-sm font-medium text-foreground mb-3">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {volunteer.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="bg-accent text-accent-foreground">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
                        ${(volunteer.hoursContributed * 75).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Estimated value contributed</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href="/volunteer/impact" className="flex items-center justify-center gap-2">
                      View Full Impact Report
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
