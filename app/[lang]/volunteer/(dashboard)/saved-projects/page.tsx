import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDictionary } from "@/app/[lang]/dictionaries"
import { Locale } from "@/lib/i18n-config"
import { getSavedProjects, getVolunteerProfile } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { skillCategories } from "@/lib/skills-data"
import Link from "next/link"
import {
  Bookmark,
  MapPin,
  Clock,
  Building2,
  ArrowRight,
  Briefcase,
} from "lucide-react"

function getSkillName(categoryId: string, subskillId: string): string {
  const category = skillCategories.find((c) => c.id === categoryId)
  if (!category) return subskillId
  const subskill = category.subskills.find((s) => s.id === subskillId)
  return subskill?.name || subskillId
}

export default async function SavedProjectsPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang) as any
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
  const savedProjects = await getSavedProjects()

  return (
    <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{dict.volunteer?.savedProjects?.title || "Saved Opportunities"}</h1>
            <p className="text-muted-foreground">
              {dict.volunteer?.savedProjects?.subtitle || "Opportunities you've bookmarked for later"}
            </p>
          </div>

          {savedProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{dict.volunteer?.savedProjects?.noSavedTitle || "No saved opportunities yet"}</h3>
                <p className="text-muted-foreground mb-4">
                  {dict.volunteer?.savedProjects?.noSavedDesc || "When you find opportunities you're interested in, save them here to review later."}
                </p>
                <Button asChild>
                  <Link href="/volunteer/opportunities">
                    {dict.volunteer?.common?.browseOpportunities || "Browse Opportunities"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {savedProjects.map((project) => (
                <Card key={project._id?.toString()} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link
                          href={`/projects/${project._id?.toString()}`}
                          className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {project.title}
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {dict.volunteer?.common?.organization || "Organization"}
                          </span>
                          {project.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {project.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {project.timeCommitment}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {project.workMode}
                        </Badge>
                        <Badge className="bg-primary/10 text-primary capitalize">
                          {project.projectType}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground line-clamp-2 mb-4">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.skillsRequired?.slice(0, 4).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getSkillName(skill.categoryId, skill.subskillId)}
                        </Badge>
                      ))}
                      {(project.skillsRequired?.length || 0) > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{project.skillsRequired.length - 4} {dict.volunteer?.common?.more || "more"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button asChild>
                        <Link href={`/projects/${project._id?.toString()}`}>
                          {dict.volunteer?.common?.viewDetails || "View Details"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
    </main>
  )
}
