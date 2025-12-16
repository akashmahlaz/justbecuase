import { Suspense } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { getAdminAnalytics } from "@/lib/actions"
import {
  Users,
  Building2,
  FolderKanban,
  FileText,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  BarChart3,
  PieChart,
  Target,
  Zap,
  ArrowRight,
  Shield,
  MessageSquare,
  Eye,
  Calendar,
  Clock,
} from "lucide-react"

export default async function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your platform&apos;s performance
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

async function DashboardContent() {
  const analytics = await getAdminAnalytics()

  return (
    <>
      {/* Key Metrics Row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Volunteers"
          value={analytics.totalVolunteers}
          icon={Users}
          subtext={`+${analytics.recentVolunteers} this month`}
          trend="up"
          trendValue={analytics.recentVolunteers > 0 ? `+${Math.round((analytics.recentVolunteers / Math.max(analytics.totalVolunteers - analytics.recentVolunteers, 1)) * 100)}%` : "0%"}
        />
        <MetricCard
          title="Total NGOs"
          value={analytics.totalNGOs}
          icon={Building2}
          subtext={`+${analytics.recentNGOs} this month`}
          trend="up"
          trendValue={analytics.recentNGOs > 0 ? `+${Math.round((analytics.recentNGOs / Math.max(analytics.totalNGOs - analytics.recentNGOs, 1)) * 100)}%` : "0%"}
        />
        <MetricCard
          title="Active Projects"
          value={analytics.activeProjects}
          icon={FolderKanban}
          subtext={`${analytics.completedProjects} completed`}
          trend="up"
          trendValue={`+${analytics.recentProjects}`}
        />
        <MetricCard
          title="Applications"
          value={analytics.totalApplications}
          icon={FileText}
          subtext={`${analytics.pendingApplications} pending`}
          trend="up"
          trendValue={`+${analytics.recentApplications}`}
        />
        <MetricCard
          title="Total Revenue"
          value={`₹${analytics.totalRevenue.toLocaleString()}`}
          icon={IndianRupee}
          subtext={`₹${analytics.monthlyRevenue.toLocaleString()} this month`}
          trend="up"
          trendValue={analytics.totalRevenue > 0 ? `+${Math.round((analytics.monthlyRevenue / analytics.totalRevenue) * 100)}%` : "0%"}
        />
      </div>

      {/* Conversion Metrics */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="font-medium">NGO Verification Rate</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{analytics.ngoVerificationRate}%</span>
            </div>
            <Progress value={analytics.ngoVerificationRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.verifiedNGOs} of {analytics.totalNGOs} NGOs verified
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Project Success Rate</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{analytics.projectSuccessRate}%</span>
            </div>
            <Progress value={analytics.projectSuccessRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.completedProjects} of {analytics.totalProjects} projects completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Application Accept Rate</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">{analytics.applicationAcceptRate}%</span>
            </div>
            <Progress value={analytics.applicationAcceptRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {analytics.acceptedApplications} of {analytics.totalApplications} applications accepted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Real-time platform activity feed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.length > 0 ? (
                analytics.recentActivity.map((activity: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === "payment" ? "bg-green-500" :
                      activity.type === "volunteer_signup" ? "bg-blue-500" :
                      activity.type === "ngo_signup" ? "bg-purple-500" :
                      activity.type === "project_created" ? "bg-orange-500" :
                      "bg-primary"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{activity.text}</p>
                      <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type.replace("_", " ")}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Action Items
            </CardTitle>
            <CardDescription>Tasks requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/ngos?filter=pending">
                <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-foreground">Pending NGO Verifications</p>
                        <p className="text-sm text-muted-foreground">Review and verify</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{analytics.pendingNGOVerifications}</Badge>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/ngos?filter=pending">
                <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-foreground">Pending Applications</p>
                        <p className="text-sm text-muted-foreground">Awaiting NGO response</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{analytics.pendingApplications}</Badge>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/support">
                <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-foreground">Support Tickets</p>
                        <p className="text-sm text-muted-foreground">User requests</p>
                      </div>
                    </div>
                    <Badge variant="secondary">3</Badge>
                  </div>
                </div>
              </Link>
              
              <Link href="/admin/reports">
                <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-foreground">Reports to Review</p>
                        <p className="text-sm text-muted-foreground">Content/user reports</p>
                      </div>
                    </div>
                    <Badge variant="secondary">2</Badge>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Row */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Skills in Demand */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Skills in Demand
            </CardTitle>
            <CardDescription>Most requested skills from active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.skillsInDemand.length > 0 ? (
                analytics.skillsInDemand.map((skill: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium truncate">{skill.skill}</div>
                    <div className="flex-1">
                      <Progress 
                        value={(skill.count / (analytics.skillsInDemand[0]?.count || 1)) * 100} 
                        className="h-2"
                      />
                    </div>
                    <div className="w-8 text-sm text-muted-foreground text-right">{skill.count}</div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Causes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Top Causes
            </CardTitle>
            <CardDescription>Most popular cause categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topCauses.length > 0 ? (
                analytics.topCauses.map((cause: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium truncate">{cause.cause}</div>
                    <div className="flex-1">
                      <Progress 
                        value={(cause.count / (analytics.topCauses[0]?.count || 1)) * 100} 
                        className="h-2"
                      />
                    </div>
                    <div className="w-8 text-sm text-muted-foreground text-right">{cause.count}</div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Manage Users
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/projects">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  All Projects
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/payments">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  Payments
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Settings
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  subtext,
  trend,
  trendValue,
}: {
  title: string
  value: string | number
  icon: any
  subtext: string
  trend: "up" | "down"
  trendValue: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span
            className={`text-xs font-medium flex items-center gap-0.5 ${
              trend === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendValue}
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
