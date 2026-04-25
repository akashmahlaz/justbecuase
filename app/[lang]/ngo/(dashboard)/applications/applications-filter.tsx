"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Clock, ExternalLink, FileText, MessageSquare } from "lucide-react"
import { resolveSkillName } from "@/lib/skills-data"
import { ApplicationActions } from "./application-actions"

interface ApplicationsFilterProps {
  applications: any[]
  dict: any
  initialProjectFilter?: string
}

export function ApplicationsFilter({ applications, dict, initialProjectFilter }: ApplicationsFilterProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter || "all")

  // Unique project list for filtering
  const projects = useMemo(() => {
    const map = new Map<string, string>()
    for (const app of applications) {
      const pid = app.projectId?.toString()
      if (pid && app.project?.title) {
        map.set(pid, app.project.title)
      }
    }
    return Array.from(map, ([id, title]) => ({ id, title }))
  }, [applications])

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Project filter
      if (projectFilter !== "all" && app.projectId?.toString() !== projectFilter) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const name = (app.volunteerProfile?.name || "").toLowerCase()
        const projectTitle = (app.project?.title || "").toLowerCase()
        const coverMsg = (app.coverMessage || "").toLowerCase()
        const skills = (app.volunteerProfile?.skills || [])
          .map((s: any) => resolveSkillName(s.subskillId).toLowerCase())
          .join(" ")

        if (!name.includes(q) && !projectTitle.includes(q) && !coverMsg.includes(q) && !skills.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [applications, projectFilter, searchQuery])

  const pendingCount = filteredApplications.filter((a: any) => a.status === "pending").length
  const acceptedCount = filteredApplications.filter((a: any) => a.status === "accepted").length
  const shortlistedCount = filteredApplications.filter((a: any) => a.status === "shortlisted").length
  const rejectedCount = filteredApplications.filter((a: any) => a.status === "rejected").length

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    shortlisted: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-gray-100 text-gray-700",
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">{dict.ngo?.applications?.noApplications || "No applications yet"}</p>
          <p className="text-sm text-muted-foreground">
            {dict.ngo?.applications?.noApplicationsDesc || "When candidates apply to your jobs, they will appear here."}
          </p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/ngo/post-project">{dict.ngo?.common?.postOpportunity || "Post an Job"}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={dict.ngo?.applications?.searchPlaceholder || "Search by name, project, skill..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {projects.length > 1 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-62.5">
              <SelectValue placeholder={dict.ngo?.applications?.filterByProject || "Filter by project"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{dict.ngo?.common?.allProjects || "All Projects"}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="truncate">{p.title}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{pendingCount}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500">{dict.ngo?.common?.pending || "Pending"}</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{shortlistedCount}</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">{dict.ngo?.common?.shortlisted || "Shortlisted"}</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{acceptedCount}</p>
          <p className="text-xs text-green-600 dark:text-green-500">{dict.ngo?.common?.accepted || "Accepted"}</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{rejectedCount}</p>
          <p className="text-xs text-red-600 dark:text-red-500">{dict.ngo?.common?.rejected || "Rejected"}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">{dict.ngo?.common?.pending || "Pending"} ({pendingCount})</TabsTrigger>
          <TabsTrigger value="shortlisted">{dict.ngo?.common?.shortlisted || "Shortlisted"} ({shortlistedCount})</TabsTrigger>
          <TabsTrigger value="accepted">{dict.ngo?.common?.accepted || "Accepted"} ({acceptedCount})</TabsTrigger>
          <TabsTrigger value="all">{dict.ngo?.common?.all || "All"} ({filteredApplications.length})</TabsTrigger>
        </TabsList>

        {["pending", "shortlisted", "accepted", "all"].map((tab) => {
          const tabApps = filteredApplications.filter((a) => tab === "all" || a.status === tab)
          return (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {tabApps.map((application) => {
                const skills = application.volunteerProfile?.skills?.slice(0, 4) || []

                return (
                  <Card key={application._id?.toString()} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <img
                          src={application.volunteerProfile?.avatar || "/placeholder.svg?height=64&width=64"}
                          alt="Candidate"
                          className="w-16 h-16 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {application.volunteerProfile?.name || (dict.ngo?.common?.impactAgent || "Candidate")}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {application.volunteerProfile?.location || (dict.ngo?.applications?.locationNotSpecified || "Location not specified")}
                              </p>
                            </div>
                            <Badge className={statusColors[application.status]}>
                              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </Badge>
                          </div>

                          <p className="text-sm text-foreground mb-2">
                            {dict.ngo?.applications?.appliedFor || "Applied for: "}
                            <span className="font-medium">{application.project?.title || (dict.ngo?.common?.opportunity || "Opportunity")}</span>
                          </p>

                          {application.coverMessage && (
                            <div className="text-sm text-muted-foreground mb-3 p-2.5 bg-muted/50 rounded-md border-l-2 border-muted-foreground/20">
                              <MessageSquare className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground/60" />
                              <span className="line-clamp-2">&ldquo;{application.coverMessage}&rdquo;</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(application.appliedAt).toLocaleDateString()}
                            </span>
                            <span>
                              {application.volunteerProfile?.completedProjects || 0} {dict.ngo?.applications?.tasksCompleted || "tasks completed"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {skills.map((skill: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs bg-accent text-accent-foreground">
                                {resolveSkillName(skill.subskillId)}
                              </Badge>
                            ))}
                            {(application.volunteerProfile?.skills?.length || 0) > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{application.volunteerProfile.skills.length - 4}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/volunteers/${application.volunteerId}`}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                {dict.ngo?.common?.viewProfile || "View Profile"}
                              </Link>
                            </Button>

                            <ApplicationActions
                              applicationId={application._id?.toString() || ""}
                              currentStatus={application.status}
                              volunteerName={application.volunteerProfile?.name}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {tabApps.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? (dict.ngo?.applications?.noSearchResults || "No applications match your search.")
                        : (dict.ngo?.applications?.noTabApplications || "No {tab} applications").replace("{tab}", tab)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
