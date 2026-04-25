"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import LocaleLink from "@/components/locale-link"
import { resolveSkillName } from "@/lib/skills-data"
import { motion, AnimatePresence } from "motion/react"
import {
  MapPin,
  Loader2,
  Search,
  Users,
  Building2,
  Briefcase,
  CheckCircle,
  ArrowRight,
} from "lucide-react"

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: "volunteer" | "ngo" | "opportunity"
  skills?: string[]
  location?: string
  avatar?: string
  verified?: boolean
  matchedField?: string
}

const TYPE_CONFIG = {
  volunteer: {
    icon: Users,
    label: "Candidate",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ngo: {
    icon: Building2,
    label: "NGO",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  opportunity: {
    icon: Briefcase,
    label: "Opportunity",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
} as const

export function OpportunitiesSearchCard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Debounced full search — fires when searchQuery changes
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 1) {
      setResults([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsSearching(true)
      setHasSearched(true)

      try {
        const res = await fetch(
          `/api/unified-search?q=${encodeURIComponent(trimmed)}&types=opportunity&limit=12`,
          { signal: controller.signal }
        )
        const data = await res.json()
        if (data.success && !controller.signal.aborted) {
          // Only show opportunity results — filter out any volunteers/NGOs/blogs
          const opportunityResults = (data.results || []).filter(
            (r: SearchResult) => r.type === "opportunity"
          )
          setResults(opportunityResults)
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Jobs search failed:", err)
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Cleanup
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case "volunteer": return `/volunteers/${result.id}`
      case "ngo": return `/ngos/${result.id}`
      case "opportunity": return `/projects/${result.id}`
      default: return "#"
    }
  }

  return (
    <div className="mb-8">
      <Card>
        <CardContent className="p-4">
          <UnifiedSearchBar
            defaultType="opportunity"
            allowedTypes={["opportunity"]}
            variant="default"
            placeholder="Search by title, skills, or cause..."
            value={searchQuery}
            onSearchChange={setSearchQuery}
            navigateOnSelect
          />
        </CardContent>
      </Card>

      {/* Inline Search Results */}
      <AnimatePresence mode="wait">
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
          >
            {isSearching && results.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-foreground font-medium mb-1">No opportunities found for &quot;{searchQuery}&quot;</p>
                  <p className="text-sm text-muted-foreground">
                    Try different keywords, check spelling, or browse all below
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{results.length}</span> result{results.length !== 1 ? "s" : ""} found
                    {isSearching && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
                  </p>
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <LocaleLink href={`/projects?q=${encodeURIComponent(searchQuery)}`}>
                      View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </LocaleLink>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((result, index) => {
                    const config = TYPE_CONFIG[result.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.opportunity
                    const Icon = config.icon
                    return (
                      <motion.div
                        key={`${result.type}-${result.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      >
                        <LocaleLink
                          href={getResultLink(result)}
                          className="block group"
                        >
                          <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-200 h-full">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="shrink-0">
                                  {result.avatar ? (
                                    <img
                                      src={result.avatar}
                                      alt={result.title}
                                      className="w-10 h-10 rounded-lg object-cover bg-muted"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.badgeClass}`}>
                                      <Icon className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors text-sm">
                                      {result.title}
                                    </h3>
                                    {result.verified && (
                                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                                    )}
                                  </div>
                                  {result.subtitle && (
                                    <p className="text-xs text-muted-foreground truncate mb-1.5">{result.subtitle}</p>
                                  )}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${config.badgeClass}`}>
                                      {config.label}
                                    </Badge>
                                    {result.location && (
                                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {result.location}
                                      </span>
                                    )}
                                  </div>
                                  {result.skills && result.skills.length > 0 && (
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                      {result.skills.slice(0, 2).map((skill) => (
                                        <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
                                          {resolveSkillName(skill)}
                                        </Badge>
                                      ))}
                                      {result.skills.length > 2 && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          +{result.skills.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
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
    </div>
  )
}
