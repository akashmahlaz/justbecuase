"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { useDictionary } from "@/components/dictionary-provider"
import { motion, AnimatePresence } from "motion/react"
import {
  Search,
  X,
  Loader2,
  Clock,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Users,
  Building2,
  Briefcase,
  MapPin,
  CheckCircle,
  FileText,
  BookOpen,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { searchClient, ALGOLIA_ENABLED } from "@/components/algolia-provider"

// ============================================
// TYPES
// ============================================

interface SearchSuggestion {
  text: string
  type: "volunteer" | "ngo" | "opportunity" | "blog" | "page" | "skill" | "cause"
  id: string
  subtitle?: string
}

export interface UnifiedSearchBarProps {
  /** Pre-filter suggestions by type */
  defaultType?: "all" | "opportunity" | "volunteer" | "ngo" | "blog" | "page"
  /** Restrict search to only these types (overrides defaultType when set) */
  allowedTypes?: ("opportunity" | "volunteer" | "ngo" | "blog" | "page")[]
  /** Visual variant */
  variant?: "default" | "compact" | "hero"
  /** Custom placeholder */
  placeholder?: string
  /** Callback when search query changes (for pages with their own filtering) */
  onSearchChange?: (query: string) => void
  /** External controlled value */
  value?: string
  /** Whether clicking a suggestion navigates to the result page */
  navigateOnSelect?: boolean
  /** Auto-focus the input */
  autoFocus?: boolean
  /** Additional className */
  className?: string
  /** Show popular tags below the search bar */
  showPopularTags?: boolean
  /** Callback when user submits the search (Enter without selecting a suggestion) */
  onSubmit?: (query: string) => void
  /** Disable the suggestions/autocomplete dropdown entirely */
  disableSuggestions?: boolean
}

// ============================================
// CONSTANTS
// ============================================

const RECENT_SEARCHES_KEY = "jbc_recent_searches"
const MAX_RECENT_SEARCHES = 5
const DEBOUNCE_MS = 400 // Longer debounce — user must pause before suggestions fire

const POPULAR_SEARCHES_KEYS = [
  { labelKey: "webDevelopment" as const, query: "web development", icon: "💻" },
  { labelKey: "graphicDesign" as const, query: "graphic design", icon: "🎨" },
  { labelKey: "marketing" as const, query: "marketing", icon: "📈" },
  { labelKey: "contentWriting" as const, query: "content writing", icon: "✍️" },
  { labelKey: "dataAnalysis" as const, query: "data analysis", icon: "📊" },
  { labelKey: "education" as const, query: "education", icon: "📚" },
]

const TYPE_CONFIG_BASE = {
  volunteer: {
    icon: Users,
    labelKey: "impactAgent" as const,
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ngo: {
    icon: Building2,
    labelKey: "ngo" as const,
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  opportunity: {
    icon: Briefcase,
    labelKey: "opportunity" as const,
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  blog: {
    icon: BookOpen,
    labelKey: "blog" as const,
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  page: {
    icon: FileText,
    labelKey: "page" as const,
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  },
  skill: {
    icon: Sparkles,
    labelKey: "skill" as const,
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  cause: {
    icon: TrendingUp,
    labelKey: "cause" as const,
    badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  },
} as const

// ============================================
// RECENT SEARCHES HOOK
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
  if (!query || query.trim().length < 1 || !text) return <>{text}</>
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return <>{text}</>
  const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 text-foreground rounded-sm px-0.5">{part}</mark>
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

export function UnifiedSearchBar({
  defaultType = "all",
  allowedTypes,
  variant = "default",
  placeholder,
  onSearchChange,
  value: externalValue,
  navigateOnSelect = true,
  autoFocus = false,
  className = "",
  showPopularTags = false,
  onSubmit,
  disableSuggestions = true,
}: UnifiedSearchBarProps) {
  const router = useRouter()
  const locale = useLocale()
  const dict = useDictionary()
  const s = dict.search || {} as any

  // Build translated popular searches and type config
  const POPULAR_SEARCHES = useMemo(() =>
    POPULAR_SEARCHES_KEYS.map(item => ({
      ...item,
      label: (s as any)[item.labelKey] || item.labelKey,
    })),
    [s]
  )

  const getTypeLabel = useCallback((key: string) => {
    return (s as any)[key] || key
  }, [s])

  // Search state
  const isControlled = externalValue !== undefined
  const [internalQuery, setInternalQuery] = useState("")
  const searchQuery = isControlled ? externalValue : internalQuery

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestionsAbortRef = useRef<AbortController | null>(null)

  // Recent searches
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches()

  // ============================================
  // QUERY SETTER
  // ============================================

  const setSearchQuery = useCallback((val: string) => {
    if (!isControlled) {
      setInternalQuery(val)
    }
    onSearchChange?.(val)
  }, [isControlled, onSearchChange])

  // ============================================
  // FETCH SUGGESTIONS
  // ============================================

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([])
      return
    }

    suggestionsAbortRef.current?.abort()
    const controller = new AbortController()
    suggestionsAbortRef.current = controller

    setIsSuggestionsLoading(true)
    const t0 = performance.now()
    console.log(`\n🔍 [SearchBar] ========== SUGGESTION REQUEST ==========`)
    console.log(`🔍 [SearchBar] Query: "${query}"`)
    console.log(`🔍 [SearchBar] ALGOLIA_ENABLED: ${ALGOLIA_ENABLED}, searchClient: ${!!searchClient}`)
    console.log(`🔍 [SearchBar] defaultType: ${defaultType}, allowedTypes: ${JSON.stringify(allowedTypes)}`)
    try {
      // ---- ALGOLIA DIRECT CLIENT-SIDE SEARCH (~20-50ms) ----
      if (ALGOLIA_ENABLED && searchClient) {
        console.log(`🟢 [SearchBar] Using ALGOLIA client-side search`)
        // Determine which indexes to search
        const indexNames: string[] = []
        const effectiveTypes = allowedTypes && allowedTypes.length > 0
          ? allowedTypes
          : defaultType !== "all" ? [defaultType] : ["volunteer", "ngo", "opportunity"]

        if (effectiveTypes.includes("volunteer")) indexNames.push("jbc_volunteers")
        if (effectiveTypes.includes("ngo")) indexNames.push("jbc_ngos")
        if (effectiveTypes.includes("opportunity")) indexNames.push("jbc_opportunities")

        console.log(`🟢 [SearchBar] Searching indexes: [${indexNames.join(", ")}]`)
        console.log(`🟢 [SearchBar] Effective types: [${effectiveTypes.join(", ")}]`)

        const requests = indexNames.map(indexName => ({
          indexName,
          query: query.trim(),
          hitsPerPage: 3,
          attributesToRetrieve: ["objectID", "type", "name", "orgName", "title", "headline", "skillNames", "causeNames", "city", "workMode", "location", "description"],
          attributesToHighlight: [],
        }))

        console.log(`🟢 [SearchBar] Sending ${requests.length} multi-index requests to Algolia...`)
        const algoliaT0 = performance.now()
        const { results } = await searchClient.search({ requests })
        const algoliaMs = (performance.now() - algoliaT0).toFixed(1)
        console.log(`🟢 [SearchBar] Algolia responded in ${algoliaMs}ms — ${results.length} index results`)

        if (controller.signal.aborted) {
          console.log(`⚠️ [SearchBar] Request was aborted, discarding results`)
          return
        }

        const algSuggestions: SearchSuggestion[] = []
        for (const indexResult of results) {
          if (!("hits" in indexResult)) {
            console.log(`⚠️ [SearchBar] Index result has no hits:`, indexResult)
            continue
          }
          const ir = indexResult as any
          console.log(`🟢 [SearchBar] Index "${ir.index}": ${ir.nbHits} total hits, ${ir.hits.length} returned, query="${ir.query}", processingTimeMS=${ir.processingTimeMS}ms`)

          for (const hit of indexResult.hits as any[]) {
            const type = hit.type || (ir.index?.includes("volunteer") ? "volunteer" : ir.index?.includes("ngo") ? "ngo" : "opportunity")
            let text = hit.name || hit.orgName || hit.title || ""
            let subtitle = ""
            if (type === "opportunity") {
              text = hit.title || ""
              subtitle = [hit.workMode === "remote" ? "Remote" : hit.location, hit.skillNames?.slice(0, 2).join(", ")].filter(Boolean).join(" · ")
            } else if (type === "ngo") {
              text = hit.name || hit.orgName || ""
              subtitle = hit.description?.slice(0, 60) || "Organization"
            } else {
              subtitle = hit.headline || hit.skillNames?.slice(0, 3).join(", ") || ""
            }
            console.log(`   📌 [${type}] "${text}" — ${subtitle || "(no subtitle)"} [id: ${hit.objectID}]`)
            algSuggestions.push({ text, type, id: hit.objectID, subtitle })
          }
        }
        const finalSuggestions = algSuggestions.slice(0, 8)
        const totalMs = (performance.now() - t0).toFixed(1)
        console.log(`🟢 [SearchBar] ✅ DONE — ${finalSuggestions.length} suggestions in ${totalMs}ms (Algolia: ${algoliaMs}ms)`)
        console.log(`🔍 [SearchBar] ==========================================\n`)
        setSuggestions(finalSuggestions)
        setIsSuggestionsLoading(false)
        return
      }

      // ---- FALLBACK: API route (ES/MongoDB) ----
      console.log(`🟡 [SearchBar] Using FALLBACK API route (Algolia not available)`)
      let typeParam = ""
      if (allowedTypes && allowedTypes.length > 0) {
        typeParam = `&types=${allowedTypes.join(",")}`
      } else if (defaultType !== "all") {
        typeParam = `&types=${defaultType}`
      }
      const url = `/api/unified-search?q=${encodeURIComponent(query)}&mode=suggestions&limit=6${typeParam}`
      console.log(`🟡 [SearchBar] Fetching: ${url}`)
      const res = await fetch(url, { signal: controller.signal })
      const data = await res.json()
      const totalMs = (performance.now() - t0).toFixed(1)
      console.log(`🟡 [SearchBar] API responded: success=${data.success}, ${data.suggestions?.length || 0} suggestions, engine=${data.engine}, took=${totalMs}ms`)
      if (data.suggestions) {
        for (const s of data.suggestions) {
          console.log(`   📌 [${s.type}] "${s.text}" — ${s.subtitle || "(no subtitle)"}`)
        }
      }
      console.log(`🔍 [SearchBar] ==========================================\n`)
      if (data.success && !controller.signal.aborted) {
        setSuggestions(data.suggestions || [])
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const totalMs = (performance.now() - t0).toFixed(1)
        console.error(`❌ [SearchBar] Suggestions fetch FAILED after ${totalMs}ms:`, error)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSuggestionsLoading(false)
      }
    }
  }, [defaultType, allowedTypes])

  // ============================================
  // EFFECTS
  // ============================================

  // Suggestions debounce — require 3+ chars and a typing pause to reduce noise.
  // When onSearchChange is provided, the parent page runs its own full search,
  // so suggestions should only fire when the user explicitly pauses.
  // After the user has submitted (Enter), suggestions are suppressed until
  // the query changes (i.e. the user starts typing something new).
  useEffect(() => {
    if (disableSuggestions || hasSubmitted) return
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 3) {
        fetchSuggestions(searchQuery)
        setShowDropdown(true)
      } else {
        setSuggestions([])
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchSuggestions, disableSuggestions, hasSubmitted])

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

  // Cleanup
  useEffect(() => {
    return () => { suggestionsAbortRef.current?.abort() }
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

    if (searchQuery.trim().length >= 3 && suggestions.length > 0) {
      suggestions.forEach(s => items.push({
        type: "suggestion",
        text: s.text,
        resultType: s.type,
        id: s.id,
        subtitle: s.subtitle,
      }))
    } else if (searchQuery.trim().length < 3) {
      recentSearches.forEach(s => items.push({ type: "recent", text: s }))
    }

    return items
  }, [searchQuery, suggestions, recentSearches])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || dropdownItems.length === 0) {
      if (e.key === "Escape") {
        setShowDropdown(false)
        inputRef.current?.blur()
      } else if (e.key === "Enter" && searchQuery.trim()) {
        e.preventDefault()
        setHasSubmitted(true)
        setShowDropdown(false)
        setSuggestions([])
        addRecentSearch(searchQuery)
        onSubmit?.(searchQuery.trim())
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
        setHasSubmitted(true)
        setShowDropdown(false)
        setSuggestions([])
        if (selectedIndex >= 0 && selectedIndex < dropdownItems.length) {
          const item = dropdownItems[selectedIndex]
          if (item.type === "suggestion" && item.id) {
            handleSuggestionClick(item)
          } else {
            setSearchQuery(item.text)
            addRecentSearch(item.text)
          }
        } else if (searchQuery.trim()) {
          addRecentSearch(searchQuery)
          onSubmit?.(searchQuery.trim())
        }
        break
      case "Tab":
        // Tab accepts the first suggestion as autocomplete
        if (suggestions.length > 0) {
          e.preventDefault()
          const target = selectedIndex >= 0 ? dropdownItems[selectedIndex] : dropdownItems[0]
          if (target) {
            setSearchQuery(target.text)
            setShowDropdown(false)
          }
        }
        break
      case "Escape":
        setShowDropdown(false)
        inputRef.current?.blur()
        break
    }
  }, [showDropdown, dropdownItems, selectedIndex, searchQuery, suggestions, addRecentSearch, setSearchQuery, onSubmit])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [dropdownItems])

  // ============================================
  // HANDLERS
  // ============================================

  const clearSearch = () => {
    setSearchQuery("")
    setSuggestions([])
    setShowDropdown(false)
    setHasSubmitted(false)
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (item: { text: string; resultType?: string; id?: string }) => {
    setSearchQuery(item.text)
    addRecentSearch(item.text)
    setShowDropdown(false)

    // Skill/cause suggestions → just search, don't navigate
    if (item.id?.startsWith("skill:") || item.id?.startsWith("cause:")) {
      return
    }

    if (navigateOnSelect && item.id && item.resultType) {
      let path = "/"
      switch (item.resultType) {
        case "volunteer": path = `/volunteers/${item.id}`; break
        case "ngo": path = `/ngos/${item.id}`; break
        case "job": path = `/projects/${item.id}`; break
        case "blog": path = `/blog/${item.id}`; break
        case "page": path = item.id.startsWith("/") ? item.id : `/${item.id}`; break
        default: return // Unknown type — don't navigate to a wrong page
      }
      router.push(localePath(path, locale))
    }
  }

  const handleInputFocus = () => {
    if (disableSuggestions || hasSubmitted) return
    if (searchQuery.trim().length >= 3 || recentSearches.length > 0) {
      setShowDropdown(true)
    }
  }

  // ============================================
  // VARIANT STYLES
  // ============================================

  const inputStyles = {
    default: "h-12 w-full pl-11 pr-20 text-base rounded-xl border-2 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 placeholder:text-muted-foreground",
    compact: "h-10 w-full pl-9 pr-16 text-sm rounded-lg border bg-muted/50 border-border focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all duration-200 placeholder:text-muted-foreground",
    hero: "h-14 w-full pl-12 pr-24 text-lg rounded-xl border-2 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 placeholder:text-muted-foreground",
  }

  const iconStyles = {
    default: "absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none z-10",
    compact: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10",
    hero: "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10",
  }

  const defaultPlaceholder = defaultType === "volunteer"
    ? s.placeholderVolunteer || "Search skills, location, or name..."
    : defaultType === "ngo"
    ? s.placeholderNgo || "Search organizations..."
    : defaultType === "opportunity"
    ? s.placeholderOpportunity || "Search jobs..."
    : s.placeholderDefault || "Search volunteers, Enterprises, jobs, blog, anything..."

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={className}>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className={iconStyles[variant]} />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder || defaultPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              // User is actively typing — re-enable suggestions
              setHasSubmitted(false)
            }}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoFocus={autoFocus}
            aria-label="Search"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
            className={inputStyles[variant]}
          />
          <div className={`absolute ${variant === "compact" ? "right-2" : "right-3"} top-1/2 -translate-y-1/2 flex items-center gap-1`}>
            {isSuggestionsLoading && (
              <Loader2 className={`${variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} animate-spin text-primary`} />
            )}
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className={`${variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
              </button>
            )}
            {variant !== "compact" && (
              <button
                onClick={() => {
                  if (searchQuery.trim()) {
                    setHasSubmitted(true)
                    setSuggestions([])
                    addRecentSearch(searchQuery)
                    setShowDropdown(false)
                    onSubmit?.(searchQuery.trim())
                  }
                }}
                className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              ref={undefined}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              role="listbox"
              className="absolute z-[60] w-full mt-1 bg-background border border-border rounded-xl shadow-xl overflow-hidden max-h-[400px] overflow-y-auto"
            >
              {/* Suggestions (when typing) */}
              {searchQuery.trim().length >= 3 && (
                <>
                  {isSuggestionsLoading && suggestions.length === 0 && (
                    <div className="p-3 space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                          <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                        </div>
                      ))}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        {s.suggestions || "Suggestions"}
                      </div>
                      {suggestions.map((suggestion, index) => {
                        const config = TYPE_CONFIG_BASE[suggestion.type as keyof typeof TYPE_CONFIG_BASE] ?? TYPE_CONFIG_BASE.page
                        const Icon = config.icon
                        const isSelected = selectedIndex === index
                        return (
                          <button
                            key={`${suggestion.type}-${suggestion.id}`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSuggestionClick({
                              text: suggestion.text,
                              resultType: suggestion.type,
                              id: suggestion.id,
                            })}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                              isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted text-foreground"
                            }`}
                          >
                            <div className={`p-1 rounded ${config.badgeClass}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                <HighlightedText text={suggestion.text} query={searchQuery} />
                              </p>
                              {suggestion.subtitle && (
                                <p className="text-xs text-muted-foreground truncate">{suggestion.subtitle}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className={`text-[10px] shrink-0 ${config.badgeClass}`}>
                              {getTypeLabel(config.labelKey)}
                            </Badge>
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </button>
                        )
                      })}

                      {/* Full search option */}
                      <button
                        onClick={() => {
                          addRecentSearch(searchQuery)
                          setShowDropdown(false)
                        }}
                        className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-muted border-t border-border"
                      >
                        <Search className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {s.searchFor || "Search for"} &quot;<span className="font-semibold text-primary">{searchQuery}</span>&quot;
                        </span>
                      </button>
                    </div>
                  )}

                  {!isSuggestionsLoading && suggestions.length === 0 && searchQuery.trim().length >= 3 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {s.noSuggestions || "No suggestions found. Press Enter to search."}
                    </div>
                  )}
                </>
              )}

              {/* Recent Searches */}
              {searchQuery.trim().length < 3 && recentSearches.length > 0 && (
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

              {/* Popular searches */}
              {searchQuery.trim().length < 3 && recentSearches.length === 0 && (
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

      {/* Popular Tags (optional) */}
      {showPopularTags && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <span className="text-sm text-muted-foreground mr-1">{s.popular || "Popular:"}</span>
          {POPULAR_SEARCHES.map((item) => (
            <button
              key={item.query}
              onClick={() => {
                setSearchQuery(item.query)
                setShowDropdown(false)
                addRecentSearch(item.query)
              }}
              className="text-sm px-3 py-1 rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-all duration-200 hover:shadow-sm"
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
