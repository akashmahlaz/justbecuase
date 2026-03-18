import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"
import { getNGOProfile, getMyProjectsAsNGO } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { resolveSkillName } from "@/lib/skills-data"
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
  AlertTriangle,
  Copy,
} from "lucide-react"
import { ProjectStatusSelect } from "./project-status-select"

export default async function NGOProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect(`/${lang}/auth/signin`)
  }

  // Role verification: Ensure user is an NGO
  if (session.user.role !== "ngo") {
    if (session.user.role === "volunteer") {
      redirect(`/${lang}/volunteer/dashboard`)
    } else if (session.user.role === "admin") {
      redirect(`/${lang}/admin`)
    } else {
      redirect(`/${lang}/auth/role-select`)
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    redirect(`/${lang}/ngo/onboarding`)
  }

  const ngoProfile = await getNGOProfile()
  const projects = await getMyProjectsAsNGO()

  const activeProjects = projects.filter((p) => p.status === "open" || p.status === "active")
  const closedProjects = projects.filter((p) => p.status === "closed")
  const completedProjects = projects.filter((p) => p.status === "completed")

  return (
    <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{dict.ngo?.projects?.title || "My Requirements"}</h1>
              <p className="text-muted-foreground">
                {dict.ngo?.projects?.subtitle || "Manage your impact agent opportunities"}
              </p>
            </div>
            <Button asChild>
              <Link href="/ngo/post-project">
                <PlusCircle className="h-4 w-4 mr-2" />
                {dict.ngo?.projects?.postNewRequirement || "Post New Requirement"}
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{activeProjects.length}</p>
                <p className="text-sm text-muted-foreground">{dict.ngo?.common?.active || "Active"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{closedProjects.length}</p>
                <p className="text-sm text-muted-foreground">{dict.ngo?.common?.closed || "Closed"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{completedProjects.length}</p>
                <p className="text-sm text-muted-foreground">{dict.ngo?.common?.completed || "Completed"}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="active">
            <TabsList className="mb-6">
              <TabsTrigger value="active">
                {dict.ngo?.common?.active || "Active"}
                <Badge variant="secondary" className="ml-2">{activeProjects.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="closed">
                {dict.ngo?.common?.closed || "Closed"}
                <Badge variant="secondary" className="ml-2">{closedProjects.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                {dict.ngo?.common?.completed || "Completed"}
                <Badge variant="secondary" className="ml-2">{completedProjects.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all">{dict.ngo?.common?.all || "All"}</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <ProjectsList projects={activeProjects} dict={dict} />
            </TabsContent>

            <TabsContent value="closed">
              <ProjectsList projects={closedProjects} dict={dict} />
            </TabsContent>

            <TabsContent value="completed">
              <ProjectsList projects={completedProjects} dict={dict} />
            </TabsContent>

            <TabsContent value="all">
              <ProjectsList projects={projects} dict={dict} />
            </TabsContent>
          </Tabs>
    </main>
  )
}

function ProjectsList({ projects, dict }: { projects: any[]; dict: any }) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{dict.ngo?.projects?.noOpportunities || "No opportunities found"}</p>
          <Button variant="link" asChild>
            <Link href="/ngo/post-project">{dict.ngo?.dashboard?.createFirstOpportunity || "Create your first opportunity"}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <ProjectCard key={project._id?.toString()} project={project} dict={dict} />
      ))}
    </div>
  )
}

function ProjectCard({ project, dict }: { project: any; dict: any }) {
  const statusColors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    active: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-700",
    completed: "bg-blue-100 text-blue-700",
    draft: "bg-yellow-100 text-yellow-700",
    paused: "bg-yellow-100 text-yellow-700",
  }

  // Deadline urgency indicator
  const daysUntilDeadline = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isDeadlineSoon = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 3
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg text-foreground">
                {project.title}
              </h3>
              <Badge className={statusColors[project.status] || "bg-gray-100"}>
                {project.status}
              </Badge>
              {isDeadlineSoon && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {daysUntilDeadline === 0
                    ? (dict.ngo?.projects?.deadlineToday || "Deadline today")
                    : `${daysUntilDeadline}d left`}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {dict.ngo?.projects?.overdue || "Overdue"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <ProjectStatusSelect
              projectId={project._id?.toString()}
              currentStatus={project.status}
              projectTitle={project.title}
            />
            <Button variant="ghost" size="icon" asChild title={dict.ngo?.common?.viewPublic || "View public page"}>
              <Link href={`/projects/${project._id?.toString()}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title={dict.ngo?.projects?.edit?.title || "Edit"}>
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
              {dict.ngo?.projects?.due || "Due: "}{new Date(project.deadline).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {project.skillsRequired?.slice(0, 4).map((skill: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {resolveSkillName(skill.subskillId)}
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
              {project.applicantsCount || 0} {dict.ngo?.common?.applicants || "applicants"}
            </span>
            {project.acceptedVolunteers?.length > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                {project.acceptedVolunteers.length} {dict.ngo?.common?.accepted || "accepted"}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ngo/applications?project=${project._id?.toString()}`}>
              {dict.ngo?.common?.viewApplications || "View Applications"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
