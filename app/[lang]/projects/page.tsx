"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NumberTicker } from "@/components/ui/number-ticker"
import { BlurFade } from "@/components/ui/blur-fade"
import { TextAnimate } from "@/components/ui/text-animate"
import { ScrollProgress } from "@/components/ui/scroll-progress"
import { skillCategories, resolveSkillName } from "@/lib/skills-data"
import { Skeleton } from "@/components/ui/skeleton"
import { SlidersHorizontal, Grid3X3, List, X, Loader2, Search, Sparkles, TrendingUp, Info, Briefcase, ChevronDown, MapPin, Clock, Zap, Award } from "lucide-react"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { useDictionary } from "@/components/dictionary-provider"
import { useLocale } from "@/hooks/use-locale"

interface Project {
  _id?: { toString: () => string }
  id?: string
  title: string
  description: string
  skillsRequired: { categoryId: string; subskillId: string }[]
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
  externalUrl?: string
  _source?: "native" | "external"
  _platform?: string
  // Dynamic fields from scraped data
  salary?: string
  duration?: string
  experienceLevel?: string
  compensationType?: string
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  )
}

const PROJECTS_PER_PAGE = 100

function ProjectsContent() {
  const searchParams = useSearchParams()
  const dict = useDictionary()
  const locale = useLocale()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedTimeCommitment, setSelectedTimeCommitment] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [selectedCompensation, setSelectedCompensation] = useState<string[]>([])
  const [selectedExperience, setSelectedExperience] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("bestMatch")
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [serverTotalPages, setServerTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  // Map of projectId → { score, matchReasons }
  const [matchScores, setMatchScores] = useState<Map<string, { score: number; matchReasons: string[] }>>(new Map())

  // ==========================================
  // UNIFIED SEARCH API — drives project filtering
  // When user types, calls the powerful unified search API
  // (synonyms, multi-strategy, fuzzy, 30+ fields)
  // and uses returned IDs to filter the local project list.
  // ==========================================
  const [unifiedMatchedIds, setUnifiedMatchedIds] = useState<string[] | null>(null)
  const [unifiedRelevanceOrder, setUnifiedRelevanceOrder] = useState<Map<string, number>>(new Map())
  const [isUnifiedSearching, setIsUnifiedSearching] = useState(false)
  const unifiedAbortRef = useRef<AbortController | null>(null)

  // Debounced unified search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
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
          `/api/unified-search?q=${encodeURIComponent(trimmed)}&types=opportunity&limit=100`,
          { signal: controller.signal }
        )
        const data = await res.json()
        if (data.success && !controller.signal.aborted) {
          // Use mongoId for reliable cross-referencing with local project list
          // Strip 'ext-' prefix for external opportunities to match raw _id format in projects list
          const ids = (data.results || []).map((r: any) => {
            const id = r.mongoId || r.id
            return id?.startsWith('ext-') ? id.slice(4) : id
          })
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

  // Read initial search query from URL
  useEffect(() => {
    const q = searchParams.get("q")
    if (q) {
      setSearchQuery(q)
    }
  }, [searchParams])

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        // Try personalized endpoint first (works for logged-in volunteers)
        let personalized = false
        try {
          const pRes = await fetch("/api/projects/personalized")
          if (pRes.ok) {
            const pData = await pRes.json()
            if (pData.success && pData.opportunities?.length > 0) {
              const scoreMap = new Map<string, { score: number; matchReasons: string[] }>()
              const projectList = pData.opportunities.map((opp: any) => {
                const p = opp.project
                const pid = p._id?.toString?.() || p.id || opp.projectId
                scoreMap.set(pid, { score: opp.score, matchReasons: opp.matchReasons || [] })
                return { ...p, _id: p._id || { toString: () => pid }, id: pid, _source: "native" as const }
              })
              setMatchScores(scoreMap)
              setIsPersonalized(true)
              personalized = true
              // Still load merged endpoint for external jobs alongside personalized native
              // Personalized scores are overlaid onto the merged list
            }
          }
        } catch {
          // Personalized endpoint failed — fall back silently
        }

        // Load merged paginated endpoint (native + external)
        const res = await fetch(`/api/projects?page=${currentPage}&limit=${PROJECTS_PER_PAGE}`)
        if (res.ok) {
          const data = await res.json()
          const pageProjects: Project[] = (data.projects || []).map((p: any) => ({
            ...p,
            _id: p._id ? (typeof p._id === "string" ? { toString: () => p._id } : p._id) : { toString: () => p.id || "" },
            id: p.id || p._id?.toString?.() || (typeof p._id === "string" ? p._id : ""),
          }))
          setProjects(pageProjects)
          setTotalCount(data.pagination?.total || pageProjects.length)
          setServerTotalPages(data.pagination?.totalPages || 1)
        } else if (!personalized) {
          setFetchError("Failed to load opportunities")
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
        setFetchError("Something went wrong loading opportunities")
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [currentPage])

  const timeCommitments = ["1-2 hours", "5-10 hours", "10-15 hours", "15-25 hours", "25-40 hours", "40+ hours"]
  const locations = ["Remote", "On-site", "Hybrid"]
  const compensationTypes = ["volunteer", "paid", "stipend"]
  const experienceLevels = ["entry", "mid", "senior"]

  const timeCommitmentLabels: Record<string, string> = {
    "1-2 hours": dict.projectsListing?.hours1to2 || "1-2 hours",
    "5-10 hours": dict.projectsListing?.hours5to10 || "5-10 hours",
    "10-15 hours": dict.projectsListing?.hours10to15 || "10-15 hours",
    "15-25 hours": dict.projectsListing?.hours15to25 || "15-25 hours",
    "25-40 hours": dict.projectsListing?.hours25to40 || "25-40 hours",
    "40+ hours": dict.projectsListing?.hours40plus || "40+ hours",
  }

  const locationLabels: Record<string, string> = {
    "Remote": dict.projectsListing?.remote || "Remote",
    "On-site": dict.projectsListing?.onSite || "On-site",
    "Hybrid": dict.projectsListing?.hybrid || "Hybrid",
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const toggleTimeCommitment = (time: string) => {
    setSelectedTimeCommitment((prev) => (prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]))
  }

  const toggleCompensation = (comp: string) => {
    setSelectedCompensation((prev) => (prev.includes(comp) ? prev.filter((c) => c !== comp) : [...prev, comp]))
  }

  const toggleExperience = (exp: string) => {
    setSelectedExperience((prev) => (prev.includes(exp) ? prev.filter((e) => e !== exp) : [...prev, exp]))
  }

  const clearFilters = () => {
    setSelectedSkills([])
    setSelectedTimeCommitment([])
    setSelectedLocation("")
    setSelectedCompensation([])
    setSelectedExperience([])
    setSearchQuery("")
  }

  const hasActiveFilters = selectedSkills.length > 0 || selectedTimeCommitment.length > 0 || selectedLocation !== "" || selectedCompensation.length > 0 || selectedExperience.length > 0

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    // Tab filter
    if (activeTab === "recommended" && isPersonalized && matchScores.size > 0) {
      result = result.filter(p => {
        const pid = p._id?.toString() || p.id || ""
        return (matchScores.get(pid)?.score || 0) > 0
      })
    } else if (activeTab === "trending") {
      result = result
        .sort((a, b) => (b.applicantsCount || 0) - (a.applicantsCount || 0))
        .slice(0, 20)
    }
    
    // Search filter — powered by unified search API
    if (searchQuery.trim().length >= 2) {
      if (unifiedMatchedIds !== null) {
        // API results ready — filter by matched IDs
        result = result.filter((project) => {
          const projectId = project._id?.toString() || project.id || ""
          return unifiedMatchedIds.includes(projectId)
        })
      } else {
        // API loading — basic client-side fallback (title + skills only, not description)
        const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length >= 2)
        result = result.filter((project) => {
          const title = project.title?.toLowerCase() || ""
          const ngoName = project.ngo?.name?.toLowerCase() || ""
          const skillTexts = project.skillsRequired?.map(s => 
            `${s.categoryId} ${s.subskillId}`.toLowerCase()
          ).join(" ") || ""
          const searchable = `${title} ${ngoName} ${skillTexts}`
          return queryTerms.some(term => searchable.includes(term))
        })
      }
    }
    
    // Skills filter (by category)
    if (selectedSkills.length > 0) {
      result = result.filter((project) => {
        const projectCategories = project.skillsRequired?.map(s => s.categoryId) || []
        return selectedSkills.some(skill => {
          const category = skillCategories.find(c => c.name === skill)
          return projectCategories.includes(category?.id || skill.toLowerCase().replace(/\s+/g, '-'))
        })
      })
    }
    
    // Time commitment filter — uses numeric range overlap so stored
    // values like "10-15 hours" match filter "10-15 hours" reliably,
    // even when templates create non-standard ranges like "20-30 hours".
    if (selectedTimeCommitment.length > 0) {
      const parseRange = (s: string): [number, number] | null => {
        const plus = s.match(/(\d+)\+/)
        if (plus) return [parseInt(plus[1], 10), Infinity]
        const range = s.match(/(\d+)\s*-\s*(\d+)/)
        if (range) return [parseInt(range[1], 10), parseInt(range[2], 10)]
        return null
      }
      const overlaps = (a: [number, number], b: [number, number]) =>
        a[0] <= b[1] && b[0] <= a[1]

      result = result.filter((project) => {
        const projectTime = project.timeCommitment || ""
        const projRange = parseRange(projectTime)
        return selectedTimeCommitment.some(time => {
          if (!projRange) return projectTime.toLowerCase().includes(time.toLowerCase())
          const filterRange = parseRange(time)
          if (!filterRange) return false
          return overlaps(projRange, filterRange)
        })
      })
    }
    
    // Location/Work mode filter
    if (selectedLocation && selectedLocation !== "all") {
      result = result.filter((project) => {
        const workMode = project.workMode?.toLowerCase() || ""
        const filterLocation = selectedLocation.toLowerCase()
        
        // Strict matching for work modes
        if (filterLocation === "remote") {
          return workMode === "remote"
        } else if (filterLocation === "on-site" || filterLocation === "onsite") {
          return workMode === "onsite" || workMode === "on-site"
        } else if (filterLocation === "hybrid") {
          return workMode === "hybrid"
        }
        
        // For other location strings, do partial match on location field
        const location = project.location?.toLowerCase() || ""
        return location.includes(filterLocation)
      })
    }

    // Compensation type filter
    if (selectedCompensation.length > 0) {
      result = result.filter((project) => {
        const pType = project.projectType?.toLowerCase() || ""
        return selectedCompensation.some(c => pType.includes(c.toLowerCase()))
      })
    }

    // Experience level filter
    if (selectedExperience.length > 0) {
      result = result.filter((project) => {
        const expLevel = (project as any).experienceLevel?.toLowerCase() || ""
        return selectedExperience.some(e => expLevel.includes(e.toLowerCase()))
      })
    }
    
    // Sorting — auto-use relevance when searching
    const effectiveSort = (searchQuery.trim().length >= 2 && unifiedMatchedIds !== null && sortBy === "bestMatch") ? "relevant" : sortBy
    switch (effectiveSort) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "closing":
        result.sort((a, b) => {
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })
        break
      case "popular":
        result.sort((a, b) => (b.applicantsCount || 0) - (a.applicantsCount || 0))
        break
      case "bestMatch":
        // Sort by personalization score if available, then by date
        if (isPersonalized && matchScores.size > 0) {
          result.sort((a, b) => {
            const idA = a._id?.toString() || a.id || ""
            const idB = b._id?.toString() || b.id || ""
            const scoreA = matchScores.get(idA)?.score || 0
            const scoreB = matchScores.get(idB)?.score || 0
            if (scoreA !== scoreB) return scoreB - scoreA
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })
        } else {
          result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }
        break
      case "relevant":
        // When search is active and API results are available, sort by API relevance
        if (searchQuery.trim().length >= 2 && unifiedMatchedIds !== null) {
          result.sort((a, b) => {
            const idA = a._id?.toString() || a.id || ""
            const idB = b._id?.toString() || b.id || ""
            return (unifiedRelevanceOrder.get(idB) || 0) - (unifiedRelevanceOrder.get(idA) || 0)
          })
        }
        break
    }
    
    return result
  }, [projects, searchQuery, selectedSkills, selectedTimeCommitment, selectedLocation, selectedCompensation, selectedExperience, sortBy, unifiedMatchedIds, unifiedRelevanceOrder, isPersonalized, matchScores, activeTab])

  const FilterPopoverButton = ({ label, icon: Icon, count, children }: { label: string; icon: React.ElementType; count: number; children: React.ReactNode }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-1.5 ${count > 0 ? 'border-primary/50 bg-primary/5' : ''}`}>
          <Icon className="h-3.5 w-3.5" />
          {label}
          {count > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">{count}</Badge>}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        {children}
      </PopoverContent>
    </Popover>
  )

  // Server-side pagination — projects are already the current page
  const totalPages = serverTotalPages
  const paginatedProjects = filteredProjects

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedSkills, selectedTimeCommitment, selectedLocation, selectedCompensation, selectedExperience, sortBy, activeTab])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <ScrollProgress className="top-0" />

      <main className="flex-1">
        {/* Hero Header */}
        <div className="border-b border-border bg-linear-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
            <div className="max-w-2xl">
              <TextAnimate animation="blurInUp" by="word" as="h1" className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                {dict.projectsListing?.title || "Browse Opportunities"}
              </TextAnimate>
              <p className="text-muted-foreground text-lg mb-6">{dict.projectsListing?.subtitle || "Find opportunities that match your skills and interests"}</p>
              <div className="max-w-xl">
                <UnifiedSearchBar
                  defaultType="opportunity"
                  allowedTypes={["opportunity"]}
                  variant="default"
                  placeholder={dict.projectsListing?.searchPlaceholder || "Search opportunities, skills, or organizations..."}
                  value={searchQuery}
                  onSearchChange={setSearchQuery}
                  navigateOnSelect={false}
                />
              </div>

              {/* Inline Filters */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <FilterPopoverButton label={dict.projectsListing?.skills || "Skills"} icon={SlidersHorizontal} count={selectedSkills.length}>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {skillCategories.map((category) => (
                      <div key={category.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`pop-${category.name}`}
                          checked={selectedSkills.includes(category.name)}
                          onCheckedChange={() => toggleSkill(category.name)}
                        />
                        <label htmlFor={`pop-${category.name}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
                          <span>{category.name}</span>
                          <Badge variant="outline" className="text-xs">{category.subskills.length}</Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </FilterPopoverButton>

                <FilterPopoverButton label={dict.projectsListing?.location || "Location"} icon={MapPin} count={selectedLocation && selectedLocation !== "all" ? 1 : 0}>
                  <div className="flex flex-col gap-2">
                    {["all", ...locations].map((location) => (
                      <Button
                        key={location}
                        variant={selectedLocation === location || (location === "all" && !selectedLocation) ? "secondary" : "ghost"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setSelectedLocation(location === "all" ? "" : location)}
                      >
                        {location === "all" ? (dict.projectsListing?.allLocations || "All locations") : (locationLabels[location] || location)}
                      </Button>
                    ))}
                  </div>
                </FilterPopoverButton>

                <FilterPopoverButton label={dict.projectsListing?.timeCommitment || "Hours"} icon={Clock} count={selectedTimeCommitment.length}>
                  <div className="flex flex-col gap-2">
                    {timeCommitments.map((time) => (
                      <div key={time} className="flex items-center gap-2">
                        <Checkbox
                          id={`pop-time-${time}`}
                          checked={selectedTimeCommitment.includes(time)}
                          onCheckedChange={() => toggleTimeCommitment(time)}
                        />
                        <label htmlFor={`pop-time-${time}`} className="text-sm cursor-pointer">
                          {timeCommitmentLabels[time] || time}
                        </label>
                      </div>
                    ))}
                  </div>
                </FilterPopoverButton>

                <FilterPopoverButton label="Compensation" icon={Zap} count={selectedCompensation.length}>
                  <div className="flex flex-col gap-2">
                    {compensationTypes.map((comp) => (
                      <div key={comp} className="flex items-center gap-2">
                        <Checkbox
                          id={`pop-comp-${comp}`}
                          checked={selectedCompensation.includes(comp)}
                          onCheckedChange={() => toggleCompensation(comp)}
                        />
                        <label htmlFor={`pop-comp-${comp}`} className="text-sm cursor-pointer capitalize">
                          {comp}
                        </label>
                      </div>
                    ))}
                  </div>
                </FilterPopoverButton>

                <FilterPopoverButton label="Experience" icon={Award} count={selectedExperience.length}>
                  <div className="flex flex-col gap-2">
                    {experienceLevels.map((exp) => (
                      <div key={exp} className="flex items-center gap-2">
                        <Checkbox
                          id={`pop-exp-${exp}`}
                          checked={selectedExperience.includes(exp)}
                          onCheckedChange={() => toggleExperience(exp)}
                        />
                        <label htmlFor={`pop-exp-${exp}`} className="text-sm cursor-pointer capitalize">
                          {exp === "entry" ? "Entry Level" : exp === "mid" ? "Mid Level" : "Senior Level"}
                        </label>
                      </div>
                    ))}
                  </div>
                </FilterPopoverButton>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    {dict.projectsListing?.clearFilters || "Clear"}
                  </Button>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground"><NumberTicker value={totalCount} /></p>
                  <p className="text-xs text-muted-foreground">Opportunities</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  <Search className="h-3.5 w-3.5" />
                  All
                </TabsTrigger>
                {isPersonalized && (
                  <TabsTrigger value="recommended" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    For You
                  </TabsTrigger>
                )}
                <TabsTrigger value="trending" className="gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trending
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-28 sm:w-40">
                  <SelectValue placeholder={dict.projectsListing?.sortBy || "Sort by"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bestMatch">{isPersonalized ? "Best Match" : (dict.projectsListing?.newestFirst || "Newest First")}</SelectItem>
                  <SelectItem value="newest">{dict.projectsListing?.newestFirst || "Newest First"}</SelectItem>
                  <SelectItem value="relevant">{dict.projectsListing?.mostRelevant || "Most Relevant"}</SelectItem>
                  <SelectItem value="closing">{dict.projectsListing?.closingSoon || "Closing Soon"}</SelectItem>
                  <SelectItem value="popular">{dict.projectsListing?.mostPopular || "Most Popular"}</SelectItem>
                </SelectContent>
              </Select>

              <TooltipProvider>
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(v) => v && setViewMode(v as "grid" | "list")}
                  className="hidden sm:flex"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="grid" aria-label="Grid view">
                        <Grid3X3 className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>Grid view</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="list" aria-label="List view">
                        <List className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>List view</TooltipContent>
                  </Tooltip>
                </ToggleGroup>
              </TooltipProvider>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">{dict.projectsListing?.activeFilters || "Active filters:"}</span>
              {selectedSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <button onClick={() => toggleSkill(skill)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedTimeCommitment.map((time) => (
                <Badge key={time} variant="secondary" className="flex items-center gap-1">
                  {timeCommitmentLabels[time] || time}
                  <button onClick={() => toggleTimeCommitment(time)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedLocation && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {locationLabels[selectedLocation] || selectedLocation}
                  <button onClick={() => setSelectedLocation("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCompensation.map((comp) => (
                <Badge key={comp} variant="secondary" className="flex items-center gap-1 capitalize">
                  {comp}
                  <button onClick={() => toggleCompensation(comp)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedExperience.map((exp) => (
                <Badge key={exp} variant="secondary" className="flex items-center gap-1 capitalize">
                  {exp === "entry" ? "Entry Level" : exp === "mid" ? "Mid Level" : "Senior Level"}
                  <button onClick={() => toggleExperience(exp)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Jobs Grid */}
          <div>
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground flex items-center gap-1.5">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    <NumberTicker value={filteredProjects.length} />
                  </span>
                  {" "}of{" "}
                  <span className="font-semibold text-foreground">
                    <NumberTicker value={totalCount} />
                  </span>
                  {" "}opportunities
                  {currentPage > 1 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (page {currentPage} of {totalPages})
                    </span>
                  )}
                </p>
              </div>

              {loading ? (
                <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-4"}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex gap-2 pt-2">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <Alert className="max-w-md mx-auto">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-center">
                    <p className="font-medium">{dict.projectsListing?.noOpportunitiesFound || "No opportunities found"}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasActiveFilters ? (dict.projectsListing?.tryAdjustingFilters || "Try adjusting your filters") : (dict.projectsListing?.checkBackLater || "Check back later for new opportunities")}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" className="mt-4" onClick={clearFilters}>
                        {dict.projectsListing?.clearFilters || "Clear Filters"}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-4"}>
                    {paginatedProjects.map((project, index) => {
                      const pid = project._id?.toString() || project.id || ""
                      const scoreData = matchScores.get(pid)
                      return (
                        <BlurFade key={pid} delay={0.04 * index} inView>
                          <ProjectCard project={{
                            id: pid,
                            title: project.title,
                            description: project.description,
                            skills: (project.skills || project.skillsRequired?.map(s => s.subskillId) || []).map(resolveSkillName),
                            location: project.workMode === "remote" ? (dict.projectsListing?.remote || "Remote") : project.location || (dict.projectsListing?.onSite || "On-site"),
                            timeCommitment: project.timeCommitment,
                            applicants: project.applicantsCount || 0,
                            postedAt: project.createdAt ? new Date(project.createdAt).toLocaleDateString() : (dict.projectsListing?.recently || "Recently"),
                            projectType: project.projectType,
                            deadline: project.deadline ? (typeof project.deadline === "string" ? project.deadline : new Date(project.deadline).toLocaleDateString()) : undefined,
                            ngo: project.ngo || { name: "NGO", verified: false },
                            matchScore: scoreData?.score,
                            matchReasons: scoreData?.matchReasons,
                            // Dynamic fields from scraped data
                            salary: project.salary || undefined,
                            workMode: project.workMode || undefined,
                            duration: project.duration || undefined,
                            experienceLevel: project.experienceLevel || undefined,
                            compensationType: project.compensationType || undefined,
                            externalUrl: project.externalUrl || undefined,
                            _source: project._source || undefined,
                            _platform: project._platform || undefined,
                          }} />
                        </BlurFade>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination className="mt-10">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            if (totalPages <= 7) return true
                            if (page === 1 || page === totalPages) return true
                            if (Math.abs(page - currentPage) <= 1) return true
                            return false
                          })
                          .map((page, idx, arr) => (
                            <span key={page} className="contents">
                              {idx > 0 && arr[idx - 1] !== page - 1 && (
                                <PaginationItem><PaginationEllipsis /></PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  isActive={currentPage === page}
                                  onClick={() => setCurrentPage(page)}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </span>
                          ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
