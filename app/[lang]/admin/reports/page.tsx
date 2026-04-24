import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Download,
  Users,
  Building2,
  FolderKanban,
  TrendingUp,
} from "lucide-react"
import { getAdminAnalytics, getAllVolunteers, getAllNGOs, getAllProjects } from "@/lib/actions"
import { ReportsGenerator } from "@/components/admin/reports-generator"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"

export default async function AdminReportsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any
  const [analytics, volunteersData, ngosData, projectsData] = await Promise.all([
    getAdminAnalytics(),
    getAllVolunteers(1, 100),
    getAllNGOs(1, 100),
    getAllProjects(1, 100)
  ])

  const volunteers = volunteersData.data
  const ngos = ngosData.data
  const projects = projectsData.data

  // Calculate this month's stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const newVolunteersThisMonth = volunteers.filter((v: any) => {
    if (!v.createdAt) return false
    const date = new Date(v.createdAt)
    return date >= startOfMonth
  }).length

  const newNGOsThisMonth = ngos.filter((n: any) => {
    if (!n.createdAt) return false
    const date = new Date(n.createdAt)
    return date >= startOfMonth
  }).length

  const newProjectsThisMonth = projects.filter((p: any) => {
    if (!p.createdAt) return false
    const date = new Date(p.createdAt)
    return date >= startOfMonth
  }).length

  const totalNewUsersThisMonth = newVolunteersThisMonth + newNGOsThisMonth

  // Calculate conversion rate (applications to accepted)
  const conversionRate = analytics.totalApplications > 0 
    ? Math.round((analytics.completedProjects / analytics.totalApplications) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{dict.admin?.reports?.title || "Reports & Analytics"}</h1>
          <p className="text-muted-foreground">
            {dict.admin?.reports?.subtitle || "View platform analytics and generate reports"}
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {dict.admin?.reports?.downloadReport || "Download Report"}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{dict.admin?.reports?.newUsersThisMonth || "New Users (This Month)"}</p>
                <p className="text-2xl font-bold text-foreground">{totalNewUsersThisMonth}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{dict.admin?.reports?.newNgosThisMonth || "New NGOs (This Month)"}</p>
                <p className="text-2xl font-bold text-foreground">{newNGOsThisMonth}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{dict.admin?.reports?.newOpportunitiesThisMonth || "New Opportunities (This Month)"}</p>
                <p className="text-2xl font-bold text-foreground">{newProjectsThisMonth}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{dict.admin?.reports?.conversionRate || "Conversion Rate"}</p>
                <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {dict.admin?.reports?.userGrowth || "User Growth"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-sm">
                {dict.admin?.reports?.chartPlaceholder || "Chart will appear when there's data"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-secondary" />
              {dict.admin?.reports?.opportunityActivity || "Opportunity Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-sm">
                {dict.admin?.reports?.chartPlaceholder || "Chart will appear when there's data"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports - Interactive */}
      <ReportsGenerator 
        volunteers={volunteers} 
        ngos={ngos} 
        projects={projects}
        analytics={analytics}
      />
    </div>
  )
}
