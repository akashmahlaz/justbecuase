"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { VolunteerCard } from "@/components/volunteers/volunteer-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
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
import { skillCategories, causes, resolveSkillRefFromName, resolveCauseId } from "@/lib/skills-data"
import { SlidersHorizontal, X, Loader2, Zap, Lock } from "lucide-react"
import Link from "next/link"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { AIEmptyState } from "@/components/ui/ai-empty-state"
import { BrowseGridSkeleton } from "@/components/ui/page-skeletons"
import { useDictionary } from "@/components/dictionary-provider"
import { useLocale } from "@/hooks/use-locale"
import type { VolunteerProfileView } from "@/lib/types"

interface VolunteersPageProps {
  /**
   * When true the component is being rendered inside another layout (e.g.
   * NGO dashboard) so we should disable the global navbar/hero that normally
   * surrounds the search UI.
   */
  embed?: boolean
  /** NGO subscription plan – passed from the NGO find-talent page */
  subscriptionPlan?: "free" | "pro"
}

export default function VolunteersPage({ embed, subscriptionPlan }: VolunteersPageProps = {}) {
  const dict = useDictionary()
  const lang = useLocale()
  const [volunteers, setVolunteers] = useState<VolunteerProfileView[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [selectedVolunteerType, setSelectedVolunteerType] = useState("")
  const [selectedWorkMode, setSelectedWorkMode] = useState("")
  const [sortBy, setSortBy] = useState("best-match")

  // ==========================================
  // UNIFIED SEARCH API — drives volunteer filtering
  // ==========================================
  const [unifiedMatchedIds, setUnifiedMatchedIds] = useState<string[] | null>(null)
  const [unifiedRelevanceOrder, setUnifiedRelevanceOrder] = useState<Map<string, number>>(new Map())
  const [searchResultVolunteers, setSearchResultVolunteers] = useState<VolunteerProfileView[] | null>(null)
  const [isUnifiedSearching, setIsUnifiedSearching] = useState(false)
  const unifiedAbortRef = useRef<AbortController | null>(null)

  /**
   * Map a unified-search result row into the local VolunteerProfileView shape
   * so search hits beyond the locally-fetched volunteer list still render.
   */
  function mapSearchResultToVolunteer(r: any): VolunteerProfileView {
    const skillsArr: any[] = Array.isArray(r.skills) ? r.skills : []
    // Unified-search returns skill / cause NAMES, but local filters compare
    // against IDs. Translate names back to ids so the filter pills work
    // against search-result-only volunteers.
    const skills = skillsArr.map((s: any) => {
      if (typeof s === "string") {
        const ref = resolveSkillRefFromName(s)
        return { categoryId: ref.categoryId, subskillId: ref.subskillId, level: "intermediate" as any }
      }
      return {
        categoryId: s.categoryId || s.id || "",
        subskillId: s.subskillId || s.id || "",
        level: (s.level || "intermediate") as any,
      }
    })
    const causeNames: string[] = Array.isArray(r.causes) ? r.causes : []
    const causeIds = causeNames.map((c) => (typeof c === "string" ? resolveCauseId(c) : c)).filter(Boolean)
    return {
      id: r.userId || r.mongoId || r.id,
      name: r.title || r.name || null,
      avatar: r.avatar || null,
      bio: r.subtitle || r.description || null,
      location: r.location || "",
      skills,
      causes: causeIds,
      workMode: (r.workMode as any) || "flexible",
      hoursPerWeek: r.hoursPerWeek || "",
      volunteerType: (r.volunteerType as any) || "free",
      completedProjects: 0,
      hoursContributed: 0,
      rating: r.rating || 0,
      isVerified: !!r.verified,
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
      setSearchResultVolunteers(null)
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
          // Use mongoId for reliable cross-referencing with volunteer list
          const rawResults = (data.results || []).filter((r: any) => r.type === "volunteer")
          const ids = rawResults.map((r: any) => r.mongoId || r.id)
          setUnifiedMatchedIds(ids)
          setSearchResultVolunteers(rawResults.map(mapSearchResultToVolunteer))
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

  // Fetch volunteers
  useEffect(() => {
    async function fetchVolunteers() {
      try {
        const res = await fetch("/api/volunteers")
        if (res.ok) {
          const data = await res.json()
          setVolunteers(data.volunteers || [])
        }
      } catch (error) {
        console.error("Failed to fetch volunteers:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchVolunteers()
  }, [])

  // Toggle functions
  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    )
  }

  const toggleCause = (causeId: string) => {
    setSelectedCauses((prev) =>
      prev.includes(causeId) ? prev.filter((c) => c !== causeId) : [...prev, causeId]
    )
  }

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

  // Filter and sort volunteers
  const filteredVolunteers = useMemo(() => {
    // When the user has a search query and the unified-search API has
    // returned results, drive the visible list from those results so we
    // surface volunteers that aren't part of the locally-fetched page.
    // Merge with the local list (richer fields like avatar/bio) when an
    // entry is also present locally.
    const hasActiveSearch = searchQuery.trim().length > 0
    let result: VolunteerProfileView[]

    if (hasActiveSearch && searchResultVolunteers !== null) {
      const localById = new Map(volunteers.map((v) => [v.id, v]))
      result = searchResultVolunteers.map((sr) => {
        const local = localById.get(sr.id)
        return local ? ({ ...sr, ...local } as VolunteerProfileView) : sr
      })
    } else if (hasActiveSearch && unifiedMatchedIds === null) {
      // API request still in flight — fallback to a basic local filter
      // so the UI doesn't go blank while typing.
      const query = searchQuery.toLowerCase()
      result = volunteers.filter((v) => {
        const nameMatch = v.name?.toLowerCase()?.includes(query)
        const bioMatch = v.bio?.toLowerCase()?.includes(query)
        const skillsMatch = v.skills?.some(
          (s) =>
            s.categoryId?.toLowerCase().includes(query) ||
            s.subskillId?.toLowerCase().includes(query)
        )
        const locationMatch = v.location?.toLowerCase()?.includes(query)
        const causeMatch = v.causes?.some((c) => c.toLowerCase().includes(query))
        return nameMatch || bioMatch || skillsMatch || locationMatch || causeMatch
      })
    } else {
      result = [...volunteers]
    }

    // Skills filter (by category)
    if (selectedSkills.length > 0) {
      result = result.filter((v) => {
        const volCategoryIds = v.skills?.map((s) => s.categoryId) || []
        const volSubskillIds = v.skills?.map((s) => s.subskillId) || []
        return selectedSkills.some((skillId) => {
          return volCategoryIds.includes(skillId) || volSubskillIds.includes(skillId)
        })
      })
    }

    // Causes filter
    if (selectedCauses.length > 0) {
      result = result.filter((v) => {
        return selectedCauses.some((cause) => v.causes?.includes(cause))
      })
    }

    // Volunteer Type filter
    if (selectedVolunteerType && selectedVolunteerType !== "all") {
      result = result.filter((v) => v.volunteerType === selectedVolunteerType)
    }

    // Work Mode filter
    if (selectedWorkMode && selectedWorkMode !== "all") {
      result = result.filter((v) => v.workMode === selectedWorkMode)
    }

    // Sorting
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
        // When search is active and API results are available, sort by API relevance
        if (searchQuery.trim() && unifiedMatchedIds !== null) {
          result.sort((a, b) => {
            return (unifiedRelevanceOrder.get(b.id) || 0) - (unifiedRelevanceOrder.get(a.id) || 0)
          })
        }
        break
    }

    return result
  }, [
    volunteers,
    searchResultVolunteers,
    searchQuery,
    selectedSkills,
    selectedCauses,
    selectedVolunteerType,
    selectedWorkMode,
    sortBy,
    unifiedMatchedIds,
    unifiedRelevanceOrder,
  ])

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Volunteer Type */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">{dict.volunteersListing?.impactAgentType || "Candidate Type"}</Label>
        <RadioGroup
          value={selectedVolunteerType || "all"}
          onValueChange={(value) => setSelectedVolunteerType(value === "all" ? "" : value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="type-all" />
            <Label htmlFor="type-all" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.allImpactAgents || "All Candidates"}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="free" id="type-free" />
            <Label htmlFor="type-free" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.proBono || "Pro Bono"}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="paid" id="type-paid" />
            <Label htmlFor="type-paid" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.paid || "Paid"}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="type-both" />
            <Label htmlFor="type-both" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.openToBoth || "Open to Both"}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Work Mode */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">{dict.volunteersListing?.workMode || "Work Mode"}</Label>
        <RadioGroup
          value={selectedWorkMode || "all"}
          onValueChange={(value) => setSelectedWorkMode(value === "all" ? "" : value)}
        >
          {/*
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="mode-all" />
            <Label htmlFor="mode-all" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.any || "Any"}
            </Label>
          </div>
          */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="remote" id="mode-remote" />
            <Label htmlFor="mode-remote" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.remote || "Remote"}
            </Label>
          </div>
          {/*
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hybrid" id="mode-hybrid" />
            <Label htmlFor="mode-hybrid" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.hybridMode || "Hybrid"}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="onsite" id="mode-onsite" />
            <Label htmlFor="mode-onsite" className="text-sm font-normal cursor-pointer">
              {dict.volunteersListing?.onSite || "On-site"}
            </Label>
          </div>
          */}
        </RadioGroup>
      </div>

      {/* Skills */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">{dict.volunteersListing?.skills || "Skills"}</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {skillCategories.map((category) => (
            <div key={category.id} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{category.name}</p>
              {category.subskills.slice(0, 4).map((skill) => (
                <div key={skill.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-${skill.id}`}
                    checked={selectedSkills.includes(skill.id)}
                    onCheckedChange={() => toggleSkill(skill.id)}
                  />
                  <Label
                    htmlFor={`filter-${skill.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {skill.name}
                  </Label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Causes */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">{dict.volunteersListing?.causes || "Causes"}</Label>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {causes.map((cause) => (
            <div key={cause.id} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-cause-${cause.id}`}
                checked={selectedCauses.includes(cause.id)}
                onCheckedChange={() => toggleCause(cause.id)}
              />
              <Label
                htmlFor={`filter-cause-${cause.id}`}
                className="text-sm font-normal cursor-pointer flex items-center gap-1"
              >
                <span>{cause.icon}</span>
                {cause.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full bg-transparent" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          {dict.volunteersListing?.clearAllFilters || "Clear all filters"}
        </Button>
      )}
    </div>
  )

  return (
    <div className={embed ? "" : "min-h-screen flex flex-col bg-background"}>
      {!embed && <Navbar />}

      <main className={embed ? "" : "flex-1"}>
        {/* Hero Section */}
        {!embed && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  {dict.volunteersListing?.title || "Find Skilled Candidates"}
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  {dict.volunteersListing?.subtitle || "Connect with talented professionals ready to contribute their skills to your cause"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={embed ? "py-0" : "container mx-auto px-4 md:px-6 py-8"}>
          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <UnifiedSearchBar
                defaultType="volunteer"
                allowedTypes={["volunteer"]}
                variant="default"
                placeholder={dict.volunteersListing?.searchPlaceholder || "Search by skills, location, or name..."}
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
                    {dict.volunteersListing?.filters || "Filters"}
                    {hasActiveFilters && (
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {selectedSkills.length +
                          selectedCauses.length +
                          (selectedVolunteerType ? 1 : 0) +
                          (selectedWorkMode ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-background">
                  <SheetHeader>
                    <SheetTitle>{dict.volunteersListing?.filters || "Filters"}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 sm:w-44">
                  <SelectValue placeholder={dict.volunteersListing?.sortBy || "Sort by"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best-match">{dict.volunteersListing?.bestMatch || "Best Match"}</SelectItem>
                  <SelectItem value="rating">{dict.volunteersListing?.highestRated || "Highest Rated"}</SelectItem>
                  <SelectItem value="experienced">{dict.volunteersListing?.mostExperienced || "Most Experienced"}</SelectItem>
                  <SelectItem value="hours">{dict.volunteersListing?.mostHours || "Most Hours"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">{dict.volunteersListing?.activeFilters || "Active filters:"}</span>
              {selectedSkills.map((skillId) => {
                let skillName = skillId
                for (const category of skillCategories) {
                  const found = category.subskills.find((s: { id: string; name: string }) => s.id === skillId)
                  if (found) { skillName = found.name; break }
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
                  {selectedVolunteerType === "free"
                    ? (dict.volunteersListing?.proBono || "Pro Bono")
                    : selectedVolunteerType === "paid"
                    ? (dict.volunteersListing?.paid || "Paid")
                    : (dict.volunteersListing?.both || "Both")}
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

          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-60 flex-shrink-0">
              <div className="sticky top-24 bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground text-sm mb-4">{dict.volunteersListing?.filters || "Filters"}</h3>
                <FilterContent />
              </div>
            </aside>

            {/* Volunteers Grid */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-4">
                {(dict.volunteersListing?.showingTemplate || "Showing {shown} of {total} candidates")
                  .replace("{shown}", String(filteredVolunteers.length))
                  .replace("{total}", String(volunteers.length))}
                {isUnifiedSearching && (
                  <Loader2 className="inline h-4 w-4 animate-spin ml-2" />
                )}
              </p>

              {loading ? (
                <BrowseGridSkeleton columns={2} count={6} />
              ) : filteredVolunteers.length === 0 ? (
                <AIEmptyState
                  mode="empty"
                  title={dict.volunteersListing?.noAgentsFound || "No candidates found"}
                  description={
                    hasActiveFilters || searchQuery
                      ? (dict.volunteersListing?.tryAdjusting || "Try adjusting your filters or search terms")
                      : (dict.volunteersListing?.checkBackLater || "Check back later for new candidates")
                  }
                  action={
                    (hasActiveFilters || searchQuery) ? (
                      <Button variant="outline" onClick={clearFilters}>
                        {dict.volunteersListing?.clearFilters || "Clear Filters"}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredVolunteers.map((volunteer) => (
                    <VolunteerCard key={volunteer.id} volunteer={volunteer} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {!embed && <Footer />}
    </div>
  )
}
