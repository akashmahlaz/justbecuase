"use client"

import { useState, useEffect, useCallback } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Briefcase, MapPin, Clock, Globe, ExternalLink, Search,
  Building2, ChevronLeft, ChevronRight, Loader2, Filter, X,
  Wifi, DollarSign, Users,
} from "lucide-react"

interface Job {
  id: number
  job_title: string
  url: string | null
  final_url: string | null
  date_posted: string | null
  company: string
  company_domain: string | null
  location: string | null
  remote: boolean
  hybrid: boolean
  salary_string: string | null
  min_annual_salary_usd: number | null
  max_annual_salary_usd: number | null
  seniority: string | null
  employment_statuses: string[]
  description: string | null
  hiring_team: Array<{
    full_name: string
    role: string | null
    linkedin_url: string | null
  }>
  has_blurred_data: boolean
}

interface JobsResponse {
  jobs: Job[]
  metadata: {
    total_results: number | null
    total_companies: number | null
  }
  cached: boolean
}

const ITEMS_PER_PAGE = 25

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalResults, setTotalResults] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [remoteFilter, setRemoteFilter] = useState<string>("all")
  const [countryFilter, setCountryFilter] = useState("")
  const [expandedJob, setExpandedJob] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })
      if (activeSearch) params.set("q", activeSearch)
      if (remoteFilter === "remote") params.set("remote", "true")
      if (countryFilter) params.set("country", countryFilter)

      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error("Failed to fetch jobs")
      const data: JobsResponse = await res.json()

      setJobs(data.jobs || [])
      setTotalResults(data.metadata?.total_results ?? null)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [page, activeSearch, remoteFilter, countryFilter])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setActiveSearch(searchQuery)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setActiveSearch("")
    setRemoteFilter("all")
    setCountryFilter("")
    setPage(0)
  }

  const hasActiveFilters = activeSearch || remoteFilter !== "all" || countryFilter

  function daysAgo(dateStr: string | null): string {
    if (!dateStr) return "Unknown"
    const days = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  function formatSalary(job: Job): string | null {
    if (job.salary_string) return job.salary_string
    if (job.min_annual_salary_usd && job.max_annual_salary_usd) {
      return `$${(job.min_annual_salary_usd / 1000).toFixed(0)}k – $${(job.max_annual_salary_usd / 1000).toFixed(0)}k`
    }
    if (job.min_annual_salary_usd) {
      return `From $${(job.min_annual_salary_usd / 1000).toFixed(0)}k`
    }
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-linear-to-b from-primary/5 to-background py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Enterprise & Nonprofit Job Board
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Discover open positions at nonprofits, Enterprises, and social impact organizations worldwide.
              </p>

              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search job titles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit">Search</Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-primary/10" : ""}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </form>

              {/* Filters */}
              {showFilters && (
                <div className="mt-4 flex flex-wrap gap-3 justify-center items-center">
                  <Select value={remoteFilter} onValueChange={(v) => { setRemoteFilter(v); setPage(0) }}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Work Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="remote">Remote Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Country code (e.g. US, GB)"
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value.slice(0, 2))}
                    className="w-50"
                  />

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8">
          <div className="container mx-auto px-4 md:px-6">
            {/* Stats bar */}
            {!loading && !error && (
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  {totalResults !== null
                    ? `${totalResults.toLocaleString()} jobs found`
                    : `${jobs.length} jobs`}
                  {activeSearch && (
                    <span> for &quot;{activeSearch}&quot;</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Page {page + 1}
                  {totalResults ? ` of ${Math.ceil(totalResults / ITEMS_PER_PAGE)}` : ""}
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="p-6 text-center">
                  <p className="text-destructive font-medium mb-2">Failed to load jobs</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchJobs} variant="outline">Try Again</Button>
                </CardContent>
              </Card>
            )}

            {/* Empty */}
            {!loading && !error && jobs.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-1">No jobs found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Job list */}
            {!loading && !error && jobs.length > 0 && (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const salary = formatSalary(job)
                  const isExpanded = expandedJob === job.id
                  const jobUrl = job.final_url || job.url

                  return (
                    <Card
                      key={job.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          {/* Left */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground text-lg leading-tight mb-1">
                              {job.job_title}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{job.company}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {job.location && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {job.location}
                                </Badge>
                              )}
                              {job.remote && (
                                <Badge variant="secondary" className="text-xs font-normal bg-green-500/10 text-green-700 dark:text-green-400">
                                  <Wifi className="h-3 w-3 mr-1" />
                                  Remote
                                </Badge>
                              )}
                              {job.hybrid && (
                                <Badge variant="secondary" className="text-xs font-normal bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                  Hybrid
                                </Badge>
                              )}
                              {salary && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {salary}
                                </Badge>
                              )}
                              {job.seniority && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {job.seniority}
                                </Badge>
                              )}
                              {job.employment_statuses?.map((s) => (
                                <Badge key={s} variant="outline" className="text-xs font-normal">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Right */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {daysAgo(job.date_posted)}
                            </span>
                            {jobUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(jobUrl, "_blank", "noopener,noreferrer")
                                }}
                              >
                                Apply <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            {job.description && (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-12">
                                  {job.description}
                                </p>
                              </div>
                            )}

                            {job.hiring_team?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" /> Hiring Team
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {job.hiring_team.map((person, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                                      {person.full_name}
                                      {person.role && ` — ${person.role}`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {job.company_domain && (
                              <p className="text-xs text-muted-foreground">
                                <Globe className="h-3 w-3 inline mr-1" />
                                {job.company_domain}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && jobs.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={jobs.length < ITEMS_PER_PAGE}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
