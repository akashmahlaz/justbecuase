"use client"

import { useState, useEffect } from "react"
import LocaleLink from "@/components/locale-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Target,
  TrendingUp,
  Mail,
  Activity,
  Building2,
  Users,
  Coins,
  ArrowRight,
  Zap,
  BarChart3,
  Clock,
} from "lucide-react"
import type { CreditBalance } from "@/lib/theirstack"

const modules = [
  {
    title: "NGO Prospecting",
    description: "Search and discover NGOs hiring for roles that match your platform's skill categories. Find organizations to partner with.",
    href: "/marketing/prospecting",
    icon: Target,
    status: "active" as const,
    color: "text-blue-600 bg-blue-600/10",
  },
  {
    title: "Skills Demand",
    description: "Analyze which skills NGOs are hiring for most, identify trending skill gaps, and optimize your volunteer matching.",
    href: "/marketing/skills-demand",
    icon: TrendingUp,
    status: "coming-soon" as const,
    color: "text-emerald-600 bg-emerald-600/10",
  },
  {
    title: "Hiring Pulse",
    description: "Track real-time hiring activity across the nonprofit sector. Monitor which organizations are actively recruiting.",
    href: "/marketing/hiring-pulse",
    icon: Activity,
    status: "coming-soon" as const,
    color: "text-purple-600 bg-purple-600/10",
  },
  {
    title: "Outreach Generator",
    description: "Generate personalized outreach emails and messages for NGO partnerships based on their hiring needs.",
    href: "/marketing/outreach",
    icon: Mail,
    status: "coming-soon" as const,
    color: "text-orange-600 bg-orange-600/10",
  },
  {
    title: "NGO Enrichment",
    description: "Enrich existing NGO profiles with company intelligence — tech stack, team size, funding, and more.",
    href: "/marketing/enrichment",
    icon: Building2,
    status: "coming-soon" as const,
    color: "text-teal-600 bg-teal-600/10",
  },
  {
    title: "Volunteer Match",
    description: "Match your platform's volunteers with NGO job openings based on skills, experience, and availability.",
    href: "/marketing/volunteer-match",
    icon: Users,
    status: "coming-soon" as const,
    color: "text-pink-600 bg-pink-600/10",
  },
]

export default function MarketingDashboardPage() {
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(true)

  useEffect(() => {
    fetch("/api/marketing/theirstack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "creditBalance" }),
    })
      .then(async (res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (data) setCredits(data)
      })
      .catch(() => {})
      .finally(() => setLoadingCredits(false))
  }, [])

  const activeModules = modules.filter((m) => m.status === "active").length
  const totalModules = modules.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          Discover NGOs, analyze hiring trends, and grow your platform with data-driven intelligence.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Credits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingCredits ? (
              <Skeleton className="h-8 w-24" />
            ) : credits ? (
              <>
                <div className="text-2xl font-bold">{(credits.api_credits - credits.used_api_credits).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  of {credits.api_credits.toLocaleString()} total credits
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">Unable to fetch balance</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Modules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeModules}</div>
            <p className="text-xs text-muted-foreground">of {totalModules} total modules</p>
          </CardContent>
        </Card>

        {/* Data Source */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Data Source</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">TheirStack</div>
            <p className="text-xs text-muted-foreground">Job & company intelligence API</p>
          </CardContent>
        </Card>

        {/* Module Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalModules - activeModules}</div>
            <p className="text-xs text-muted-foreground">modules in development</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <LocaleLink href="/marketing/prospecting">
              <Target className="h-4 w-4 mr-2" />
              Search NGOs
            </LocaleLink>
          </Button>
          <Button variant="outline" asChild>
            <LocaleLink href="/admin/dashboard">
              Back to Admin Panel
            </LocaleLink>
          </Button>
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Card key={mod.href} className="group relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${mod.color}`}>
                    <mod.icon className="size-5" />
                  </div>
                  <Badge variant={mod.status === "active" ? "default" : "secondary"}>
                    {mod.status === "active" ? "Active" : "Coming Soon"}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-3">{mod.title}</CardTitle>
                <CardDescription className="text-sm">{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant={mod.status === "active" ? "default" : "ghost"}
                  size="sm"
                  className="w-full"
                  asChild={mod.status === "active"}
                  disabled={mod.status !== "active"}
                >
                  {mod.status === "active" ? (
                    <LocaleLink href={mod.href}>
                      Open Module
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </LocaleLink>
                  ) : (
                    <span>Coming Soon</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
