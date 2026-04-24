"use client"

import { Fragment, useState, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  Star,
  BookmarkPlus,
  BookmarkCheck,
  RotateCcw,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
  Mail,
  Lightbulb,
  ArrowRight,
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

// Volunteer-related job description keywords
const VOLUNTEER_DESC_KEYWORDS = [
  "volunteer",
  "volunteering",
  "volunteer management",
  "volunteer coordination",
  "volunteer program",
  "community outreach",
  "community engagement",
  "social impact",
  "humanitarian",
  "community service",
  "civic engagement",
  "community development",
  "civil society",
]

// Patterns to EXCLUDE — research institutes, labs, government agencies, universities
const EXCLUDE_PATTERNS = [
  "research institute",
  "laboratory",
  "university",
  "college",
  "hospital",
  "government agency",
  "agency for science",
  "defense",
]

const URGENT_HIRING_KEYWORDS = [
  "urgent",
  "urgently hiring",
  "asap",
  "immediate",
  "immediately",
  "hiring now",
  "join immediately",
  "start immediately",
]

// Popular country presets
const COUNTRY_PRESETS = [
  { code: "IN", label: "India" },
  { code: "US", label: "USA" },
  { code: "GB", label: "UK" },
  { code: "KE", label: "Kenya" },
  { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" },
  { code: "DE", label: "Germany" },
  { code: "NL", label: "Netherlands" },
  { code: "CH", label: "Switzerland" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "BD", label: "Bangladesh" },
]

// ============================================
// Quick-Start Presets
// ============================================
interface SearchPreset {
  name: string
  description: string
  icon: React.ReactNode
  filters: Partial<SearchFilters>
}

const SEARCH_PRESETS: SearchPreset[] = [
  {
    name: "🎯 Best Results (Recommended)",
    description: "NGOs posting volunteer-related jobs — proven high-relevance query",
    icon: <Star className="size-4 text-yellow-500" />,
    filters: {
      mode: "jobs",
      descriptionPatterns: [...NGO_PATTERNS],
      industryIds: [],
      jobDescriptionKeywords: [...VOLUNTEER_DESC_KEYWORDS],
      excludePatterns: [...EXCLUDE_PATTERNS],
      countryCodes: [],
      remoteOnly: false,
      maxAgeDays: 30,
      companyType: "direct_employer",
      limit: 15,
      onlyWithContacts: false,
    },
  },
  {
    name: "India NGOs Hiring Now",
    description: "NGOs in India posting volunteer/community roles — last 14 days",
    icon: <Zap className="size-4 text-orange-500" />,
    filters: {
      mode: "jobs",
      descriptionPatterns: [...NGO_PATTERNS],
      industryIds: [],
      jobDescriptionKeywords: [...VOLUNTEER_DESC_KEYWORDS],
      excludePatterns: [...EXCLUDE_PATTERNS],
      countryCodes: ["IN"],
      remoteOnly: false,
      maxAgeDays: 14,
      companyType: "direct_employer",
      limit: 15,
      onlyWithContacts: false,
    },
  },
  {
    name: "NGOs With Contacts",
    description: "Volunteer-related roles at NGOs — only results with hiring contacts",
    icon: <Building2 className="size-4 text-purple-500" />,
    filters: {
      mode: "jobs",
      descriptionPatterns: [...NGO_PATTERNS],
      industryIds: [],
      jobDescriptionKeywords: [...VOLUNTEER_DESC_KEYWORDS],
      excludePatterns: [...EXCLUDE_PATTERNS],
      countryCodes: [],
      remoteOnly: false,
      maxAgeDays: 30,
      companyType: "direct_employer",
      onlyWithContacts: true,
      limit: 15,
    },
  },
  {
    name: "Urgently Hiring NGOs",
    description: "NGOs with urgent hiring language — reach out immediately",
    icon: <AlertTriangle className="size-4 text-red-500" />,
    filters: {
      mode: "jobs",
      descriptionPatterns: [...NGO_PATTERNS],
      industryIds: [],
      jobDescriptionKeywords: [...URGENT_HIRING_KEYWORDS, "volunteer", "volunteering", "community outreach"],
      excludePatterns: [...EXCLUDE_PATTERNS],
      countryCodes: [],
      remoteOnly: false,
      maxAgeDays: 14,
      companyType: "direct_employer",
      onlyWithContacts: true,
      limit: 15,
    },
  },
  {
    name: "Global Remote NGOs",
    description: "Remote volunteer/community roles at NGOs worldwide",
    icon: <Globe className="size-4 text-blue-500" />,
    filters: {
      mode: "jobs",
      descriptionPatterns: [...NGO_PATTERNS],
      industryIds: [],
      jobDescriptionKeywords: [...VOLUNTEER_DESC_KEYWORDS],
      excludePatterns: [...EXCLUDE_PATTERNS],
      countryCodes: [],
      remoteOnly: true,
      maxAgeDays: 30,
      companyType: "direct_employer",
      limit: 15,
      onlyWithContacts: false,
    },
  },
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
    if (res.status === 401) {
      throw new Error("This page requires an admin session. Sign in as an admin to use TheirStack.")
    }
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

// ============================================
// Partnership Score Calculator
// ============================================
function calculatePartnershipScore(job: TheirStackJob): {
  score: number
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  // Penalize research institutes, government agencies, universities
  const companyLower = (job.company || "").toLowerCase()
  const descLower = (job.description || "").toLowerCase()
  const noisePatterns = ["research institute", "laboratory", "university", "college", "hospital", "government agency", "agency for science", "defense"]
  if (noisePatterns.some(p => companyLower.includes(p) || descLower.includes(p))) {
    score -= 20
    reasons.push("⚠ Likely research/government org — low relevance")
  }

  if (job.hiring_team?.length) {
    score += 30
    reasons.push(`${job.hiring_team.length} hiring contact${job.hiring_team.length > 1 ? "s" : ""} available`)
  }

  const linkedinContacts = (job.hiring_team || []).filter(h => h.linkedin_url)
  if (linkedinContacts.length > 0) {
    score += 20
    reasons.push(`${linkedinContacts.length} LinkedIn profile${linkedinContacts.length > 1 ? "s" : ""} found`)
  }

  if (job.company_domain) {
    score += 10
    reasons.push("Has company website")
  }

  if (job.date_posted) {
    const daysAgo = Math.floor((Date.now() - new Date(job.date_posted).getTime()) / 86400000)
    if (daysAgo <= 7) {
      score += 15
      reasons.push("Posted in last 7 days — actively hiring")
    } else if (daysAgo <= 14) {
      score += 10
      reasons.push("Posted in last 2 weeks")
    } else {
      score += 5
      reasons.push(`Posted ${daysAgo} days ago`)
    }
  }

  const title = (job.job_title || "").toLowerCase()
  const volunteerKeywords = ["volunteer", "community", "outreach", "partnership", "impact", "engagement", "mentor", "tutor", "ambassador"]
  if (volunteerKeywords.some(kw => title.includes(kw))) {
    score += 15
    reasons.push("Volunteer/community role — directly relevant")
  }

  if (job.remote) {
    score += 5
    reasons.push("Remote-friendly")
  }

  if (job.description && job.description.length > 100) {
    score += 5
    reasons.push("Detailed job description")
  }

  return { score: Math.min(score, 100), reasons }
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600"
  if (score >= 40) return "text-amber-600"
  return "text-red-500"
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "High"
  if (score >= 40) return "Medium"
  return "Low"
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
  if (score >= 40) return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
  return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
}

function getHiringSignal(job: TheirStackJob): {
  label: "Urgent" | "Active" | "Warm" | "Cold"
  className: string
  reasons: string[]
} {
  const reasons: string[] = []
  let score = 0

  const haystack = `${job.job_title || ""} ${job.description || ""}`.toLowerCase()
  const matchedUrgentKeywords = URGENT_HIRING_KEYWORDS.filter((keyword) => haystack.includes(keyword))
  if (matchedUrgentKeywords.length > 0) {
    score += 4
    reasons.push(`Urgent wording found: ${matchedUrgentKeywords.slice(0, 3).join(", ")}`)
  }

  if (job.date_posted) {
    const daysAgo = Math.floor((Date.now() - new Date(job.date_posted).getTime()) / 86400000)
    if (daysAgo <= 7) {
      score += 3
      reasons.push("Posted in the last 7 days")
    } else if (daysAgo <= 14) {
      score += 2
      reasons.push("Posted in the last 14 days")
    } else if (daysAgo <= 30) {
      score += 1
      reasons.push("Posted in the last 30 days")
    }
  }

  if (job.hiring_team?.length) {
    score += 2
    reasons.push("Hiring-team contacts available")
  }

  if (job.remote) {
    reasons.push("Remote-friendly")
  }

  if (score >= 6) {
    return {
      label: "Urgent",
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
      reasons,
    }
  }

  if (score >= 4) {
    return {
      label: "Active",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
      reasons,
    }
  }

  if (score >= 2) {
    return {
      label: "Warm",
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
      reasons,
    }
  }

  return {
    label: "Cold",
    className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-300 dark:border-slate-800",
    reasons: reasons.length ? reasons : ["Older post or weak urgency signals"],
  }
}

// ============================================
// Component
// ============================================

interface SearchFilters {
  mode: "jobs" | "companies"
  descriptionPatterns: string[]
  customPattern: string
  jobDescriptionKeywords: string[]
  customDescKeyword: string
  excludePatterns: string[]
  industryIds: number[]
  jobTitles: string[]
  customJobTitle: string
  remoteOnly: boolean
  onlyWithContacts: boolean
  previewMode: boolean
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
  jobDescriptionKeywords: [...VOLUNTEER_DESC_KEYWORDS],
  customDescKeyword: "",
  excludePatterns: [...EXCLUDE_PATTERNS],
  industryIds: [],
  jobTitles: [],
  customJobTitle: "",
  remoteOnly: false,
  onlyWithContacts: false,
  previewMode: false,
  countryCodes: [],
  customCountry: "",
  maxAgeDays: 30,
  companyType: "direct_employer",
  minEmployees: "",
  maxEmployees: "",
  limit: 15,
}

export default function ProspectingPage() {
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const [creditsError, setCreditsError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS })
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [savedLeads, setSavedLeads] = useState<Set<number>>(new Set())
  const [showGuide, setShowGuide] = useState(false)

  // Auto-load credits on mount
  const fetchCredits = useCallback(async () => {
    setCreditsLoading(true)
    setCreditsError(null)
    try {
      const data = await apiCall("creditBalance")
      setCredits(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect"
      setCreditsError(msg)
    } finally {
      setCreditsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  // Load saved leads from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("jbc-prospecting-leads")
      if (saved) setSavedLeads(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [])

  function toggleSavedLead(jobId: number) {
    setSavedLeads(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      localStorage.setItem("jbc-prospecting-leads", JSON.stringify([...next]))
      return next
    })
  }

  const estimatedCost = filters.previewMode ? 0 : (filters.mode === "jobs" ? filters.limit : filters.limit * 3)
  const remainingCredits = credits ? credits.api_credits - credits.used_api_credits : null
  const canAfford = filters.previewMode || (remainingCredits !== null ? remainingCredits >= estimatedCost : true)

  // Results stats
  const resultStats = useMemo(() => {
    if (!results?.data?.length) return null
    const jobs = results.data
    const withContacts = jobs.filter(j => j.hiring_team?.length).length
    const withLinkedin = jobs.filter(j => j.hiring_team?.some(h => h.linkedin_url)).length
    const remoteJobs = jobs.filter(j => j.remote).length
    const avgScore = Math.round(jobs.reduce((sum, j) => sum + calculatePartnershipScore(j).score, 0) / jobs.length)
    const highScoreCount = jobs.filter(j => calculatePartnershipScore(j).score >= 70).length
    const urgentCount = jobs.filter(j => getHiringSignal(j).label === "Urgent").length
    const activeCount = jobs.filter(j => {
      const label = getHiringSignal(j).label
      return label === "Urgent" || label === "Active"
    }).length
    return { total: jobs.length, withContacts, withLinkedin, remoteJobs, avgScore, highScoreCount, urgentCount, activeCount }
  }, [results])

  function buildParams(): Record<string, unknown> {
    const params: Record<string, unknown> = {
      page: 0,
      limit: filters.limit,
      include_total_results: true,
      blur_company_data: filters.previewMode,
    }
    if (filters.descriptionPatterns.length > 0) params.company_description_pattern_or = filters.descriptionPatterns
    if (filters.excludePatterns.length > 0) params.company_description_pattern_not = filters.excludePatterns
    if (filters.industryIds.length > 0) params.industry_id_or = filters.industryIds
    if (filters.companyType !== "all") params.company_type = filters.companyType
    if (filters.minEmployees) params.min_employee_count = parseInt(filters.minEmployees)
    if (filters.maxEmployees) params.max_employee_count = parseInt(filters.maxEmployees)
    // Use both company HQ country AND job location country for better results
    if (filters.countryCodes.length > 0) {
      params.company_country_code_or = filters.countryCodes
      if (filters.mode === "jobs") params.job_country_code_or = filters.countryCodes
    }
    // Only return results with hiring contacts
    if (filters.onlyWithContacts) params.property_exists_or = ["hiring_team"]

    if (filters.mode === "jobs") {
      if (filters.remoteOnly) params.remote = true
      if (filters.maxAgeDays > 0) params.posted_at_max_age_days = filters.maxAgeDays
      if (filters.jobTitles.length > 0) params.job_title_or = filters.jobTitles
      // Search within job descriptions for volunteer-related keywords
      if (filters.jobDescriptionKeywords.length > 0) params.job_description_contains_or = filters.jobDescriptionKeywords
    } else {
      if (filters.jobTitles.length > 0 || filters.remoteOnly) {
        const jobFilters: Record<string, unknown> = {}
        if (filters.jobTitles.length > 0) jobFilters.job_title_or = filters.jobTitles
        if (filters.remoteOnly) jobFilters.remote = true
        if (filters.maxAgeDays > 0) jobFilters.posted_at_max_age_days = filters.maxAgeDays
        params.job_filters = jobFilters
      }
    }
    return params
  }

  async function executeSearch() {
    setShowConfirm(false)
    setLoading(true)
    setError(null)
    setExpandedRows(new Set())
    try {
      const action = filters.mode === "jobs" ? "searchJobs" : "searchCompanies"
      const data = await apiCall(action, buildParams())
      setResults(data)
      fetchCredits()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(preset: SearchPreset) {
    setFilters(f => ({ ...f, ...preset.filters, customPattern: "", customJobTitle: "", customCountry: "", customDescKeyword: "" }))
    setResults(null)
    setError(null)
  }

  function resetFilters() {
    setFilters({ ...DEFAULT_FILTERS })
    setResults(null)
    setError(null)
  }

  function exportCSV() {
    if (!results?.data?.length) return
    const rows = results.data.map((job: TheirStackJob) => {
      const { score } = calculatePartnershipScore(job)
      return {
        partnership_score: score,
        company: job.company || "",
        job_title: job.job_title || "",
        location: job.location || "",
        remote: job.remote ? "Yes" : "No",
        salary: job.salary_string || "",
        url: job.final_url || job.url || "",
        posted: job.date_posted || "",
        company_website: job.company_domain ? `https://${job.company_domain}` : "",
        hiring_signal: getHiringSignal(job).label,
        hiring_contact: (job.hiring_team || []).map((h) => `${h.full_name}${h.role ? ` (${h.role})` : ""}`).join("; "),
        hiring_linkedin: (job.hiring_team || []).map((h) => h.linkedin_url || "").filter(Boolean).join("; "),
        saved: savedLeads.has(job.id) ? "Yes" : "",
      }
    })
    rows.sort((a, b) => b.partnership_score - a.partnership_score)
    const csvHeaders = Object.keys(rows[0])
    const csv = [
      csvHeaders.join(","),
      ...rows.map((r) => csvHeaders.map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(","))
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ngo-prospecting-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleTag<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
  }

  function addCustomPattern() {
    const v = filters.customPattern.trim()
    if (v && !filters.descriptionPatterns.includes(v)) {
      setFilters((f) => ({ ...f, descriptionPatterns: [...f.descriptionPatterns, v], customPattern: "" }))
    }
  }

  function addCustomJobTitle() {
    const v = filters.customJobTitle.trim()
    if (v && !filters.jobTitles.includes(v)) {
      setFilters((f) => ({ ...f, jobTitles: [...f.jobTitles, v], customJobTitle: "" }))
    }
  }

  function addCustomCountry() {
    const v = filters.customCountry.trim().toUpperCase()
    if (v && v.length === 2 && !filters.countryCodes.includes(v)) {
      setFilters((f) => ({ ...f, countryCodes: [...f.countryCodes, v], customCountry: "" }))
    }
  }

  const isApiKeyMissing = creditsError?.includes("THEIRSTACK_API_KEY not set")

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* HEADER + CREDITS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="size-6 text-orange-600" />
              NGO Prospecting Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Find NGOs actively hiring → reach out to partner with JustBeCause
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowGuide(!showGuide)} className="gap-1.5">
              <Lightbulb className="size-3.5" />
              {showGuide ? "Hide Guide" : "How to Use"}
            </Button>
            <Card className="w-fit">
              <CardContent className="p-3 flex items-center gap-3">
                <Coins className="size-4 text-amber-500" />
                {creditsLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : credits ? (
                  <div className="text-sm">
                    <span className="font-semibold">{credits.api_credits - credits.used_api_credits}</span> / {credits.api_credits} credits
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{creditsError ? "Connection failed" : "Loading..."}</span>
                )}
                <Button variant="ghost" size="sm" onClick={fetchCredits} disabled={creditsLoading}>
                  {creditsLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* API KEY NOT SET */}
        {isApiKeyMissing && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="size-5" />
                TheirStack API Key Required
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Add your API key to start searching for NGOs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0">1</Badge>
                  <span>Go to <strong>theirstack.com</strong> → Sign up (free = 200 API credits)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0">2</Badge>
                  <span>Go to <strong>Settings → API</strong> → Copy your API key</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0">3</Badge>
                  <span>Open <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-xs">.env.local</code> and set: <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 font-mono text-xs">THEIRSTACK_API_KEY=your_key_here</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0">4</Badge>
                  <span>Restart dev server → Refresh this page</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                For Vercel: Add THEIRSTACK_API_KEY in Project Settings → Environment Variables
              </p>
            </CardContent>
          </Card>
        )}

        {/* HOW TO USE GUIDE */}
        {showGuide && (
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="size-4 text-blue-600" />
                How This Works — Step by Step
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 p-3 rounded-lg bg-white dark:bg-background border">
                  <div className="font-medium flex items-center gap-1.5">
                    <Badge className="bg-blue-600">1</Badge> Search
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Pick a <strong>Quick Start preset</strong> or customize filters. Click &quot;Search NGOs&quot; → confirm credit spend → results appear.
                  </p>
                </div>
                <div className="space-y-1.5 p-3 rounded-lg bg-white dark:bg-background border">
                  <div className="font-medium flex items-center gap-1.5">
                    <Badge className="bg-blue-600">2</Badge> Evaluate
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Each result has a <strong>Partnership Score</strong> (0-100). Focus on <span className="text-emerald-600 font-medium">High (70+)</span> — they have contacts, LinkedIn, recent posts.
                  </p>
                </div>
                <div className="space-y-1.5 p-3 rounded-lg bg-white dark:bg-background border">
                  <div className="font-medium flex items-center gap-1.5">
                    <Badge className="bg-blue-600">3</Badge> Act
                  </div>
                  <p className="text-muted-foreground text-xs">
                    <strong>Bookmark</strong> leads → <strong>Export CSV</strong> (sorted by score) → reach out via LinkedIn using hiring team contacts.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-background border">
                <p className="font-medium text-xs mb-2">What to Do With Results:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-1.5">
                    <ArrowRight className="size-3 mt-0.5 text-blue-500 shrink-0" />
                    <span><strong>Hiring Volunteer Coordinator?</strong> → They need volunteers → pitch JustBeCause</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <ArrowRight className="size-3 mt-0.5 text-blue-500 shrink-0" />
                    <span><strong>50+ employees?</strong> → Established org → higher partnership value</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <ArrowRight className="size-3 mt-0.5 text-blue-500 shrink-0" />
                    <span><strong>LinkedIn available?</strong> → Send connection request mentioning their open role</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <ArrowRight className="size-3 mt-0.5 text-blue-500 shrink-0" />
                    <span><strong>Posted in last 7 days?</strong> → Urgently hiring → reach out fast</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QUICK START PRESETS */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quick Start — Pick a preset or customize below</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SEARCH_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="group text-left p-3 rounded-lg border bg-card hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  {preset.icon}
                  {preset.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH FILTERS */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Search Filters</CardTitle>
                <CardDescription>Configure your query. Review credit cost before searching.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="size-3" /> Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search mode */}
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Search Mode</Label>
              <Select value={filters.mode} onValueChange={(v) => setFilters((f) => ({ ...f, mode: v as "jobs" | "companies" }))}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobs">Job Search (1 credit/result)</SelectItem>
                  <SelectItem value="companies" disabled>Company Search (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Description patterns */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">NGO Description Patterns</Label>
              <p className="text-xs text-muted-foreground">Matches companies whose description includes any of these</p>
              <div className="flex flex-wrap gap-1.5">
                {NGO_PATTERNS.map((p) => (
                  <Badge key={p} variant={filters.descriptionPatterns.includes(p) ? "default" : "outline"} className="cursor-pointer select-none"
                    onClick={() => setFilters((f) => ({ ...f, descriptionPatterns: toggleTag(f.descriptionPatterns, p) }))}>
                    {p}
                  </Badge>
                ))}
                {filters.descriptionPatterns.filter((p) => !NGO_PATTERNS.includes(p)).map((p) => (
                  <Badge key={p} variant="default" className="gap-1">
                    {p}
                    <X className="size-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, descriptionPatterns: f.descriptionPatterns.filter((x) => x !== p) }))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add custom pattern..." value={filters.customPattern}
                  onChange={(e) => setFilters((f) => ({ ...f, customPattern: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addCustomPattern()} className="max-w-xs" />
                <Button variant="outline" size="sm" onClick={addCustomPattern}>Add</Button>
              </div>
            </div>

            {/* Industries */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Industries</Label>
              <div className="flex flex-wrap gap-1.5">
                {NGO_INDUSTRY_IDS.map((ind) => (
                  <Badge key={ind.id} variant={filters.industryIds.includes(ind.id) ? "default" : "outline"}
                    className="cursor-pointer select-none text-xs"
                    onClick={() => setFilters((f) => ({ ...f, industryIds: toggleTag(f.industryIds, ind.id) }))}>
                    {ind.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Job Description Keywords — NEW: most powerful filter per docs */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Job Description Keywords
                <Tooltip>
                  <TooltipTrigger><Info className="size-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs">Search inside job descriptions for volunteer-related words. This finds 3-5x more results than company description alone.</TooltipContent>
                </Tooltip>
              </Label>
              <p className="text-xs text-muted-foreground">Matches jobs whose description mentions any of these words (word-boundary match)</p>
              <div className="flex flex-wrap gap-1.5">
                {VOLUNTEER_DESC_KEYWORDS.map((kw) => (
                  <Badge key={kw} variant={filters.jobDescriptionKeywords.includes(kw) ? "default" : "outline"} className="cursor-pointer select-none text-xs"
                    onClick={() => setFilters((f) => ({ ...f, jobDescriptionKeywords: toggleTag(f.jobDescriptionKeywords, kw) }))}>
                    {kw}
                  </Badge>
                ))}
                {filters.jobDescriptionKeywords.filter((kw) => !VOLUNTEER_DESC_KEYWORDS.includes(kw)).map((kw) => (
                  <Badge key={kw} variant="default" className="gap-1 text-xs">
                    {kw}
                    <X className="size-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, jobDescriptionKeywords: f.jobDescriptionKeywords.filter((x) => x !== kw) }))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add custom keyword..." value={filters.customDescKeyword}
                  onChange={(e) => setFilters((f) => ({ ...f, customDescKeyword: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = filters.customDescKeyword.trim(); if (v && !filters.jobDescriptionKeywords.includes(v)) setFilters(f => ({...f, jobDescriptionKeywords: [...f.jobDescriptionKeywords, v], customDescKeyword: ""})) }}}
                  className="max-w-xs" />
                <Button variant="outline" size="sm" onClick={() => { const v = filters.customDescKeyword.trim(); if (v && !filters.jobDescriptionKeywords.includes(v)) setFilters(f => ({...f, jobDescriptionKeywords: [...f.jobDescriptionKeywords, v], customDescKeyword: ""})) }}>Add</Button>
              </div>
            </div>

            <Separator />

            {/* Quality toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2">
                <Switch checked={filters.onlyWithContacts} onCheckedChange={(v) => setFilters((f) => ({ ...f, onlyWithContacts: v }))} />
                <div>
                  <Label className="text-sm font-medium">Only with hiring team</Label>
                  <p className="text-xs text-muted-foreground">Results must include at least one hiring-team contact</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={filters.previewMode} onCheckedChange={(v) => setFilters((f) => ({ ...f, previewMode: v }))} />
                <div>
                  <Label className="text-sm font-medium">Preview mode (free)</Label>
                  <p className="text-xs text-muted-foreground">See counts without spending credits (data blurred)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={filters.remoteOnly} onCheckedChange={(v) => setFilters((f) => ({ ...f, remoteOnly: v }))} />
                <div>
                  <Label className="text-sm font-medium">Remote only</Label>
                  <p className="text-xs text-muted-foreground">Only show remote-friendly positions</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Country filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Country Filter</Label>
              <p className="text-xs text-muted-foreground">Click to add/remove. Empty = worldwide.</p>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRY_PRESETS.map((c) => (
                  <Badge key={c.code} variant={filters.countryCodes.includes(c.code) ? "default" : "outline"}
                    className="cursor-pointer select-none text-xs"
                    onClick={() => setFilters((f) => ({ ...f, countryCodes: toggleTag(f.countryCodes, c.code) }))}>
                    {c.label} ({c.code})
                  </Badge>
                ))}
                {filters.countryCodes.filter(c => !COUNTRY_PRESETS.some(p => p.code === c)).map((c) => (
                  <Badge key={c} variant="default" className="gap-1 text-xs">
                    {c}
                    <X className="size-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, countryCodes: f.countryCodes.filter((x) => x !== c) }))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Other (e.g. BR)" value={filters.customCountry}
                  onChange={(e) => setFilters((f) => ({ ...f, customCountry: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addCustomCountry()}
                  maxLength={2} className="w-32" />
                <Button variant="outline" size="sm" onClick={addCustomCountry}>Add</Button>
              </div>
            </div>

            <Separator />

            {/* Advanced filters */}
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger className="text-sm font-medium py-0 hover:no-underline">Advanced Filters</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Job Title Keywords (optional)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {IMPACT_JOB_TITLES.map((t) => (
                        <Badge key={t} variant={filters.jobTitles.includes(t) ? "default" : "outline"}
                          className="cursor-pointer select-none text-xs"
                          onClick={() => setFilters((f) => ({ ...f, jobTitles: toggleTag(f.jobTitles, t) }))}>
                          {t}
                        </Badge>
                      ))}
                      {filters.jobTitles.filter((t) => !IMPACT_JOB_TITLES.includes(t)).map((t) => (
                        <Badge key={t} variant="default" className="gap-1 text-xs">
                          {t}
                          <X className="size-3 cursor-pointer" onClick={() => setFilters((f) => ({ ...f, jobTitles: f.jobTitles.filter((x) => x !== t) }))} />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Add custom job title..." value={filters.customJobTitle}
                        onChange={(e) => setFilters((f) => ({ ...f, customJobTitle: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addCustomJobTitle()} className="max-w-xs" />
                      <Button variant="outline" size="sm" onClick={addCustomJobTitle}>Add</Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Posted within (days)</Label>
                      <Select value={String(filters.maxAgeDays)} onValueChange={(v) => setFilters((f) => ({ ...f, maxAgeDays: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Employer type</Label>
                      <Select value={filters.companyType} onValueChange={(v) => setFilters((f) => ({ ...f, companyType: v as "direct_employer" | "all" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct_employer">Direct employers only</SelectItem>
                          <SelectItem value="all">All (incl. agencies)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Results limit</Label>
                      <Select value={String(filters.limit)} onValueChange={(v) => setFilters((f) => ({ ...f, limit: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 results</SelectItem>
                          <SelectItem value="10">10 results</SelectItem>
                          <SelectItem value="25">25 results</SelectItem>
                          <SelectItem value="50">50 results</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Min employees</Label>
                      <Input type="number" placeholder="e.g. 10" value={filters.minEmployees}
                        onChange={(e) => setFilters((f) => ({ ...f, minEmployees: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max employees</Label>
                      <Input type="number" placeholder="e.g. 500" value={filters.maxEmployees}
                        onChange={(e) => setFilters((f) => ({ ...f, maxEmployees: e.target.value }))} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator />

            {/* Cost + Execute */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Coins className="size-4 text-amber-500" />
                  Estimated cost:{" "}
                  <span className={filters.previewMode ? "text-emerald-600 font-bold" : (!canAfford ? "text-destructive font-bold" : "text-amber-600 font-bold")}>
                    {filters.previewMode ? "0 credits (preview)" : `${estimatedCost} credits`}
                  </span>
                  {!filters.previewMode && (
                    <span className="text-muted-foreground font-normal">
                      ({filters.limit} × {filters.mode === "jobs" ? "1" : "3"} per {filters.mode === "jobs" ? "job" : "company"})
                    </span>
                  )}
                </div>
                {filters.previewMode && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Info className="size-3" />
                    Preview mode: company names and details will be blurred. Use to check result count before spending credits.
                  </div>
                )}
                {!canAfford && !filters.previewMode && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="size-3" />
                    Insufficient credits! You have {remainingCredits} remaining.
                  </div>
                )}
              </div>
              {!showConfirm ? (
                <Button onClick={() => setShowConfirm(true)} disabled={!canAfford || loading || isApiKeyMissing} className="gap-2">
                  <Search className="size-4" /> Search NGOs
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-600 font-medium">Spend {estimatedCost} credits?</span>
                  <Button variant="destructive" size="sm" onClick={executeSearch} disabled={loading} className="gap-1">
                    {loading ? <Loader2 className="size-3 animate-spin" /> : <Coins className="size-3" />} Confirm
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="size-4" /> {error}
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching TheirStack for NGOs matching your filters...
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        )}

        {/* RESULTS SUMMARY STATS */}
        {results && !loading && (
          <div className="space-y-3">
            {/* Total pool size from API */}
            {results.metadata?.total_results != null && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 flex items-center gap-2">
                <Info className="size-4 text-blue-600 shrink-0" />
                <span className="text-sm">
                  <strong className="text-blue-700 dark:text-blue-300">{results.metadata.total_results.toLocaleString()}</strong> total matching jobs
                  {results.metadata.total_companies != null && (
                    <> from <strong className="text-blue-700 dark:text-blue-300">{results.metadata.total_companies.toLocaleString()}</strong> companies</>
                  )} — showing {results.data?.length || 0} results
                  {results.data?.[0]?.has_blurred_data && <Badge variant="outline" className="ml-2 text-xs">Preview Mode</Badge>}
                </span>
              </div>
            )}
            {resultStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{resultStats.total}</div><p className="text-xs text-muted-foreground">Returned</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-red-600">{resultStats.urgentCount}</div><p className="text-xs text-muted-foreground">Urgent</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{resultStats.activeCount}</div><p className="text-xs text-muted-foreground">Active/Urgent</p></CardContent></Card>
                <Card className={resultStats.highScoreCount > 0 ? "border-emerald-200 dark:border-emerald-800" : ""}>
                  <CardContent className="p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{resultStats.highScoreCount}</div><p className="text-xs text-muted-foreground">High Score (70+)</p></CardContent>
                </Card>
                <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{resultStats.withContacts}</div><p className="text-xs text-muted-foreground">With Hiring Team</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold text-blue-600">{resultStats.withLinkedin}</div><p className="text-xs text-muted-foreground">With LinkedIn</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{resultStats.remoteJobs}</div><p className="text-xs text-muted-foreground">Remote</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><div className="text-2xl font-bold">{resultStats.avgScore}</div><p className="text-xs text-muted-foreground">Avg Score</p></CardContent></Card>
              </div>
            )}
          </div>
        )}

        {/* RESULTS TABLE */}
        {results && !loading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Results ({results.data?.length || 0} returned)</CardTitle>
                  {results.metadata?.total_results != null && (
                    <CardDescription>{results.metadata.total_results.toLocaleString()} total matches</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {savedLeads.size > 0 && (
                    <Badge variant="secondary" className="gap-1"><BookmarkCheck className="size-3" />{savedLeads.size} saved</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCSV} disabled={!results.data?.length} className="gap-1.5">
                    <Download className="size-3.5" /> Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {results.data?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <XCircle className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                  No results found. Try broadening your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead className="w-20">
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1">Score <Info className="size-3" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs">Partnership Score (0-100): contacts, LinkedIn, recency, relevance, website</TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Hiring Signal</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead>Contacts</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(results.data as TheirStackJob[]).map((job, idx) => {
                        const isExpanded = expandedRows.has(idx)
                        const { score, reasons } = calculatePartnershipScore(job)
                        const hiringSignal = getHiringSignal(job)
                        const isSaved = savedLeads.has(job.id)
                        return (
                          <Fragment key={job.id || idx}>
                            <TableRow className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedRows((prev) => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next })}>
                              <TableCell>{isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}</TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${getScoreBg(score)} ${getScoreColor(score)}`}>
                                      <Star className="size-3" />{score}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <p className="font-medium mb-1">{getScoreLabel(score)} Partnership Potential</p>
                                    <ul className="text-xs space-y-0.5">
                                      {reasons.map((r, i) => (<li key={i} className="flex items-start gap-1"><CheckCircle2 className="size-3 mt-0.5 text-emerald-500 shrink-0" />{r}</li>))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="size-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <div className="font-medium text-sm">{job.company || "Unknown"}</div>
                                    {job.company_domain && <div className="text-xs text-muted-foreground">{job.company_domain}</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{job.job_title}</TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className={hiringSignal.className}>{hiringSignal.label}</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <ul className="text-xs space-y-0.5">
                                      {hiringSignal.reasons.map((reason, reasonIdx) => (
                                        <li key={reasonIdx} className="flex items-start gap-1"><CheckCircle2 className="size-3 mt-0.5 text-emerald-500 shrink-0" />{reason}</li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="size-3" />{job.location || "N/A"}
                                  {job.remote && <Badge variant="secondary" className="ml-1 text-xs">Remote</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {job.date_posted ? new Date(job.date_posted).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell>
                                {job.hiring_team?.length ? (
                                  <div className="flex items-center gap-1">
                                    <Users className="size-3 text-muted-foreground" />
                                    <span className="text-xs font-medium">{job.hiring_team.length}</span>
                                    {job.hiring_team.some(h => h.linkedin_url) && <Linkedin className="size-3 text-blue-600" />}
                                  </div>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button onClick={() => toggleSavedLead(job.id)}
                                        className={`p-1 rounded hover:bg-muted ${isSaved ? "text-amber-500" : "text-muted-foreground"}`}>
                                        {isSaved ? <BookmarkCheck className="size-3.5" /> : <BookmarkPlus className="size-3.5" />}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{isSaved ? "Remove bookmark" : "Bookmark lead"}</TooltipContent>
                                  </Tooltip>
                                  {(job.final_url || job.url) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={job.final_url || job.url || "#"} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted"><ExternalLink className="size-3.5" /></a>
                                      </TooltipTrigger>
                                      <TooltipContent>View job posting</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {job.company_domain && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={`https://${job.company_domain}`} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted"><Globe className="size-3.5" /></a>
                                      </TooltipTrigger>
                                      <TooltipContent>Company website</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={9} className="bg-muted/30 p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    {/* Score Breakdown */}
                                    <div className={`p-3 rounded-lg border ${getScoreBg(score)}`}>
                                      <Label className="text-xs font-medium text-muted-foreground">Partnership Score</Label>
                                      <div className="flex items-center gap-2 mt-1 mb-2">
                                        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
                                        <span className="text-xs text-muted-foreground">/ 100</span>
                                        <Badge variant={score >= 70 ? "default" : "secondary"} className="text-xs">{getScoreLabel(score)}</Badge>
                                      </div>
                                      <Progress value={score} className="h-2 mb-2" />
                                      <ul className="space-y-1">
                                        {reasons.map((r, i) => (
                                          <li key={i} className="flex items-start gap-1.5 text-xs">
                                            <CheckCircle2 className="size-3 mt-0.5 text-emerald-500 shrink-0" />{r}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Hiring team */}
                                    <div>
                                      <Label className="text-xs font-medium text-muted-foreground">Hiring Team</Label>
                                      {job.hiring_team?.length ? (
                                        <div className="mt-1 space-y-2">
                                          {job.hiring_team.map((h, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded bg-background border">
                                              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600">
                                                {h.full_name.charAt(0)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{h.full_name}</div>
                                                {h.role && <div className="text-xs text-muted-foreground truncate">{h.role}</div>}
                                              </div>
                                              {h.linkedin_url && (
                                                <a href={h.linkedin_url} target="_blank" rel="noopener noreferrer"
                                                  className="shrink-0 p-1.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 hover:bg-blue-100">
                                                  <Linkedin className="size-3.5" />
                                                </a>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : <p className="mt-1 text-xs text-muted-foreground">No hiring contacts available</p>}
                                    </div>

                                    {/* Details + Next Step */}
                                    <div className="space-y-3">
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Job Details</Label>
                                        <div className="mt-1 space-y-1 text-xs">
                                          {job.salary_string && <div><span className="text-muted-foreground">Salary: </span>{job.salary_string}</div>}
                                          {job.seniority && <div><span className="text-muted-foreground">Seniority: </span>{job.seniority}</div>}
                                          {job.employment_statuses?.length ? <div><span className="text-muted-foreground">Type: </span>{job.employment_statuses.join(", ")}</div> : null}
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Hiring Signal</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <Badge variant="outline" className={hiringSignal.className}>{hiringSignal.label}</Badge>
                                        </div>
                                        <ul className="mt-2 space-y-1">
                                          {hiringSignal.reasons.map((reason, reasonIdx) => (
                                            <li key={reasonIdx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                              <CheckCircle2 className="size-3 mt-0.5 text-emerald-500 shrink-0" />{reason}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                        <Label className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                          <Mail className="size-3" /> Suggested Next Step
                                        </Label>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                          {job.hiring_team?.some(h => h.linkedin_url)
                                            ? `Connect with ${job.hiring_team.find(h => h.linkedin_url)?.full_name} on LinkedIn. Mention their ${job.job_title} role and how JustBeCause can supply pre-vetted volunteers.`
                                            : job.company_domain
                                            ? `Visit ${job.company_domain} → find contact/partnerships page → introduce JustBeCause as a volunteer pipeline.`
                                            : `Search "${job.company}" on LinkedIn → find HR/Partnerships team → send connection request.`}
                                        </p>
                                      </div>
                                      {job.technology_slugs?.length ? (
                                        <div className="flex flex-wrap gap-1">
                                          {job.technology_slugs.slice(0, 8).map((t) => (
                                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>

                                    {job.description && (
                                      <div className="md:col-span-3">
                                        <Label className="text-xs font-medium text-muted-foreground">Job Description</Label>
                                        <p className="mt-1 text-sm line-clamp-4 text-muted-foreground">{job.description}</p>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })}
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
