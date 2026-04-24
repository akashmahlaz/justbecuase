"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  TrendingUp,
  DollarSign,
  Search,
  MousePointerClick,
  Loader2,
  BarChart3,
  Mail,
} from "lucide-react"

// ==========================================
// TYPES
// ==========================================

interface TimeSeriesPoint {
  date: string
  count: number
  value?: number
}

interface DashboardMetrics {
  userGrowth: TimeSeriesPoint[]
  ngoGrowth: TimeSeriesPoint[]
  projectGrowth: TimeSeriesPoint[]
  revenueTimeSeries: TimeSeriesPoint[]
  mrr: number
  arr: number
  totalRevenue: number
  searchesPerDay: TimeSeriesPoint[]
  applicationsPerDay: TimeSeriesPoint[]
  matchRate: number
  signupToProfileRate: number
  profileToApplicationRate: number
  applicationToMatchRate: number
  emailsSent: number
  emailOpenRate: number
  emailClickRate: number
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#06b6d4", "#f59e0b", "#ef4444"]

// ==========================================
// MAIN COMPONENT
// ==========================================

export function AnalyticsCharts() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/analytics?type=dashboard&days=${days}`)
        const data = await res.json()
        if (data.success) {
          setMetrics(data.data)
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [days])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Analytics data will appear as the platform generates events.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Time range:</span>
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              days === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {d === 7 ? "7 days" : d === 30 ? "30 days" : "90 days"}
          </button>
        ))}
      </div>

      {/* Growth Charts */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                User Growth Over Time
              </CardTitle>
              <CardDescription>New volunteer and NGO signups per day</CardDescription>
            </CardHeader>
            <CardContent>
              <GrowthChart
                data={mergeTimeSeries(metrics.userGrowth, metrics.ngoGrowth)}
                series={[
                  { key: "volunteers", name: "Volunteers", color: "#6366f1" },
                  { key: "ngos", name: "NGOs", color: "#8b5cf6" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Projects & Applications
              </CardTitle>
              <CardDescription>New projects created and applications submitted per day</CardDescription>
            </CardHeader>
            <CardContent>
              <GrowthChart
                data={mergeTimeSeries(metrics.projectGrowth, metrics.applicationsPerDay)}
                series={[
                  { key: "volunteers", name: "Projects", color: "#f97316" },
                  { key: "ngos", name: "Applications", color: "#10b981" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Revenue
                  </CardTitle>
                  <CardDescription>Payment activity over time</CardDescription>
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">MRR</p>
                    <p className="text-lg font-bold text-green-600">${metrics.mrr.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ARR</p>
                    <p className="text-lg font-bold text-green-600">${metrics.arr.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RevenueChart data={metrics.revenueTimeSeries} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Funnel + Email Metrics Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-primary" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>User journey from signup to match</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart
              steps={[
                { name: "Signup", rate: 100, color: "#6366f1" },
                { name: "Profile Complete", rate: metrics.signupToProfileRate, color: "#8b5cf6" },
                { name: "Applied", rate: metrics.profileToApplicationRate, color: "#ec4899" },
                { name: "Matched", rate: metrics.applicationToMatchRate, color: "#10b981" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Email Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Performance
            </CardTitle>
            <CardDescription>Delivery, open, and click rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{metrics.emailsSent}</p>
                <p className="text-sm text-muted-foreground">Emails Sent ({days} days)</p>
              </div>
              <EmailMetricsPie
                data={[
                  { name: "Opened", value: metrics.emailOpenRate, color: "#10b981" },
                  { name: "Clicked", value: metrics.emailClickRate, color: "#6366f1" },
                  { name: "Unopened", value: Math.max(0, 100 - metrics.emailOpenRate), color: "#e5e7eb" },
                ]}
              />
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{metrics.emailOpenRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Open Rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{metrics.emailClickRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Click Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search Activity
          </CardTitle>
          <CardDescription>
            Search queries per day — Match Rate: <Badge variant="secondary">{metrics.matchRate.toFixed(1)}%</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchChart data={metrics.searchesPerDay} />
        </CardContent>
      </Card>
    </div>
  )
}

// ==========================================
// SUB-CHARTS
// ==========================================

function mergeTimeSeries(a: TimeSeriesPoint[], b: TimeSeriesPoint[]): { date: string; volunteers: number; ngos: number }[] {
  const map = new Map<string, { volunteers: number; ngos: number }>()
  a.forEach(p => {
    const existing = map.get(p.date) || { volunteers: 0, ngos: 0 }
    existing.volunteers = p.count
    map.set(p.date, existing)
  })
  b.forEach(p => {
    const existing = map.get(p.date) || { volunteers: 0, ngos: 0 }
    existing.ngos = p.count
    map.set(p.date, existing)
  })
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date: formatDate(date), ...data }))
}

function formatDate(dateStr: string): string {
  if (dateStr.includes("T")) {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`
  }
  if (dateStr.includes("W")) return dateStr
  const parts = dateStr.split("-")
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`
}

function GrowthChart({ data, series }: {
  data: { date: string; volunteers: number; ngos: number }[]
  series: { key: string; name: string; color: string }[]
}) {
  if (data.length === 0) {
    return <EmptyChart />
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
        <YAxis className="text-xs" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        {series.map(s => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            fill={`url(#gradient-${s.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

function RevenueChart({ data }: { data: TimeSeriesPoint[] }) {
  if (data.length === 0) return <EmptyChart />

  const chartData = data.map(d => ({
    date: formatDate(d.date),
    revenue: (d.value || 0) / 100, // cents to dollars
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
        <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function SearchChart({ data }: { data: TimeSeriesPoint[] }) {
  if (data.length === 0) return <EmptyChart />

  const chartData = data.map(d => ({
    date: formatDate(d.date),
    searches: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
        <YAxis className="text-xs" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Line
          type="monotone"
          dataKey="searches"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function FunnelChart({ steps }: { steps: { name: string; rate: number; color: string }[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{step.name}</span>
            <span className="text-sm font-bold" style={{ color: step.color }}>
              {step.rate.toFixed(1)}%
            </span>
          </div>
          <div className="h-8 bg-muted rounded-md overflow-hidden relative">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${Math.max(step.rate, 2)}%`,
                backgroundColor: step.color,
                opacity: 0.8,
              }}
            />
          </div>
          {i < steps.length - 1 && (
            <div className="flex justify-center py-1">
              <span className="text-xs text-muted-foreground">
                {step.rate > 0 && steps[i + 1] ?
                  `${((steps[i + 1].rate / step.rate) * 100).toFixed(0)}% conversion` :
                  "—"
                }
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function EmailMetricsPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Legend
          formatter={(value) => <span className="text-xs">{value}</span>}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
      No data yet. Charts will populate as the platform generates events.
    </div>
  )
}
