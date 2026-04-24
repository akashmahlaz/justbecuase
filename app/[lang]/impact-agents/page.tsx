"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { VolunteerCard } from "@/components/volunteers/volunteer-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NumberTicker } from "@/components/ui/number-ticker"
import { BlurFade } from "@/components/ui/blur-fade"
import { TextAnimate } from "@/components/ui/text-animate"
import { ScrollProgress } from "@/components/ui/scroll-progress"
import { Skeleton } from "@/components/ui/skeleton"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { AIEmptyState } from "@/components/ui/ai-empty-state"
import { skillCategories, causes, resolveSkillRefFromName, resolveCauseId } from "@/lib/skills-data"
import { useDictionary } from "@/components/dictionary-provider"
import { useLocale } from "@/hooks/use-locale"
import type { VolunteerProfileView } from "@/lib/types"
import {
  SlidersHorizontal,
  X,
  Loader2,
  Search,
  TrendingUp,
  Sparkles,
  Users,
  MapPin,
  Briefcase,
  Clock,
  Star,
  ChevronDown,
  Heart,
  Globe,
  Award,
} from "lucide-react"

export default function ImpactAgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ImpactAgentsContent />
    </Suspense>
  )
}

function ImpactAgentsContent() {
  const dict = useDictionary()
  const locale = useLocale()
  const vl = (dict as any).volunteersListing || {}

  const [agents, setAgents] = useState<VolunteerProfileView[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [selectedVolunteerType, setSelectedVolunteerType] = useState("")
  const [selectedWorkMode, setSelectedWorkMode] = useState("")
  const [sortBy, setSortBy] = useState("best-match")
  const [activeTab, setActiveTab] = useState("all")

  // Unified search state
  const [unifiedMatchedIds, setUnifiedMatchedIds] = useState<string[] | null>(null)
  const [unifiedRelevanceOrder, setUnifiedRelevanceOrder] = useState<Map<string, number>>(new Map())
  const [searchResultAgents, setSearchResultAgents] = useState<VolunteerProfileView[] | null>(null)
  const [isUnifiedSearching, setIsUnifiedSearching] = useState(false)
  const unifiedAbortRef = useRef<AbortController | null>(null)

  // Map a unified-search volunteer hit into the local VolunteerProfileView
  // shape so existing VolunteerCard renders without changes. This lets us
  // surface global DB matches even when the volunteer isn't in the locally
  // pre-loaded list (e.g. when there are more volunteers than the API cap).
  const mapSearchResultToAgent = (r: any): VolunteerProfileView => {
    const id = r.userId || r.mongoId || r.id || ""
    const skillNames: string[] = Array.isArray(r.skills) ? r.skills : []
    // Search results expose human-readable skill / cause names. Convert
    // back to ids so the on-page Skill / Cause filter pills still match.
    const skills = skillNames.map((name: string) => {
      const ref = resolveSkillRefFromName(name)
      return { categoryId: ref.categoryId, subskillId: ref.subskillId, level: "intermediate" as any }
    })
    const causeNames: string[] = Array.isArray(r.causes) ? r.causes : []
    const causeIds = causeNames.map(resolveCauseId).filter(Boolean)
    return {
      id,
      location: r.location || "",
      skills,
      causes: causeIds,
      workMode: (r.workMode || "remote") as any,
      hoursPerWeek: r.hoursPerWeek || "",
      volunteerType: (r.volunteerType || "free") as any,
      completedProjects: 0,
      hoursContributed: 0,
      rating: r.rating || 0,
      isVerified: r.verified || false,
      name: r.title || null,
      avatar: r.avatar || null,
      bio: r.description || r.subtitle || null,
      isUnlocked: false,
      canMessage: false,
    }
  }

  // Debounced unified search
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 3) {
      setUnifiedMatchedIds(null)
      setUnifiedRelevanceOrder(new Map())
      setSearchResultAgents(null)
      return
    }
    const timer = setTimeout(async () => {
      unifiedAbortRef.current?.abort()
      const controller = new AbortController()
      unifiedAbortRef.current = controller
      setIsUnifiedSearching(true)
      try {
        const res = await fetch(
          `/api/unified-search?q=${encodeURIComponent(trimmed)}&types=volunteer&limit=50`,
          { signal: controller.signal }
        )
        const data = await res.json()
        if (data.success && !controller.signal.aborted) {
          const rawResults = Array.isArray(data.results) ? data.results : []
          const ids = rawResults.map((r: any) => r.userId || r.mongoId || r.id)
          setUnifiedMatchedIds(ids)
          const orderMap = new Map<string, number>()
          ids.forEach((id: string, idx: number) => orderMap.set(id, ids.length - idx))
          setUnifiedRelevanceOrder(orderMap)
          // Hold the full search-result agent list so we can render globally
          // matched volunteers that aren't in the pre-loaded `agents` array.
          setSearchResultAgents(rawResults.map(mapSearchResultToAgent))
        }
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Unified search failed:", err)
      } finally {
        if (!controller.signal.aborted) setIsUnifiedSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    return () => { unifiedAbortRef.current?.abort() }
  }, [])

  // Fetch agents
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/volunteers")
        if (res.ok) {
          const data = await res.json()
          setAgents(data.volunteers || [])
        }
      } catch (error) {
        console.error("Failed to fetch candidates:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const toggleSkill = (id: string) =>
    setSelectedSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  const toggleCause = (id: string) =>
    setSelectedCauses((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  const clearFilters = () => {
    setSelectedSkills([])
    setSelectedCauses([])
    setSelectedVolunteerType("")
    setSelectedWorkMode("")
    setSearchQuery("")
  }

  const hasActiveFilters =
    selectedSkills.length > 0 ||
    selectedCauses.length > 0 ||
    selectedVolunteerType !== "" ||
    selectedWorkMode !== ""

  // Filter and sort
  const filteredAgents = useMemo(() => {
    // When a search query is active and the API has returned results, use
    // the search results as the source list (covers entire DB). Merge in any
    // pre-loaded agents with the same id so we keep enriched fields
    // (avatar, bio, completedProjects, etc.) when available.
    const hasActiveSearch = searchQuery.trim().length >= 3
    let result: VolunteerProfileView[]
    if (hasActiveSearch && searchResultAgents !== null) {
      const localById = new Map(agents.map((a) => [a.id, a]))
      result = searchResultAgents.map((sr) => {
        const local = localById.get(sr.id)
        return local ? { ...sr, ...local } : sr
      })
    } else {
      result = [...agents]
    }

    // Tab filter
    if (activeTab === "top-rated") {
      result = result.filter((a) => (a.rating || 0) >= 4).sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (activeTab === "most-active") {
      result = result.sort((a, b) => (b.completedProjects || 0) - (a.completedProjects || 0)).slice(0, 50)
    }

    // Search — when API results are loaded, we already used them as the
    // source list above. Only run a local fallback while the API is in flight.
    if (searchQuery.trim().length >= 3 && searchResultAgents === null) {
      const query = searchQuery.toLowerCase()
      result = result.filter((v) => {
        const fields = [v.name, v.bio, v.location, ...(v.causes || [])].filter(Boolean).join(" ").toLowerCase()
        const skillText = v.skills?.map((s) => `${s.categoryId} ${s.subskillId}`).join(" ").toLowerCase() || ""
        return (fields + " " + skillText).includes(query)
      })
    }

    // Skills
    if (selectedSkills.length > 0) {
      result = result.filter((v) => {
        const ids = v.skills?.map((s) => s.categoryId).concat(v.skills?.map((s) => s.subskillId)) || []
        return selectedSkills.some((sk) => ids.includes(sk))
      })
    }

    // Causes
    if (selectedCauses.length > 0) {
      result = result.filter((v) => selectedCauses.some((c) => v.causes?.includes(c)))
    }

    // Volunteer type
    if (selectedVolunteerType && selectedVolunteerType !== "all") {
      result = result.filter((v) => v.volunteerType === selectedVolunteerType)
    }

    // Work mode
    if (selectedWorkMode && selectedWorkMode !== "all") {
      result = result.filter((v) => v.workMode === selectedWorkMode)
    }

    // Sort
    switch (sortBy) {
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case "experienced":
        result.sort((a, b) => (b.completedProjects || 0) - (a.completedProjects || 0))
        break
      case "hours":
        result.sort((a, b) => (b.hoursContributed || 0) - (a.hoursContributed || 0))
        break
      case "best-match":
      default:
        if (searchQuery.trim() && unifiedMatchedIds !== null) {
          result.sort((a, b) => (unifiedRelevanceOrder.get(b.id) || 0) - (unifiedRelevanceOrder.get(a.id) || 0))
        }
        break
    }

    return result
  }, [agents, searchResultAgents, searchQuery, selectedSkills, selectedCauses, selectedVolunteerType, selectedWorkMode, sortBy, activeTab, unifiedMatchedIds, unifiedRelevanceOrder])

  const FilterPopoverButton = ({
    label,
    icon: Icon,
    count,
    children,
  }: {
    label: string
    icon: React.ElementType
    count: number
    children: React.ReactNode
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-1.5 ${count > 0 ? "border-primary/50 bg-primary/5" : ""}`}>
          <Icon className="h-3.5 w-3.5" />
          {label}
          {count > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
              {count}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        {children}
      </PopoverContent>
    </Popover>
  )

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
                {vl.title ? vl.title.replace("Volunteers", "Candidates") : "Discover Candidates"}
              </TextAnimate>
              <p className="text-muted-foreground text-lg mb-6">
                Connect with skilled professionals ready to make a difference — browse, search, and find the right candidate for your cause.
              </p>
              <div className="max-w-xl">
                <UnifiedSearchBar
                  defaultType="volunteer"
                  allowedTypes={["volunteer"]}
                  variant="default"
                  placeholder={vl.searchPlaceholder || "Search by skills, location, or name..."}
                  value={searchQuery}
                  onSearchChange={setSearchQuery}
                  navigateOnSelect={false}
                />
              </div>

              {/* Inline Filters */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <FilterPopoverButton label={vl.skills || "Skills"} icon={SlidersHorizontal} count={selectedSkills.length}>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {skillCategories.map((category) => (
                      <div key={category.id} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{category.name}</p>
                        {category.subskills.slice(0, 4).map((skill) => (
                          <div key={skill.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`ia-skill-${skill.id}`}
                              checked={selectedSkills.includes(skill.id)}
                              onCheckedChange={() => toggleSkill(skill.id)}
                            />
                            <label htmlFor={`ia-skill-${skill.id}`} className="text-sm cursor-pointer">
                              {skill.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </FilterPopoverButton>

                <FilterPopoverButton label={vl.causes || "Causes"} icon={Heart} count={selectedCauses.length}>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {causes.map((cause) => (
                      <div key={cause.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`ia-cause-${cause.id}`}
                          checked={selectedCauses.includes(cause.id)}
                          onCheckedChange={() => toggleCause(cause.id)}
                        />
                        <label htmlFor={`ia-cause-${cause.id}`} className="text-sm cursor-pointer flex items-center gap-1">
                          <span>{cause.icon}</span> {cause.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </FilterPopoverButton>

                <FilterPopoverButton label="Type" icon={Briefcase} count={selectedVolunteerType ? 1 : 0}>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: "all", label: vl.allImpactAgents || "All" },
                      { value: "free", label: vl.proBono || "Pro Bono" },
                      { value: "paid", label: vl.paid || "Paid" },
                      { value: "both", label: vl.openToBoth || "Open to Both" },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={selectedVolunteerType === opt.value || (opt.value === "all" && !selectedVolunteerType) ? "secondary" : "ghost"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setSelectedVolunteerType(opt.value === "all" ? "" : opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </FilterPopoverButton>

                <FilterPopoverButton label={vl.workMode || "Work Mode"} icon={Globe} count={selectedWorkMode ? 1 : 0}>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: "all", label: "All" },
                      { value: "remote", label: vl.remote || "Remote" },
                      { value: "hybrid", label: "Hybrid" },
                      { value: "onsite", label: vl.onSite || "On-site" },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={selectedWorkMode === opt.value || (opt.value === "all" && !selectedWorkMode) ? "secondary" : "ghost"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setSelectedWorkMode(opt.value === "all" ? "" : opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </FilterPopoverButton>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    <NumberTicker value={agents.length} />
                  </p>
                  <p className="text-xs text-muted-foreground">Candidates</p>
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
                <TabsTrigger value="top-rated" className="gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Top Rated
                </TabsTrigger>
                <TabsTrigger value="most-active" className="gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Most Active
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 sm:w-44">
                  <SelectValue placeholder={vl.sortBy || "Sort by"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best-match">{vl.bestMatch || "Best Match"}</SelectItem>
                  <SelectItem value="rating">{vl.highestRated || "Highest Rated"}</SelectItem>
                  <SelectItem value="experienced">{vl.mostExperienced || "Most Experienced"}</SelectItem>
                  <SelectItem value="hours">{vl.mostHours || "Most Hours"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedSkills.map((skillId) => {
                let skillName = skillId
                for (const category of skillCategories) {
                  const found = category.subskills.find((s: { id: string; name: string }) => s.id === skillId)
                  if (found) {
                    skillName = found.name
                    break
                  }
                }
                return (
                  <Badge key={skillId} variant="secondary" className="flex items-center gap-1">
                    {skillName}
                    <button onClick={() => toggleSkill(skillId)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
              {selectedCauses.map((causeId) => {
                const causeName = causes.find((c) => c.id === causeId)?.name || causeId
                return (
                  <Badge key={causeId} variant="secondary" className="flex items-center gap-1">
                    {causeName}
                    <button onClick={() => toggleCause(causeId)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
              {selectedVolunteerType && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedVolunteerType === "free" ? "Pro Bono" : selectedVolunteerType === "paid" ? "Paid" : "Both"}
                  <button onClick={() => setSelectedVolunteerType("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedWorkMode && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedWorkMode.charAt(0).toUpperCase() + selectedWorkMode.slice(1)}
                  <button onClick={() => setSelectedWorkMode("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Results */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground flex items-center gap-1.5">
              Showing{" "}
              <span className="font-semibold text-foreground">
                <NumberTicker value={filteredAgents.length} />
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                <NumberTicker value={agents.length} />
              </span>{" "}
              candidates
              {isUnifiedSearching && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
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
          ) : filteredAgents.length === 0 ? (
            <AIEmptyState
              mode="empty"
              title={vl.noAgentsFound || "No candidates found"}
              description={
                hasActiveFilters || searchQuery
                  ? (vl.tryAdjusting || "Try adjusting your filters or search terms")
                  : (vl.checkBackLater || "Check back later for new candidates")
              }
              action={
                (hasActiveFilters || searchQuery) ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAgents.map((agent, index) => (
                <BlurFade key={agent.id} delay={0.04 * Math.min(index, 12)} inView>
                  <VolunteerCard volunteer={agent} />
                </BlurFade>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
