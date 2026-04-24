"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Target,
  AlertTriangle,
  Coins,
  Download,
  Search,
  Building2,
  MapPin,
  Users,
  ExternalLink,
  Globe,
  RefreshCw,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Linkedin } from "@/components/ui/brand-icons"
import type { TheirStackJob, CreditBalance } from "@/lib/theirstack"

// ============================================
// NGO Industry IDs (from TheirStack docs)
// ============================================
const NGO_INDUSTRY_IDS = [
  { id: 70, label: "Non-profit Organization Management" },
  { id: 74, label: "Civic & Social Organization" },
  { id: 81, label: "Philanthropy" },
  { id: 78, label: "Fund-Raising" },
  { id: 101, label: "International Trade & Development" },
  { id: 99, label: "International Affairs" },
  { id: 141, label: "Think Tanks" },
  { id: 84, label: "Political Organization" },
  { id: 139, label: "Government Relations" },
]

// Preset NGO search patterns
const NGO_PATTERNS = [
  "nonprofit",
  "non-profit",
  "NGO",
  "charitable",
  "social impact",
  "humanitarian",
  "development organization",
]

// Common volunteer/impact job titles
const IMPACT_JOB_TITLES = [
  "Volunteer Coordinator",
  "Program Manager",
  "Community Manager",
  "Impact",
  "Sustainability",
  "Social Worker",
  "Partnerships",
  "Fundraising",
  "Development Officer",
  "Outreach",
]

// ============================================
// Fetch helpers (via server proxy)
// ============================================

async function apiCall(action: string, params?: Record<string, unknown>) {
  const res = await fetch("/api/marketing/theirstack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

// ============================================
// Component
// ============================================

interface SearchFilters {
  mode: "jobs" | "companies"
  descriptionPatterns: string[]
  customPattern: string
  industryIds: number[]
  jobTitles: string[]
  customJobTitle: string
  remoteOnly: boolean
  countryCodes: string[]
  customCountry: string
  maxAgeDays: number
  companyType: "direct_employer" | "all"
  minEmployees: string
  maxEmployees: string
  limit: number
}

interface SearchResult {
  data: TheirStackJob[]
  metadata: {
    total_results: number | null
    total_companies: number | null
    truncated_results: number
    truncated_companies: number
  }
}

const DEFAULT_FILTERS: SearchFilters = {
  mode: "jobs",
  descriptionPatterns: [...NGO_PATTERNS],
  customPattern: "",
  industryIds: [70, 74, 81],
  jobTitles: [],
  customJobTitle: "",
  remoteOnly: true,
  countryCodes: [],
  customCountry: "",
  maxAgeDays: 30,
  companyType: "direct_employer",
  minEmployees: "",
  maxEmployees: "",
  limit: 10,
}

export default function ProspectingPage() {
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS })
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Credit balance fetch
  const fetchCredits = useCallback(async () => {
    setCreditsLoading(true)
    try {
      const data = await apiCall("creditBalance")
      setCredits(data)
    } catch (err: unknown) {
      console.error("Failed to fetch credits", err)
    } finally {
      setCreditsLoading(false)
    }
  }, [])

  // Estimated cost
  const estimatedCost =
    filters.mode === "jobs" ? filters.limit : filters.limit * 3

  const remainingCredits = credits
    ? credits.api_credits - credits.used_api_credits
    : null

  const canAfford =
    remainingCredits !== null ? remainingCredits >= estimatedCost : true

  // Build search params
  function buildParams(): Record<string, unknown> {
    const params: Record<string, unknown> = {
      page: 0,
      limit: filters.limit,
      include_total_results: false,
      blur_company_data: false,
    }

    if (filters.descriptionPatterns.length > 0) {
      params.company_description_pattern_or = filters.descriptionPatterns
    }
    if (filters.industryIds.length > 0) {
      params.industry_id_or = filters.industryIds
    }
    if (filters.companyType !== "all") {
      params.company_type = filters.companyType
    }
    if (filters.minEmployees) {
      params.min_employee_count = parseInt(filters.minEmployees)
    }
    if (filters.maxEmployees) {
      params.max_employee_count = parseInt(filters.maxEmployees)
    }
    if (filters.countryCodes.length > 0) {
      params.company_country_code_or = filters.countryCodes
    }

    if (filters.mode === "jobs") {
      if (filters.remoteOnly) params.remote = true
      if (filters.maxAgeDays > 0)
        params.posted_at_max_age_days = filters.maxAgeDays
      if (filters.jobTitles.length > 0)
        params.job_title_or = filters.jobTitles
    } else {
      // Company search with job filters
      if (filters.jobTitles.length > 0 || filters.remoteOnly) {
        const jobFilters: Record<string, unknown> = {}
        if (filters.jobTitles.length > 0) jobFilters.job_title_or = filters.jobTitles
        if (filters.remoteOnly) jobFilters.remote = true
        if (filters.maxAgeDays > 0)
          jobFilters.posted_at_max_age_days = filters.maxAgeDays
        params.job_filters = jobFilters
      }
    }

    return params
  }

  // Execute search
  async function executeSearch() {
    setShowConfirm(false)
    setLoading(true)
    setError(null)
    setExpandedRows(new Set())

    try {
      const action =
        filters.mode === "jobs" ? "searchJobs" : "searchCompanies"
      const data = await apiCall(action, buildParams())
      setResults(data)
      // Refresh credit balance after search
      fetchCredits()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // CSV export
  function exportCSV() {
    if (!results?.data?.length) return

    const rows = results.data.map((job: TheirStackJob) => ({
      company: job.company || "",
      job_title: job.job_title || "",
      location: job.location || "",
      remote: job.remote ? "Yes" : "No",
      salary: job.salary_string || "",
      url: job.final_url || job.url || "",
      posted: job.date_posted || "",
      company_domain: job.company_domain || "",
      hiring_contact: (job.hiring_team || [])
        .map((h) => `${h.full_name}${h.role ? ` (${h.role})` : ""}`)
        .join("; "),
      hiring_linkedin: (job.hiring_team || [])
        .map((h) => h.linkedin_url || "")
        .filter(Boolean)
        .join("; "),
    }))

    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = String(r[h as keyof typeof r]).replace(/"/g, '""')
            return `"${val}"`
          })
          .join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ngo-prospecting-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Toggle tag helper
  function toggleTag<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
  }

  function addCustomPattern() {
    const v = filters.customPattern.trim()
    if (v && !filters.descriptionPatterns.includes(v)) {
      setFilters((f) => ({
        ...f,
        descriptionPatterns: [...f.descriptionPatterns, v],
        customPattern: "",
      }))
    }
  }

  function addCustomJobTitle() {
    const v = filters.customJobTitle.trim()
    if (v && !filters.jobTitles.includes(v)) {
      setFilters((f) => ({
        ...f,
        jobTitles: [...f.jobTitles, v],
        customJobTitle: "",
      }))
    }
  }

  function addCustomCountry() {
    const v = filters.customCountry.trim().toUpperCase()
    if (v && v.length === 2 && !filters.countryCodes.includes(v)) {
      setFilters((f) => ({
        ...f,
        countryCodes: [...f.countryCodes, v],
        customCountry: "",
      }))
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header + Credits */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="size-6 text-orange-600" />
              NGO Prospecting Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Find NGOs with open positions to partner with JustBeCause
            </p>
          </div>

          <Card className="w-fit">
            <CardContent className="p-3 flex items-center gap-3">
              <Coins className="size-4 text-amber-500" />
              {credits ? (
                <div className="text-sm">
                  <span className="font-semibold">
                    {credits.api_credits - credits.used_api_credits}
                  </span>{" "}
                  / {credits.api_credits} API credits
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Credits unknown
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCredits}
                disabled={creditsLoading}
              >
                {creditsLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Search Filters</CardTitle>
            <CardDescription>
              Configure your prospecting query. Review the credit cost before executing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search mode */}
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Search Mode</Label>
              <Select
                value={filters.mode}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, mode: v as "jobs" | "companies" }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobs">
                    Job Search (1 credit/result)
                  </SelectItem>
                  <SelectItem value="companies">
                    Company Search (3 credits/result)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Description patterns */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                NGO Description Patterns
              </Label>
              <p className="text-xs text-muted-foreground">
                Company descriptions matching any of these terms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {NGO_PATTERNS.map((p) => (
                  <Badge
                    key={p}
                    variant={
                      filters.descriptionPatterns.includes(p)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer select-none"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        descriptionPatterns: toggleTag(
                          f.descriptionPatterns,
                          p
                        ),
                      }))
                    }
                  >
                    {p}
                  </Badge>
                ))}
                {filters.descriptionPatterns
                  .filter((p) => !NGO_PATTERNS.includes(p))
                  .map((p) => (
                    <Badge key={p} variant="default" className="gap-1">
                      {p}
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            descriptionPatterns: f.descriptionPatterns.filter(
                              (x) => x !== p
                            ),
                          }))
                        }
                      />
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom pattern..."
                  value={filters.customPattern}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, customPattern: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addCustomPattern()}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomPattern}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Industries */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Industries</Label>
              <div className="flex flex-wrap gap-1.5">
                {NGO_INDUSTRY_IDS.map((ind) => (
                  <Badge
                    key={ind.id}
                    variant={
                      filters.industryIds.includes(ind.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer select-none text-xs"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        industryIds: toggleTag(f.industryIds, ind.id),
                      }))
                    }
                  >
                    {ind.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Job title filters */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Job Title Keywords (optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Filter for specific role types
              </p>
              <div className="flex flex-wrap gap-1.5">
                {IMPACT_JOB_TITLES.map((t) => (
                  <Badge
                    key={t}
                    variant={
                      filters.jobTitles.includes(t) ? "default" : "outline"
                    }
                    className="cursor-pointer select-none text-xs"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        jobTitles: toggleTag(f.jobTitles, t),
                      }))
                    }
                  >
                    {t}
                  </Badge>
                ))}
                {filters.jobTitles
                  .filter((t) => !IMPACT_JOB_TITLES.includes(t))
                  .map((t) => (
                    <Badge key={t} variant="default" className="gap-1 text-xs">
                      {t}
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            jobTitles: f.jobTitles.filter((x) => x !== t),
                          }))
                        }
                      />
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom job title..."
                  value={filters.customJobTitle}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      customJobTitle: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addCustomJobTitle()}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomJobTitle}
                >
                  Add
                </Button>
              </div>
            </div>

            <Separator />

            {/* Row of controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Remote toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={filters.remoteOnly}
                  onCheckedChange={(v) =>
                    setFilters((f) => ({ ...f, remoteOnly: v }))
                  }
                />
                <Label className="text-sm">Remote only</Label>
              </div>

              {/* Max age */}
              <div className="space-y-1">
                <Label className="text-xs">Posted within (days)</Label>
                <Select
                  value={String(filters.maxAgeDays)}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, maxAgeDays: parseInt(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company type */}
              <div className="space-y-1">
                <Label className="text-xs">Employer type</Label>
                <Select
                  value={filters.companyType}
                  onValueChange={(v) =>
                    setFilters((f) => ({
                      ...f,
                      companyType: v as "direct_employer" | "all",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_employer">
                      Direct employers only
                    </SelectItem>
                    <SelectItem value="all">All (incl. agencies)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Result limit */}
              <div className="space-y-1">
                <Label className="text-xs">Results limit</Label>
                <Select
                  value={String(filters.limit)}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, limit: parseInt(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 results</SelectItem>
                    <SelectItem value="10">10 results</SelectItem>
                    <SelectItem value="25">25 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee count + Country code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Min employees</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={filters.minEmployees}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      minEmployees: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max employees</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={filters.maxEmployees}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      maxEmployees: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Country codes (2-letter)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. US"
                    value={filters.customCountry}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        customCountry: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addCustomCountry()}
                    maxLength={2}
                    className="w-24"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomCountry}
                  >
                    Add
                  </Button>
                  {filters.countryCodes.map((c) => (
                    <Badge key={c} variant="default" className="gap-1">
                      {c}
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            countryCodes: f.countryCodes.filter(
                              (x) => x !== c
                            ),
                          }))
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Cost preview + Execute */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Coins className="size-4 text-amber-500" />
                  Estimated cost:{" "}
                  <span
                    className={
                      !canAfford
                        ? "text-destructive font-bold"
                        : "text-amber-600 font-bold"
                    }
                  >
                    {estimatedCost} credits
                  </span>
                  <span className="text-muted-foreground font-normal">
                    ({filters.limit} ×{" "}
                    {filters.mode === "jobs" ? "1" : "3"} per{" "}
                    {filters.mode === "jobs" ? "job" : "company"})
                  </span>
                </div>
                {!canAfford && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="size-3" />
                    Insufficient credits! You have {remainingCredits} remaining.
                  </div>
                )}
              </div>

              {!showConfirm ? (
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={!canAfford || loading}
                  className="gap-2"
                >
                  <Search className="size-4" />
                  Preview & Search
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-600 font-medium">
                    Spend {estimatedCost} credits?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={executeSearch}
                    disabled={loading}
                    className="gap-1"
                  >
                    {loading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Coins className="size-3" />
                    )}
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="size-4" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && !loading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Results ({results.data?.length || 0} returned)
                  </CardTitle>
                  {results.metadata?.total_results != null && (
                    <CardDescription>
                      {results.metadata.total_results.toLocaleString()} total
                      matches found
                    </CardDescription>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSV}
                  disabled={!results.data?.length}
                  className="gap-1.5"
                >
                  <Download className="size-3.5" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {results.data?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No results found. Try broadening your search filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Company</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead>Hiring Team</TableHead>
                        <TableHead className="w-16">Links</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(results.data as TheirStackJob[]).map(
                        (job, idx) => {
                          const isExpanded = expandedRows.has(idx)
                          return (
                            <>
                              <TableRow
                                key={job.id || idx}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() =>
                                  setExpandedRows((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(idx)) next.delete(idx)
                                    else next.add(idx)
                                    return next
                                  })
                                }
                              >
                                <TableCell>
                                  {isExpanded ? (
                                    <ChevronUp className="size-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                                    <div>
                                      <div className="font-medium text-sm">
                                        {job.company || "Unknown"}
                                      </div>
                                      {job.company_domain && (
                                        <div className="text-xs text-muted-foreground">
                                          {job.company_domain}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {job.job_title}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="size-3" />
                                    {job.location || "N/A"}
                                    {job.remote && (
                                      <Badge
                                        variant="secondary"
                                        className="ml-1 text-xs"
                                      >
                                        Remote
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {job.salary_string || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {job.date_posted
                                    ? new Date(
                                        job.date_posted
                                      ).toLocaleDateString()
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  {job.hiring_team?.length ? (
                                    <div className="flex items-center gap-1">
                                      <Users className="size-3 text-muted-foreground" />
                                      <span className="text-xs">
                                        {job.hiring_team.length} contact
                                        {job.hiring_team.length > 1
                                          ? "s"
                                          : ""}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div
                                    className="flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {(job.final_url || job.url) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={
                                              job.final_url || job.url || "#"
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded hover:bg-muted"
                                          >
                                            <ExternalLink className="size-3.5" />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          View job posting
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {job.company_domain && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <a
                                            href={`https://${job.company_domain}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded hover:bg-muted"
                                          >
                                            <Globe className="size-3.5" />
                                          </a>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Company website
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {/* Expanded row detail */}
                              {isExpanded && (
                                <TableRow key={`${job.id || idx}-detail`}>
                                  <TableCell
                                    colSpan={8}
                                    className="bg-muted/30 p-4"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      {/* Description */}
                                      {job.description && (
                                        <div className="md:col-span-2">
                                          <Label className="text-xs font-medium text-muted-foreground">
                                            Job Description
                                          </Label>
                                          <p className="mt-1 text-sm line-clamp-4">
                                            {job.description}
                                          </p>
                                        </div>
                                      )}

                                      {/* Hiring team */}
                                      {job.hiring_team?.length ? (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">
                                            Hiring Team
                                          </Label>
                                          <div className="mt-1 space-y-1">
                                            {job.hiring_team.map((h, i) => (
                                              <div
                                                key={i}
                                                className="flex items-center gap-2"
                                              >
                                                <span className="font-medium">
                                                  {h.full_name}
                                                </span>
                                                {h.role && (
                                                  <span className="text-muted-foreground">
                                                    ({h.role})
                                                  </span>
                                                )}
                                                {h.linkedin_url && (
                                                  <a
                                                    href={h.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800"
                                                  >
                                                    <Linkedin className="size-3.5" />
                                                  </a>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}

                                      {/* Meta */}
                                      <div className="space-y-1">
                                        {job.seniority && (
                                          <div>
                                            <span className="text-muted-foreground">
                                              Seniority:{" "}
                                            </span>
                                            {job.seniority}
                                          </div>
                                        )}
                                        {job.employment_statuses?.length ? (
                                          <div>
                                            <span className="text-muted-foreground">
                                              Type:{" "}
                                            </span>
                                            {job.employment_statuses.join(
                                              ", "
                                            )}
                                          </div>
                                        ) : null}
                                        {job.technology_slugs?.length ? (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {job.technology_slugs
                                              .slice(0, 10)
                                              .map((t) => (
                                                <Badge
                                                  key={t}
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {t}
                                                </Badge>
                                              ))}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )
                        }
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
