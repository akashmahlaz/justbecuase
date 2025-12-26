import { Card, CardContent } from "@/components/ui/card"
import { getAllProjects, getAdminAnalytics } from "@/lib/actions"
import { ProjectsSearchableList } from "@/components/admin/projects-searchable-list"

export default async function AdminProjectsPage() {
  const [analytics, projectsData] = await Promise.all([
    getAdminAnalytics(),
    getAllProjects(1, 100) // Get more projects for better search
  ])
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Manage Projects</h1>
        <p className="text-muted-foreground">
          View and manage all volunteer opportunities
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">{analytics.activeProjects + analytics.completedProjects}</p>
            <p className="text-sm text-muted-foreground">Total Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{analytics.activeProjects}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{analytics.completedProjects}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{analytics.totalApplications}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Searchable Projects List */}
      <ProjectsSearchableList 
        projects={projectsData.data} 
        title="All Projects"
      />
    </div>
  )
}
