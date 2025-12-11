import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminStats } from "@/lib/actions"
import {
  Users,
  Building2,
  FolderKanban,
  FileText,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react"

export default async function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your platform&apos;s performance and activity
        </p>
      </div>

      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { text: "New volunteer registered", time: "2 minutes ago", type: "user" },
                { text: "NGO posted new project", time: "15 minutes ago", type: "project" },
                { text: "Profile unlock payment received", time: "1 hour ago", type: "payment" },
                { text: "New application submitted", time: "2 hours ago", type: "application" },
                { text: "NGO completed verification", time: "3 hours ago", type: "verification" },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "Verify NGOs", count: 5, href: "/admin/ngos?filter=pending" },
                { title: "Review Reports", count: 2, href: "/admin/reports" },
                { title: "Pending Refunds", count: 0, href: "/admin/payments?filter=refunds" },
                { title: "Support Tickets", count: 3, href: "/admin/support" },
              ].map((action, i) => (
                <a
                  key={i}
                  href={action.href}
                  className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{action.count}</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function StatsCards() {
  const stats = await getAdminStats()

  const cards = [
    {
      title: "Total Volunteers",
      value: stats.totalVolunteers,
      icon: Users,
      change: "+12%",
      trend: "up",
    },
    {
      title: "Total NGOs",
      value: stats.totalNGOs,
      icon: Building2,
      change: "+8%",
      trend: "up",
    },
    {
      title: "Active Projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      change: "+24%",
      trend: "up",
    },
    {
      title: "Applications",
      value: stats.totalApplications,
      icon: FileText,
      change: "+18%",
      trend: "up",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: IndianRupee,
      change: "+32%",
      trend: "up",
    },
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <span
                className={`text-xs font-medium flex items-center gap-0.5 ${
                  card.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {card.trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {card.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.title}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatsCardsSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-24 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
