import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getNGOProfile, getMyProjectsAsNGO } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NGOSidebar } from "@/components/dashboard/ngo-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  PlusCircle,
  FolderKanban,
  Users,
  Clock,
  MapPin,
  Edit,
  Eye,
  MoreVertical,
  Calendar,
  CheckCircle,
} from "lucide-react"

export default async function NGOProjectsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const ngoProfile = await getNGOProfile()
  const projects = await getMyProjectsAsNGO()

  const activeProjects = projects.filter((p) => p.status === "open")
  const closedProjects = projects.filter((p) => p.status === "closed")
  const completedProjects = projects.filter((p) => p.status === "completed")

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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">My Projects</h1>
              <p className="text-muted-foreground">
                Manage your volunteer opportunities
              </p>
            </div>
            <Button asChild>
              <Link href="/ngo/post-project">
                <PlusCircle className="h-4 w-4 mr-2" />
                Post New Project
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{activeProjects.length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{closedProjects.length}</p>
                <p className="text-sm text-muted-foreground">Closed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{completedProjects.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="active">
            <TabsList className="mb-6">
              <TabsTrigger value="active">
                Active
                <Badge variant="secondary" className="ml-2">{activeProjects.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed
                <Badge variant="secondary" className="ml-2">{closedProjects.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="secondary" className="ml-2">{completedProjects.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <ProjectsList projects={activeProjects} />
            </TabsContent>

            <TabsContent value="closed">
              <ProjectsList projects={closedProjects} />
            </TabsContent>

            <TabsContent value="completed">
              <ProjectsList projects={completedProjects} />
            </TabsContent>

            <TabsContent value="all">
              <ProjectsList projects={projects} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

function ProjectsList({ projects }: { projects: any[] }) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No projects found</p>
          <Button variant="link" asChild>
            <Link href="/ngo/post-project">Create your first project</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <ProjectCard key={project._id?.toString()} project={project} />
      ))}
    </div>
  )
}

function ProjectCard({ project }: { project: any }) {
  const statusColors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-700",
    completed: "bg-blue-100 text-blue-700",
    draft: "bg-yellow-100 text-yellow-700",
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg text-foreground">
                {project.title}
              </h3>
              <Badge className={statusColors[project.status] || "bg-gray-100"}>
                {project.status}
              </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/projects/${project._id?.toString()}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/ngo/projects/${project._id?.toString()}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {project.workMode}
            {project.location && ` • ${project.location}`}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {project.timeCommitment}
          </div>
          {project.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due: {new Date(project.deadline).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {project.skillsRequired?.slice(0, 4).map((skill: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {skill.subskillId}
            </Badge>
          ))}
          {project.skillsRequired?.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{project.skillsRequired.length - 4}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              {project.applicantsCount || 0} applicants
            </span>
            {project.acceptedVolunteers?.length > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                {project.acceptedVolunteers.length} accepted
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ngo/applications?project=${project._id?.toString()}`}>
              View Applications
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
