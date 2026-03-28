"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { BlurFade } from "@/components/ui/blur-fade"
import { TextAnimate } from "@/components/ui/text-animate"
import { ScrollProgress } from "@/components/ui/scroll-progress"
import { skillCategories, resolveSkillName } from "@/lib/skills-data"
import { SlidersHorizontal, Grid3X3, List, X, Loader2, Search, Sparkles, TrendingUp, BookmarkCheck, Info } from "lucide-react"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { BrowseGridSkeleton } from "@/components/ui/page-skeletons"
import { useDictionary } from "@/components/dictionary-provider"

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

const PROJECTS_PER_PAGE = 12

function ProjectsContent() {
  const searchParams = useSearchParams()
  const dict = useDictionary()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedTimeCommitment, setSelectedTimeCommitment] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>("")
  const [sortBy, setSortBy] = useState("bestMatch")
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
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
          const ids = (data.results || []).map((r: any) => r.mongoId || r.id)
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
                return { ...p, _id: p._id || { toString: () => pid }, id: pid }
              })
              setProjects(projectList)
              setMatchScores(scoreMap)
              setIsPersonalized(true)
              personalized = true
            }
          }
        } catch {
          // Personalized endpoint failed — fall back silently
        }

        // Fallback: try skill-matched endpoint for volunteers without
        // a full profile, so they still see relevant projects
        if (!personalized) {
          try {
            const mRes = await fetch("/api/projects/matched")
            if (mRes.ok) {
              const mData = await mRes.json()
              if (mData.matched && mData.projects?.length > 0) {
                setProjects(mData.projects)
                personalized = true
              }
            }
          } catch {
            // fall through to generic
          }
        }

        // Last resort: generic listing (for non-volunteers / guests)
        if (!personalized) {
          const res = await fetch("/api/projects")
          if (res.ok) {
            const data = await res.json()
            setProjects(data.projects || [])
          }
        }

        // Fetch and merge external opportunities (looks like native projects)
        try {
          const extRes = await fetch("/api/external-opportunities?limit=500")
          if (extRes.ok) {
            const extData = await extRes.json()
            const externalAsProjects: Project[] = (extData.opportunities || []).map((opp: any) => ({
              _id: { toString: () => `ext-${opp._id || opp.externalId}` },
              id: `ext-${opp._id || opp.externalId}`,
              title: opp.title || "",
              description: opp.shortDescription || opp.title || "",
              skillsRequired: (opp.skillsRequired || []).map((s: any) =>
                typeof s === "string" ? { categoryId: "external", subskillId: s } : s
              ),
              ngoId: "",
              status: "published",
              workMode: opp.workMode || "remote",
              location: opp.location || undefined,
              timeCommitment: opp.experienceLevel || "Flexible",
              projectType: opp.compensationType === "Paid" ? "short-term" : "long-term",
              applicantsCount: 0,
              createdAt: opp.scrapedAt ? new Date(opp.scrapedAt) : new Date(),
              ngo: {
                name: opp.organization || "Organization",
                verified: false,
              },
              skills: (opp.skillsRequired || []).map((s: any) => typeof s === "string" ? s : s.subskillId || ""),
              externalUrl: opp.sourceUrl,
            }))
            setProjects(prev => [...prev, ...externalAsProjects])
          }
        } catch {
          // External fetch failed — continue with internal only
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const timeCommitments = ["1-2 hours", "5-10 hours", "10-15 hours", "15-25 hours", "25-40 hours", "40+ hours"]
  const locations = ["Remote", "On-site", "Hybrid"]

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

  const clearFilters = () => {
    setSelectedSkills([])
    setSelectedTimeCommitment([])
    setSelectedLocation("")
    setSearchQuery("")
  }

  const hasActiveFilters = selectedSkills.length > 0 || selectedTimeCommitment.length > 0 || selectedLocation !== ""

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
  }, [projects, searchQuery, selectedSkills, selectedTimeCommitment, selectedLocation, sortBy, unifiedMatchedIds, unifiedRelevanceOrder, isPersonalized, matchScores, activeTab])

  const FilterContent = () => (
    <div className="flex flex-col gap-1">
      <Accordion type="multiple" defaultValue={["skills", "time", "location"]} className="w-full">
        {/* Skills */}
        <AccordionItem value="skills">
          <AccordionTrigger className="text-sm font-semibold text-foreground">
            {dict.projectsListing?.skills || "Skills"}
            {selectedSkills.length > 0 && (
              <Badge variant="secondary" className="ml-2">{selectedSkills.length}</Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2">
              {skillCategories.map((category) => (
                <div key={category.name} className="flex items-center gap-2">
                  <Checkbox
                    id={category.name}
                    checked={selectedSkills.includes(category.name)}
                    onCheckedChange={() => toggleSkill(category.name)}
                  />
                  <label
                    htmlFor={category.name}
                    className="text-sm text-foreground cursor-pointer flex-1 flex items-center justify-between"
                  >
                    <span>{category.name}</span>
                    <Badge variant="outline" className="text-xs">{category.subskills.length}</Badge>
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="time">
          <AccordionTrigger className="text-sm font-semibold text-foreground">
            {dict.projectsListing?.timeCommitment || "Time Commitment"}
            {selectedTimeCommitment.length > 0 && (
              <Badge variant="secondary" className="ml-2">{selectedTimeCommitment.length}</Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2">
              {timeCommitments.map((time) => (
                <div key={time} className="flex items-center gap-2">
                  <Checkbox
                    id={time}
                    checked={selectedTimeCommitment.includes(time)}
                    onCheckedChange={() => toggleTimeCommitment(time)}
                  />
                  <label htmlFor={time} className="text-sm text-foreground cursor-pointer">
                    {timeCommitmentLabels[time] || time}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="location">
          <AccordionTrigger className="text-sm font-semibold text-foreground">
            {dict.projectsListing?.location || "Location"}
            {selectedLocation && selectedLocation !== "all" && (
              <Badge variant="secondary" className="ml-2">1</Badge>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder={dict.projectsListing?.allLocations || "All locations"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{dict.projectsListing?.allLocations || "All locations"}</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {locationLabels[location] || location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="my-2" />

      {hasActiveFilters && (
        <Button variant="outline" className="w-full bg-transparent" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          {dict.projectsListing?.clearAllFilters || "Clear all filters"}
        </Button>
      )}
    </div>
  )

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE)
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * PROJECTS_PER_PAGE
    return filteredProjects.slice(start, start + PROJECTS_PER_PAGE)
  }, [filteredProjects, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedSkills, selectedTimeCommitment, selectedLocation, sortBy, activeTab])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <ScrollProgress className="top-0" />

      <main className="flex-1">
        {/* Header */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 md:px-6 py-8">
            <TextAnimate animation="blurInUp" by="word" as="h1" className="text-3xl font-bold text-foreground mb-2">
              {dict.projectsListing?.title || "Browse Opportunities"}
            </TextAnimate>
            <p className="text-muted-foreground">{dict.projectsListing?.subtitle || "Find opportunities that match your skills and interests"}</p>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
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

            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden bg-transparent">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {dict.projectsListing?.filters || "Filters"}
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {selectedSkills.length + selectedTimeCommitment.length + (selectedLocation ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-background">
                  <SheetHeader>
                    <SheetTitle>{dict.projectsListing?.filters || "Filters"}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

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
            </div>
          )}

          {/* Tabs for All / Recommended / Saved */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                {dict.projectsListing?.allTab || "All"}
              </TabsTrigger>
              {isPersonalized && (
                <TabsTrigger value="recommended" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {dict.projectsListing?.recommendedTab || "Recommended"}
                </TabsTrigger>
              )}
              <TabsTrigger value="trending" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {dict.projectsListing?.trendingTab || "Trending"}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">{dict.projectsListing?.filters || "Filters"}</h3>
                  <FilterContent />
                </CardContent>
              </Card>
            </aside>

            {/* Projects Grid/List */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground flex items-center gap-1.5">
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    <NumberTicker value={filteredProjects.length} />
                  </span>
                  {" "}of{" "}
                  <span className="font-semibold text-foreground">
                    <NumberTicker value={projects.length} />
                  </span>
                  {" "}opportunities
                </p>
              </div>

              {loading ? (
                <BrowseGridSkeleton columns={3} count={6} />
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
                  <div className={viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
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
                            ngo: project.ngo || { name: dict.projectsListing?.ngoFallback || "NGO", verified: false },
                            matchScore: scoreData?.score,
                            matchReasons: scoreData?.matchReasons,
                            externalUrl: project.externalUrl,
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
