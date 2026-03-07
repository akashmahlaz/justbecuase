"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ApplyButton } from "@/app/[lang]/projects/[id]/apply-button"
import LocaleLink from "@/components/locale-link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { skillCategories, resolveSkillName } from "@/lib/skills-data"
import {
  X,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  MapPin,
  Clock,
  Calendar,
  Users,
  Sparkles,
  Target,
  Navigation,
  TrendingUp,
  CheckCircle,
  Zap,
  Bookmark,
  GraduationCap,
  Heart,
} from "lucide-react"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { useDictionary } from "@/components/dictionary-provider"
import { toggleSaveProject } from "@/lib/actions"
import { causes as causesList } from "@/lib/skills-data"
// ============================================
// TYPES
// ============================================

interface Project {
  _id?: { toString: () => string }
  id?: string
  title: string
  description: string
  skillsRequired: { categoryId: string; subskillId: string; priority?: string }[]
  ngoId: string
  status: string
  workMode: string
  location?: string
  timeCommitment: string
  deadline?: Date
  projectType: string
  applicantsCount: number
  createdAt: Date
  ngo?: {
    name: string
    logo?: string
    verified?: boolean
  }
  skills?: string[]
  causes?: string[]
  experienceLevel?: string
}

interface PersonalizedOpportunity {
  projectId: string
  project: Project
  score: number
  distanceKm: number | null
  breakdown: {
    skillMatch: number
    geoDistance: number
    causeAlignment: number
    workModeMatch: number
    freshness: number
    ngoQuality: number
    experienceFit: number
  }
  matchReasons: string[]
}

// ============================================
// CONSTANTS
// ============================================

const TIME_COMMITMENTS = [
  "1-5 hours/week",
  "5-10 hours/week",
  "10-20 hours/week",
  "20+ hours/week",
]

const WORK_MODES = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
]

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
]

const PAGE_SIZE = 12

// ============================================
// MATCH SCORE BADGE
// ============================================

function MatchScoreBadge({ score }: { score: number }) {
  let color: string
  let label: string
  let Icon = Target

  if (score >= 75) {
    color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
    label = "Excellent"
    Icon = Sparkles
  } else if (score >= 55) {
    color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
    label = "Strong"
    Icon = Target
  } else if (score >= 35) {
    color = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
    label = "Good"
    Icon = TrendingUp
  } else {
    color = "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700"
    label = "Fair"
    Icon = Target
  }

  return (
    <Badge className={`${`${color}`} border text-xs px-2 py-0.5 font-medium`}>
      <Icon className="h-3 w-3 mr-1" />
      {Math.round(score)}% {label}
    </Badge>
  )
}
// ============================================
// MATCH BREAKDOWN TOOLTIP
// ============================================

function MatchBreakdown({ breakdown, distanceKm, reasons }: {
  breakdown: PersonalizedOpportunity["breakdown"]
  distanceKm: number | null
  reasons: string[]
}) {
  const signals = [
    { label: "Skills", value: breakdown.skillMatch },
    { label: "Location", value: breakdown.geoDistance },
    { label: "Causes", value: breakdown.causeAlignment },
    { label: "Work Mode", value: breakdown.workModeMatch },
    { label: "Freshness", value: breakdown.freshness },
    { label: "Organization", value: breakdown.ngoQuality },
    { label: "Experience", value: breakdown.experienceFit },
  ]

  return (
    <div className="space-y-3 p-1 min-w-[220px]">
      <p className="text-xs font-semibold text-foreground">Match Breakdown</p>
      <div className="space-y-1.5">
        {signals.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="flex-1 text-muted-foreground">{s.label}</span>
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  s.value >= 70 ? "bg-green-500" : s.value >= 40 ? "bg-blue-500" : s.value >= 20 ? "bg-amber-500" : "bg-gray-400"
                }`}
                style={{ width: `${s.value}%` }}
              />
            </div>
            <span className="w-7 text-right font-medium text-foreground">{Math.round(s.value)}</span>
          </div>
        ))}
      </div>
      {distanceKm !== null && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Navigation className="h-3 w-3" />
          {distanceKm < 1 ? "< 1 km away" : `~${Math.round(distanceKm)} km away`}
        </p>
      )}
      {reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-border">
          {reasons.map((r, i) => (
            <span key={i} className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-full text-muted-foreground">
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
// ============================================
// MAIN COMPONENT
// ============================================

export function OpportunitiesBrowser() {
  const dict = useDictionary()
  const opp = (dict as any).volunteer?.opportunities
  const common = (dict as any).volunteer?.common

  const timeCommitmentLabels: Record<string, string> = {
    "1-5 hours/week": common?.time1to5 || "1-5 hours/week",
    "5-10 hours/week": common?.time5to10 || "5-10 hours/week",
    "10-20 hours/week": common?.time10to20 || "10-20 hours/week",
    "20+ hours/week": common?.time20plus || "20+ hours/week",
  }

  const workModeLabels: Record<string, string> = {
    remote: common?.remote || "Remote",
    onsite: common?.onsite || "On-site",
    hybrid: common?.hybrid || "Hybrid",
  }

  // ---- STATE ----
  const [personalizedData, setPersonalizedData] = useState<PersonalizedOpportunity[]>([])
  const [fallbackProjects, setFallbackProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedTimeCommitment, setSelectedTimeCommitment] = useState<string[]>([])
  const [selectedWorkMode, setSelectedWorkMode] = useState("")
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState("")
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("best-match")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [savedProjects, setSavedProjects] = useState<Set<string>>(new Set())
  const [savingProject, setSavingProject] = useState<string | null>(null)

  // ---- UNIFIED SEARCH ----
  const [unifiedMatchedIds, setUnifiedMatchedIds] = useState<string[] | null>(null)
  const [unifiedRelevanceOrder, setUnifiedRelevanceOrder] = useState<Map<string, number>>(new Map())
  const [isUnifiedSearching, setIsUnifiedSearching] = useState(false)
  const unifiedAbortRef = useRef<AbortController | null>(null)

  // Debounced unified search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 1) {
      setUnifiedMatchedIds(null)
      setUnifiedRelevanceOrder(new Map())
      return
    }

    const timer = setTimeout(async () => {
      unifiedAbortRef.current?.abort()
      const controller = new AbortController()
      unifiedAbortRef.current = controller

      setIsUnifiedSearching(true)
      try {
        const res = await fetch(
          `/api/unified-search?q=${encodeURIComponent(trimmed)}&types=opportunity&limit=50`,
          { signal: controller.signal }
        )
        const data = await res.json()
        if (data.success && !controller.signal.aborted) {
          const opportunityResults = (data.results || []).filter(
            (r: any) => r.type === "opportunity" || r.type === "project"
          )
          const ids = opportunityResults.map((r: any) => r.mongoId || r.id)
          setUnifiedMatchedIds(ids)
          const orderMap = new Map<string, number>()
          ids.forEach((id: string, idx: number) => orderMap.set(id, ids.length - idx))
          setUnifiedRelevanceOrder(orderMap)
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Unified search failed:", err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsUnifiedSearching(false)
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    return () => { unifiedAbortRef.current?.abort() }
  }, [])

  // ---- FETCH PERSONALIZED + FALLBACK ----
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)

      // Try personalized endpoint first
      try {
        const res = await fetch("/api/projects/personalized")
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.opportunities?.length > 0 && !cancelled) {
            setPersonalizedData(data.opportunities)
            setIsPersonalized(true)
            setLoading(false)
            return
          }
        }
      } catch {
        // fall through
      }

      // Fallback
      try {
        const res = await fetch("/api/projects")
        if (res.ok && !cancelled) {
          const data = await res.json()
          setFallbackProjects(data.projects || [])
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])
  // ---- HELPERS ----
  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const toggleTimeCommitment = (time: string) => {
    setSelectedTimeCommitment((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    )
  }

  const toggleCause = (cause: string) => {
    setSelectedCauses((prev) =>
      prev.includes(cause) ? prev.filter((c) => c !== cause) : [...prev, cause]
    )
  }

  const handleSaveProject = async (projectId: string) => {
    setSavingProject(projectId)
    try {
      const result = await toggleSaveProject(projectId)
      if (result.success) {
        setSavedProjects((prev) => {
          const next = new Set(prev)
          if (result.data?.isSaved) {
            next.add(projectId)
          } else {
            next.delete(projectId)
          }
          return next
        })
      }
    } catch {}
    setSavingProject(null)
  }

  const clearFilters = () => {
    setSelectedSkills([])
    setSelectedTimeCommitment([])
    setSelectedWorkMode("")
    setSelectedExperienceLevel("")
    setSelectedCauses([])
    setSearchQuery("")
  }

  const hasActiveFilters =
    selectedSkills.length > 0 || selectedTimeCommitment.length > 0 || selectedWorkMode !== "" || selectedExperienceLevel !== "" || selectedCauses.length > 0

  // ---- UNIFIED DATA SHAPE ----
  const allItems = useMemo(() => {
    if (isPersonalized) {
      return personalizedData.map((p) => ({
        project: p.project,
        score: p.score,
        distanceKm: p.distanceKm,
        breakdown: p.breakdown,
        matchReasons: p.matchReasons,
        projectId: p.projectId,
      }))
    }
    return fallbackProjects
      .filter(p => {
        const st = p.status?.toLowerCase()
        return st === "active" || st === "open"
      })
      .map((p) => ({
        project: p,
        score: 0,
        distanceKm: null as number | null,
        breakdown: null as PersonalizedOpportunity["breakdown"] | null,
        matchReasons: [] as string[],
        projectId: p._id?.toString() || p.id || "",
      }))
  }, [isPersonalized, personalizedData, fallbackProjects])

  // ---- FILTERED + SORTED ----
  const filteredItems = useMemo(() => {
    let result = [...allItems]

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const clientFilter = (item: typeof result[number]) => {
        const p = item.project
        return (
          p.title?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.skillsRequired?.some(
            (s) =>
              s.categoryId?.toLowerCase().includes(query) ||
              s.subskillId?.toLowerCase().includes(query) ||
              resolveSkillName(s.subskillId)?.toLowerCase().includes(query) ||
              resolveSkillName(s.categoryId)?.toLowerCase().includes(query)
          ) ||
          p.ngo?.name?.toLowerCase().includes(query)
        )
      }

      if (unifiedMatchedIds !== null && unifiedMatchedIds.length > 0) {
        const idSet = new Set(unifiedMatchedIds)
        result = result.filter((item) => idSet.has(item.projectId))
      } else {
        result = result.filter(clientFilter)
      }
    }

    // Skills filter
    if (selectedSkills.length > 0) {
      result = result.filter((item) => {
        const cats = item.project.skillsRequired?.map((s) => s.categoryId) || []
        return selectedSkills.some((skill) => {
          const category = skillCategories.find((c) => c.name === skill)
          return cats.includes(category?.id || skill.toLowerCase().replace(/\s+/g, "-"))
        })
      })
    }

    // Time commitment
    if (selectedTimeCommitment.length > 0) {
      result = result.filter((item) => {
        return selectedTimeCommitment.some((time) => {
          const pt = item.project.timeCommitment?.toLowerCase() || ""
          const ft = time.toLowerCase()
          if (ft.includes("1-5") && (pt.includes("1-5") || pt.includes("few hours"))) return true
          if (ft.includes("5-10") && pt.includes("5-10")) return true
          if (ft.includes("10-20") && pt.includes("10-20")) return true
          if (ft.includes("20+") && (pt.includes("20+") || pt.includes("full-time"))) return true
          return pt.includes(ft)
        })
      })
    }

    // Work mode
    if (selectedWorkMode && selectedWorkMode !== "all") {
      result = result.filter((item) =>
        item.project.workMode?.toLowerCase() === selectedWorkMode.toLowerCase()
      )
    }

    // Experience level
    if (selectedExperienceLevel) {
      result = result.filter((item) =>
        item.project.experienceLevel?.toLowerCase() === selectedExperienceLevel.toLowerCase()
      )
    }

    // Causes
    if (selectedCauses.length > 0) {
      result = result.filter((item) => {
        const projectCauses = item.project.causes || []
        return selectedCauses.some((c) => projectCauses.includes(c))
      })
    }

    // Sort
    switch (sortBy) {
      case "best-match":
        if (searchQuery.trim() && unifiedMatchedIds !== null) {
          result.sort((a, b) => {
            const sA = unifiedRelevanceOrder.get(a.projectId) || 0
            const sB = unifiedRelevanceOrder.get(b.projectId) || 0
            return (sB * 0.6 + b.score * 0.4) - (sA * 0.6 + a.score * 0.4)
          })
        } else {
          result.sort((a, b) => b.score - a.score)
        }
        break
      case "nearest":
        result.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999))
        break
      case "newest":
        result.sort((a, b) =>
          new Date(b.project.createdAt).getTime() - new Date(a.project.createdAt).getTime()
        )
        break
      case "closing":
        result.sort((a, b) => {
          if (!a.project.deadline) return 1
          if (!b.project.deadline) return -1
          return new Date(a.project.deadline).getTime() - new Date(b.project.deadline).getTime()
        })
        break
      case "popular":
        result.sort((a, b) => (b.project.applicantsCount || 0) - (a.project.applicantsCount || 0))
        break
    }

    return result
  }, [allItems, searchQuery, selectedSkills, selectedTimeCommitment, selectedWorkMode, selectedExperienceLevel, selectedCauses, sortBy, unifiedMatchedIds, unifiedRelevanceOrder])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, selectedSkills, selectedTimeCommitment, selectedWorkMode, selectedExperienceLevel, selectedCauses, sortBy])

  const visibleItems = filteredItems.slice(0, visibleCount)
  const hasMore = visibleCount < filteredItems.length
  const totalCount = isPersonalized ? personalizedData.length : fallbackProjects.length
  // ============================================
  // RENDER
  // ============================================

  return (
    <TooltipProvider delayDuration={300}>
      <div>
        {/* Personalization indicator */}
        {isPersonalized && !searchQuery && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 border border-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Personalized for you</span>
              {" — "}ranked by skill match, location proximity, and cause alignment
            </p>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <UnifiedSearchBar
              defaultType="opportunity"
              allowedTypes={["opportunity"]}
              variant="default"
              placeholder={opp?.searchPlaceholder || "Search by title, skills, cause, or organization..."}
              value={searchQuery}
              onSearchChange={setSearchQuery}
              navigateOnSelect={false}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={opp?.sortBy || "Sort by"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best-match">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Best Match
                  </span>
                </SelectItem>
                {isPersonalized && (
                  <SelectItem value="nearest">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5" /> Nearest First
                    </span>
                  </SelectItem>
                )}
                <SelectItem value="newest">{opp?.sortNewest || "Newest First"}</SelectItem>
                <SelectItem value="closing">{opp?.sortClosing || "Closing Soon"}</SelectItem>
                <SelectItem value="popular">{opp?.sortPopular || "Most Popular"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Skills */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                {common?.skills || "Skills"}
                {selectedSkills.length > 0 && (
                  <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                    {selectedSkills.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {skillCategories.map((category) => (
                  <div key={category.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`opp-skill-${category.name}`}
                      checked={selectedSkills.includes(category.name)}
                      onCheckedChange={() => toggleSkill(category.name)}
                    />
                    <Label htmlFor={`opp-skill-${category.name}`} className="text-sm font-normal cursor-pointer">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Time Commitment */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                {opp?.filterTime || "Time"}
                {selectedTimeCommitment.length > 0 && (
                  <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                    {selectedTimeCommitment.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3" align="start">
              <div className="space-y-2">
                {TIME_COMMITMENTS.map((time) => (
                  <div key={time} className="flex items-center space-x-2">
                    <Checkbox
                      id={`opp-time-${time}`}
                      checked={selectedTimeCommitment.includes(time)}
                      onCheckedChange={() => toggleTimeCommitment(time)}
                    />
                    <Label htmlFor={`opp-time-${time}`} className="text-sm font-normal cursor-pointer">
                      {timeCommitmentLabels[time] || time}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Work Mode */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                {common?.workMode || "Work Mode"}
                {selectedWorkMode && (
                  <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                    1
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-3" align="start">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="opp-mode-all"
                    checked={selectedWorkMode === ""}
                    onCheckedChange={() => setSelectedWorkMode("")}
                  />
                  <Label htmlFor="opp-mode-all" className="text-sm font-normal cursor-pointer">
                    {common?.any || "Any"}
                  </Label>
                </div>
                {WORK_MODES.map((mode) => (
                  <div key={mode.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`opp-mode-${mode.value}`}
                      checked={selectedWorkMode === mode.value}
                      onCheckedChange={() =>
                        setSelectedWorkMode((prev) => (prev === mode.value ? "" : mode.value))
                      }
                    />
                    <Label htmlFor={`opp-mode-${mode.value}`} className="text-sm font-normal cursor-pointer">
                      {workModeLabels[mode.value] || mode.label}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear */}
          {(hasActiveFilters || searchQuery) && (
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" />
              {common?.clearAll || "Clear all"}
            </Button>
          )}
        </div>

          {/* Experience Level */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
                {common?.experienceLevel || "Experience"}
                {selectedExperienceLevel && (
                  <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                    1
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-3" align="start">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="opp-exp-all"
                    checked={selectedExperienceLevel === ""}
                    onCheckedChange={() => setSelectedExperienceLevel("")}
                  />
                  <Label htmlFor="opp-exp-all" className="text-sm font-normal cursor-pointer">
                    {common?.any || "Any"}
                  </Label>
                </div>
                {EXPERIENCE_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`opp-exp-${level.value}`}
                      checked={selectedExperienceLevel === level.value}
                      onCheckedChange={() =>
                        setSelectedExperienceLevel((prev) => (prev === level.value ? "" : level.value))
                      }
                    />
                    <Label htmlFor={`opp-exp-${level.value}`} className="text-sm font-normal cursor-pointer capitalize">
                      {level.label}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Causes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Heart className="h-3.5 w-3.5 mr-1.5" />
                {common?.causes || "Causes"}
                {selectedCauses.length > 0 && (
                  <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                    {selectedCauses.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {causesList.map((cause) => (
                  <div key={cause.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`opp-cause-${cause.id}`}
                      checked={selectedCauses.includes(cause.id)}
                      onCheckedChange={() => toggleCause(cause.id)}
                    />
                    <Label htmlFor={`opp-cause-${cause.id}`} className="text-sm font-normal cursor-pointer">
                      {cause.name}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {selectedSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="flex items-center gap-1 text-xs">
                {skill}
                <button onClick={() => toggleSkill(skill)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {selectedTimeCommitment.map((time) => (
              <Badge key={time} variant="secondary" className="flex items-center gap-1 text-xs">
                {timeCommitmentLabels[time] || time}
                <button onClick={() => toggleTimeCommitment(time)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {selectedWorkMode && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                {workModeLabels[selectedWorkMode] || selectedWorkMode}
                <button onClick={() => setSelectedWorkMode("")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {selectedExperienceLevel && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs capitalize">
                {selectedExperienceLevel}
                <button onClick={() => setSelectedExperienceLevel("")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {selectedCauses.map((causeId) => {
              const causeName = causesList.find((c) => c.id === causeId)?.name || causeId
              return (
                <Badge key={causeId} variant="secondary" className="flex items-center gap-1 text-xs">
                  {causeName}
                  <button onClick={() => toggleCause(causeId)}><X className="h-3 w-3" /></button>
                </Badge>
              )
            })}
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {opp?.showingOf || "Showing"}{" "}
            <span className="font-medium text-foreground">{Math.min(visibleCount, filteredItems.length)}</span>{" "}
            {opp?.of || "of"}{" "}
            {filteredItems.length} {opp?.opportunitiesLabel || "opportunities"}
            {isUnifiedSearching && <Loader2 className="inline h-3.5 w-3.5 animate-spin ml-2" />}
          </p>
        </div>
        {/* Projects Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                    <div className="flex gap-1">
                      <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <div className="h-8 flex-1 bg-muted animate-pulse rounded" />
                      <div className="h-8 flex-1 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">{opp?.noResults || "No opportunities found"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters || searchQuery
                ? (opp?.noResultsFilterHint || "Try adjusting your filters or search terms")
                : (opp?.noResultsHint || "Check back later for new opportunities")}
            </p>
            {(hasActiveFilters || searchQuery) && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                {opp?.clearFilters || "Clear Filters"}
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map((item) => {
              const project = item.project
              const projectId = item.projectId
              const isSaved = savedProjects.has(projectId)

              return (
                <Card key={projectId} className="hover:shadow-lg transition-all duration-200 group relative">
                  {/* Save/Bookmark button */}
                  <button
                    onClick={() => handleSaveProject(projectId)}
                    disabled={savingProject === projectId}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur hover:bg-background border border-border/50 transition-colors"
                    aria-label={isSaved ? "Unsave" : "Save"}
                  >
                    <Bookmark className={`h-4 w-4 transition-colors ${isSaved ? "fill-primary text-primary" : "text-muted-foreground hover:text-foreground"}`} />
                  </button>

                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3 pr-8">
                      <Badge variant="outline" className="text-xs capitalize">
                        {project.projectType}
                      </Badge>
                      {item.score > 0 && item.breakdown && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <MatchScoreBadge score={item.score} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="end" className="p-2">
                            <MatchBreakdown
                              breakdown={item.breakdown}
                              distanceKm={item.distanceKm}
                              reasons={item.matchReasons}
                            />
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* NGO */}
                    {project.ngo && (
                      <div className="flex items-center gap-1.5 mb-2">
                        {project.ngo.logo ? (
                          <img src={project.ngo.logo} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                            {project.ngo.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {project.ngo.name}
                        </span>
                        {project.ngo.verified && (
                          <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                    )}
                    {/* Title & description */}
                    <h3 className="font-semibold text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>

                    {/* Match reasons */}
                    {item.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.matchReasons.slice(0, 3).map((reason, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                            <Zap className="h-2.5 w-2.5" />
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {project.workMode === "remote"
                            ? (common?.remote || "Remote")
                            : project.location || (common?.onsite || "On-site")}
                          {item.distanceKm !== null && item.distanceKm < 500 && (
                            <span className="text-xs ml-1 text-primary/70">
                              (~{Math.round(item.distanceKm)} km)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        {project.timeCommitment}
                      </div>
                      {project.deadline && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          {common?.deadline || "Deadline:"}{" "}
                          {new Date(project.deadline).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        {project.applicantsCount || 0} {common?.applicants || "applicants"}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(project.skills || project.skillsRequired?.map((s) => s.subskillId) || [])
                        .slice(0, 3)
                        .map((skill: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {resolveSkillName(skill)}
                          </Badge>
                        ))}
                      {(project.skillsRequired?.length || 0) > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(project.skillsRequired?.length || 0) - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <LocaleLink href={`/projects/${projectId}`}>
                          {common?.viewDetails || "View Details"}
                        </LocaleLink>
                      </Button>
                      <div className="flex-1">
                        <ApplyButton
                          projectId={projectId}
                          projectTitle={project.title}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Load More ({filteredItems.length - visibleCount} remaining)
              </Button>
            </div>
          )}
          </>
        )}
      </div>
    </TooltipProvider>
  )
}