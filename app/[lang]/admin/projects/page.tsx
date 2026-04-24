import { Card, CardContent } from "@/components/ui/card"
import { getAllProjects, getAdminAnalytics } from "@/lib/actions"
import { ProjectsSearchableList } from "@/components/admin/projects-searchable-list"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"

export default async function AdminProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any
  const [analytics, projectsData] = await Promise.all([
    getAdminAnalytics(),
    getAllProjects(1, 100) // Get more projects for better search
  ])
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{dict.admin?.projects?.title || "Manage Opportunities"}</h1>
        <p className="text-muted-foreground">
          {dict.admin?.projects?.subtitle || "View and manage all impact agent opportunities"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{analytics.activeProjects + analytics.completedProjects}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.projects?.totalOpportunities || "Total Opportunities"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{analytics.activeProjects}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.common?.active || "Active"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{analytics.completedProjects}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.projects?.completed || "Completed"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{analytics.totalApplications}</p>
            <p className="text-sm text-muted-foreground">{dict.admin?.projects?.totalApplications || "Total Applications"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Searchable Projects List */}
      <ProjectsSearchableList 
        projects={projectsData.data} 
        title={dict.admin?.projects?.allOpportunities || "All Opportunities"}
      />
    </div>
  )
}
