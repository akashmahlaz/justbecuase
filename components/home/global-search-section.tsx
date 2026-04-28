"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import LocaleLink from "@/components/locale-link"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import {
  Search, Users, Building2, Briefcase, ArrowRight, MapPin,
  CheckCircle, Loader2, X, Clock, TrendingUp, Sparkles,
  ChevronRight, ArrowUpRight, Star, Globe, GraduationCap, Lightbulb, Heart,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { resolveSkillName } from "@/lib/skills-data"
import { motion, AnimatePresence } from "motion/react"
import { useDictionary } from "@/components/dictionary-provider"

// ============================================
// TYPES
// ============================================

interface SearchResult {
  type: "volunteer" | "ngo" | "opportunity"
  id: string
  title: string
  subtitle?: string
  description?: string
  location?: string
  skills?: string[]
  score: number
  avatar?: string
  verified?: boolean
  matchedField?: string
  url?: string
  volunteerType?: string
  workMode?: string
  experienceLevel?: string
  rating?: number
  causes?: string[]
  ngoName?: string
  status?: string
}

// ============================================
// CONSTANTS
// ============================================

const RECENT_SEARCHES_KEY = "jb_recent_searches"
const MAX_RECENT_SEARCHES = 5
const DEBOUNCE_RESULTS_MS = 300 // Slightly slower for full results

const POPULAR_SEARCHES = [
  { label: "Web Development", query: "web development", icon: "" },
  { label: "Graphic Design", query: "graphic design", icon: "" },
  { label: "Marketing", query: "marketing", icon: "" },
  { label: "Content Writing", query: "content writing", icon: "" },
  { label: "Data Analysis", query: "data analysis", icon: "" },
  { label: "Education", query: "education", icon: "" },
]

const TYPE_CONFIG = {
  volunteer: {
    icon: Users,
    label: "Candidate",
    pluralLabel: "Candidates",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    viewAllPath: "/volunteers",
  },
  ngo: {
    icon: Building2,
    label: "NGO",
    pluralLabel: "NGOs",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    viewAllPath: "/ngos",
  },
  opportunity: {
    icon: Briefcase,
    label: "Job",
    pluralLabel: "Jobs",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    viewAllPath: "/projects",
  },
  skill: {
    icon: Lightbulb,
    label: "Skill",
    pluralLabel: "Skills",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    viewAllPath: "/volunteers",
  },
  cause: {
    icon: Heart,
    label: "Cause",
    pluralLabel: "Causes",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    viewAllPath: "/projects",
  },
} as const

// Only these types are shown on the home page search
const ALLOWED_TYPES = "volunteer,ngo,opportunity"

// ============================================
// HELPER HOOKS
// ============================================

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) return
    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())]
        .slice(0, MAX_RECENT_SEARCHES)
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try { localStorage.removeItem(RECENT_SEARCHES_KEY) } catch {}
  }, [])

  return { recentSearches, addRecentSearch, clearRecentSearches }
}

// ============================================
// TEXT HIGHLIGHTING
// ============================================

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 1 || !text) return <>{text}</>

  const terms = query.trim().split(/\s+/).filter(Boolean)
  const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi")
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GlobalSearchSection() {
  const router = useRouter()
  const locale = useLocale()
  const dict = useDictionary()
  const s = (dict as any).search || {}

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [searchType, setSearchType] = useState<"all" | "opportunity" | "volunteer" | "ngo">("all")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Recent searches
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches()

  // ============================================
  // SEARCH FUNCTIONS
  // ============================================

  const performSearch = useCallback(async (query: string, type: string) => {
    if (!query || query.trim().length < 1) {
      setResults([])
      setHasSearched(false)
      return
    }

    // Cancel previous search request (race condition fix)
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsSearching(true)
    setHasSearched(true)

    try {
      const types = type === "all" ? `&types=${ALLOWED_TYPES}` : `&types=${type}`
      const res = await fetch(
        `/api/unified-search?q=${encodeURIComponent(query)}${types}&limit=15`,
        { signal: controller.signal }
      )
      const data = await res.json()

      // Only update if this request wasn't cancelled
      if (!controller.signal.aborted) {
        if (data.success) {
          let filtered = (data.results || [])
            .map((r: any) => ({ ...r, type: r.type === "job" ? "opportunity" : r.type }))
            .filter(
              (r: any) => r.type === "volunteer" || r.type === "ngo" || r.type === "opportunity"
            )
          // Strictly enforce the selected type — only show results matching the tab
          if (type !== "all") {
            filtered = filtered.filter((r: any) => r.type === type)
          }
          setResults(filtered)
        } else {
          setResults([])
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Search failed:", error)
        setResults([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [])

  // ============================================
  // DEBOUNCED EFFECTS
  // ============================================

  // Full results (slower debounce - 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(submittedQuery, searchType)
    }, DEBOUNCE_RESULTS_MS)
    return () => clearTimeout(timer)
  }, [submittedQuery, searchType, performSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  const dropdownItems = useMemo(() => {
    const items: Array<{
      type: "suggestion" | "recent" | "popular"
      text: string
      resultType?: string
      id?: string
      subtitle?: string
    }> = []

    if (searchQuery.trim().length < 1) {
      recentSearches.forEach(s => items.push({ type: "recent", text: s }))
    }

    return items
  }, [searchQuery, recentSearches])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || dropdownItems.length === 0) {
      if (e.key === "Escape") {
        setShowDropdown(false)
        inputRef.current?.blur()
      } else if (e.key === "Enter" && searchQuery.trim()) {
        submitSearch(searchQuery)
        setShowDropdown(false)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % dropdownItems.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + dropdownItems.length) % dropdownItems.length)
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < dropdownItems.length) {
          const item = dropdownItems[selectedIndex]
          if (item.type === "suggestion" && item.id) {
            // Navigate directly to result
            handleSuggestionClick(item)
          } else {
            setSearchQuery(item.text)
            submitSearch(item.text)
          }
        } else if (searchQuery.trim()) {
          submitSearch(searchQuery)
        }
        setShowDropdown(false)
        break
      case "Escape":
        setShowDropdown(false)
        inputRef.current?.blur()
        break
    }
  }, [showDropdown, dropdownItems, selectedIndex, searchQuery])

  // Reset selected index when dropdown items change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [dropdownItems])

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const clearSearch = () => {
    setSearchQuery("")
    setSubmittedQuery("")
    setResults([])
    setHasSearched(false)
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  const submitSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      clearSearch()
      return
    }
    setSearchQuery(trimmed)
    setSubmittedQuery(trimmed)
    addRecentSearch(trimmed)
    setShowDropdown(false)
  }

  const handleSuggestionClick = (item: { text: string; resultType?: string; id?: string }) => {
    setSearchQuery(item.text)
    setShowDropdown(false)

    // Skill/cause suggestions (id like "skill:email-marketing" or "cause:education") → just search, don't navigate
    if (item.id?.startsWith("skill:") || item.id?.startsWith("cause:") || item.resultType === "skill" || item.resultType === "cause") {
      submitSearch(item.text)
      return
    }

    addRecentSearch(item.text)

    if (item.id && item.resultType) {
      let path = "/"
      switch (item.resultType) {
        case "volunteer": path = `/volunteers/${item.id}`; break
        case "ngo": path = `/ngos/${item.id}`; break
        case "opportunity": path = `/projects/${item.id}`; break
        default: return // Unknown type — don't navigate to a wrong page
      }
      router.push(localePath(path, locale))
    }
  }

  const handleInputFocus = () => {
    if (searchQuery.trim().length < 1) {
      setShowDropdown(true)
    }
  }

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case "volunteer": return `/volunteers/${result.id}`
      case "ngo": return `/ngos/${result.id}`
      case "opportunity": return result.id.startsWith("ext-") ? `/projects/ext/${result.id.slice(4)}` : `/projects/${result.id}`
      default: return "#"
    }
  }

  // Smart "View All" per type
  const getViewAllLink = () => {
    const query = submittedQuery || searchQuery
    if (searchType !== "all") {
      return `${TYPE_CONFIG[searchType].viewAllPath}?q=${encodeURIComponent(query)}`
    }
    // For "all", link to the most prevalent result type
    const typeCounts = results.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc }, {} as Record<string, number>)
    const topType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] as keyof typeof TYPE_CONFIG
    return topType
      ? `${TYPE_CONFIG[topType].viewAllPath}?q=${encodeURIComponent(query)}`
      : `/projects?q=${encodeURIComponent(query)}`
  }

  const resultQuery = submittedQuery || searchQuery

  // Grouped results by type for categorized display
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    for (const result of results) {
      if (!groups[result.type]) groups[result.type] = []
      groups[result.type].push(result)
    }
    return groups
  }, [results])

  const totalResultCount = results.length

  // ============================================
  // RENDER
  // ============================================

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {s.findTitle || "Save time - just use our Intelligent Search Engine"} <span className="font-extrabold">{s.jbcertaName || "JBCerta"}</span>
            </h2>
            {/* JBCerta AI Branding */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                {s.jbcertaBrand || "Powered by JBCerta AI"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              {s.findSubtitle || "Advanced AI search engine specifically engineered for NGOs and social impact talent"}
            </p>
          </div>

          {/* Search Type Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(["all", "opportunity", "volunteer", "ngo"] as const).map((type) => {
              const isActive = searchType === type
              const config = type !== "all" ? TYPE_CONFIG[type] : null
              const Icon = config?.icon
              return (
                <button
                  key={type}
                  onClick={() => setSearchType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                      : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {type === "all" ? (s.all || "All") : type === "volunteer" ? (s.impactAgents || "Candidates") : type === "ngo" ? (s.ngos || "NGOs") : (s.jobs || "Jobs")}
                </button>
              )
            })}
          </div>

          {/* Search Input with Dropdown */}
          <div ref={containerRef} className="relative mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  searchType === "volunteer"
                    ? (s.placeholderVolunteer || "Search skills, location, or name...")
                    : searchType === "ngo"
                    ? (s.placeholderNgo || "Search organizations...")
                    : searchType === "opportunity"
                    ? (s.placeholderOpportunity || "Search jobs...")
                    : (s.placeholderAll || "Search jobs, skills, people, causes...")
                }
                value={searchQuery}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setSearchQuery(nextValue)
                  if (!nextValue.trim()) {
                    setSubmittedQuery("")
                    setResults([])
                    setHasSearched(false)
                  }
                  setShowDropdown(nextValue.trim().length < 1)
                }}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                aria-label="Search"
                aria-expanded={showDropdown}
                aria-haspopup="listbox"
                aria-autocomplete="list"
                role="combobox"
                className="h-14 w-full pl-12 pr-32 text-lg rounded-xl border-2 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 placeholder:text-muted-foreground"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => submitSearch(searchQuery)}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                  aria-label="Search"
                >
                  {s.search || "Search"}
                </button>
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  role="listbox"
                  className="absolute z-50 mt-1 max-h-100 w-full overflow-y-auto overflow-hidden rounded-xl border border-border bg-background shadow-xl"
                >
                  {/* Recent Searches (when input is empty and focused) */}
                  {searchQuery.trim().length < 1 && recentSearches.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {s.recentSearches || "Recent Searches"}
                        </span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {s.clearAll || "Clear All"}
                        </button>
                      </div>
                      {recentSearches.map((search, index) => {
                        const isSelected = selectedIndex === index
                        return (
                          <button
                            key={search}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSearchQuery(search)
                              submitSearch(search)
                              setShowDropdown(false)
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                              isSelected ? "bg-primary/10" : "hover:bg-muted"
                            }`}
                          >
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate">{search}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Popular searches (when no recent and no query) */}
                  {searchQuery.trim().length < 1 && recentSearches.length === 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3" />
                        {s.trendingSearches || "Trending Searches"}
                      </div>
                      {POPULAR_SEARCHES.map((item, index) => {
                        const isSelected = selectedIndex === index
                        return (
                          <button
                            key={item.query}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setSearchQuery(item.query)
                              submitSearch(item.query)
                              setShowDropdown(false)
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                              isSelected ? "bg-primary/10" : "hover:bg-muted"
                            }`}
                          >
                            <span className="text-base">{item.icon}</span>
                            <span className="text-sm flex-1">{item.label}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Search Tags (only when not searched yet) */}
          {!hasSearched && searchQuery.trim().length < 1 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="text-sm text-muted-foreground mr-1">{s.popular || "Popular:"}</span>
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item.query}
                  onClick={() => {
                    setSearchQuery(item.query)
                    setShowDropdown(false)
                    submitSearch(item.query)
                  }}
                  className="px-3 py-1 text-sm rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-all duration-200 hover:shadow-sm"
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          <AnimatePresence mode="wait">
            {hasSearched && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-6"
              >
                {/* Loading skeletons */}
                {isSearching && results.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="p-4 bg-background rounded-xl border">
                        <div className="flex items-start gap-3">
                          <Skeleton className="w-12 h-12 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <div className="flex gap-1">
                              <Skeleton className="h-5 w-16 rounded-full" />
                              <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  /* Empty state */
                  <div className="text-center py-12 bg-background rounded-xl border">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-foreground font-medium mb-2">{s.noResultsFor || "No results found for"} &quot;{resultQuery}&quot;</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {s.tryDifferent || "Try different keywords, check spelling, or browse categories"}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <LocaleLink href="/projects">{s.browseOpportunities || "Browse Jobs"}</LocaleLink>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <LocaleLink href="/volunteers">{s.browseImpactAgents || "Browse Candidates"}</LocaleLink>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <LocaleLink href="/ngos">{s.browseNGOs || "Browse NGOs"}</LocaleLink>
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Results */
                  <>
                    {/* Results header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{totalResultCount}</span> {totalResultCount !== 1 ? (s.results || "results") : (s.result || "result")}
                          {isSearching && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
                        </p>
                        {/* Category pills showing counts */}
                        <div className="hidden sm:flex items-center gap-1.5">
                          {Object.entries(groupedResults).map(([type, items]) => {
                            const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.opportunity
                            return (
                              <Badge key={type} variant="secondary" className={`text-xs ${config.badgeClass}`}>
                                {config.pluralLabel}: {items.length}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="text-primary">
                        <LocaleLink href={getViewAllLink()}>
                          {s.viewAll || "View All"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </LocaleLink>
                      </Button>
                    </div>

                    {/* Results grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {results.map((result, index) => {
                        const config = TYPE_CONFIG[result.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.opportunity
                        const Icon = config.icon
                        // Format work mode label
                        const workModeLabel = result.workMode === "remote" ? (s.remote || "Remote") : result.workMode === "onsite" ? (s.onsite || "On-site") : result.workMode === "hybrid" ? (s.hybrid || "Hybrid") : null
                        // Format volunteer type label
                        const pricingLabel = result.volunteerType === "free" ? (s.proBono || "Pro Bono") : result.volunteerType === "paid" ? (s.paid || "Paid") : null
                        // Format experience level label
                        const expLabel = result.experienceLevel === "expert" ? (s.expert || "Expert") : result.experienceLevel === "advanced" ? (s.advanced || "Advanced") : result.experienceLevel === "intermediate" ? (s.intermediate || "Intermediate") : result.experienceLevel === "beginner" ? (s.beginner || "Beginner") : null
                        const expColor = result.experienceLevel === "expert" ? "border-violet-300 text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20" : result.experienceLevel === "advanced" ? "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20" : result.experienceLevel === "intermediate" ? "border-cyan-300 text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20" : "border-slate-300 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20"
                        // Description snippet — strip HTML and truncate
                        const descSnippet = result.description
                          ? result.description.replace(/<[^>]*>/g, "").substring(0, 100).trim() + (result.description.length > 100 ? "…" : "")
                          : null
                        return (
                          <motion.div
                            key={`${result.type}-${result.id}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.3) }}
                          >
                            <LocaleLink
                              href={getResultLink(result)}
                              onClick={() => addRecentSearch(resultQuery)}
                              className="block bg-background rounded-xl border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group h-full overflow-hidden"
                            >
                              {/* Card Header — type badge strip */}
                              <div className={`px-4 py-1.5 flex items-center justify-between border-b ${
                                result.type === "volunteer" ? "bg-blue-50 dark:bg-blue-950/20" :
                                result.type === "ngo" ? "bg-green-50 dark:bg-green-950/20" :
                                "bg-purple-50 dark:bg-purple-950/20"
                              }`}>
                                <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 font-medium ${config.badgeClass}`}>
                                  <Icon className="h-2.5 w-2.5 mr-1" />
                                  {config.label}
                                </Badge>
                                <div className="flex items-center gap-1.5">
                                  {workModeLabel && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <Globe className="h-2.5 w-2.5" />
                                      {workModeLabel}
                                    </span>
                                  )}
                                  {pricingLabel && (
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pricingLabel === "Pro Bono" ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-amber-300 text-amber-700 dark:text-amber-400"}`}>
                                      {pricingLabel}
                                    </Badge>
                                  )}
                                  {expLabel && (
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-0.5 ${expColor}`}>
                                      <GraduationCap className="h-2.5 w-2.5" />
                                      {expLabel}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="p-4">
                                <div className="flex items-start gap-3">
                                  {/* Avatar/Icon */}
                                  <div className="shrink-0">
                                    {result.avatar ? (
                                      <img
                                        src={result.avatar}
                                        alt={result.title}
                                        className="w-12 h-12 rounded-full object-cover bg-muted ring-2 ring-background shadow-sm"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none"
                                          const parent = (e.target as HTMLImageElement).parentElement
                                          if (parent) {
                                            parent.innerHTML = `<div class="w-12 h-12 rounded-full flex items-center justify-center ${config.badgeClass} ring-2 ring-background shadow-sm"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>`
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.badgeClass} ring-2 ring-background shadow-sm`}>
                                        <Icon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    {/* Title + verified */}
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm">
                                        <HighlightedText text={result.title} query={resultQuery} />
                                      </h3>
                                      {result.verified && (
                                        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" fill="currentColor" strokeWidth={0} />
                                      )}
                                    </div>

                                    {/* Subtitle / headline */}
                                    {result.subtitle && (
                                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                        <HighlightedText text={result.subtitle} query={resultQuery} />
                                      </p>
                                    )}

                                    {/* Location + Rating row */}
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                      {result.location && (
                                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                                          <HighlightedText text={result.location} query={resultQuery} />
                                        </span>
                                      )}
                                      {result.rating && result.rating > 0 && (
                                        <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 font-medium">
                                          <Star className="h-2.5 w-2.5 fill-current" />
                                          {result.rating.toFixed(1)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Description snippet */}
                                {descSnippet && (
                                  <p className="text-[11px] text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">
                                    {descSnippet}
                                  </p>
                                )}

                                {/* Skills */}
                                {result.skills && result.skills.length > 0 && (
                                  <div className="flex gap-1 mt-2.5 flex-wrap">
                                    {result.skills.slice(0, 3).map((skill) => (
                                      <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal bg-muted/50">
                                        {resolveSkillName(skill)}
                                      </Badge>
                                    ))}
                                    {result.skills.length > 3 && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal text-muted-foreground">
                                        +{result.skills.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Causes (for NGOs/opportunities) */}
                                {result.causes && result.causes.length > 0 && !result.skills?.length && (
                                  <div className="flex gap-1 mt-2.5 flex-wrap">
                                    {result.causes.slice(0, 3).map((cause) => (
                                      <Badge key={cause} variant="outline" className="text-[10px] px-1.5 py-0.5 font-normal bg-muted/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                                        {cause}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </LocaleLink>
                          </motion.div>
                        )
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
