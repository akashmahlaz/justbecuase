"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import LocaleLink from "@/components/locale-link"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import {
  Search, Users, Building2, Briefcase, ArrowRight, MapPin,
  CheckCircle, Loader2, X, Clock, Sparkles,
  Star, Globe, Lightbulb, Heart,
  Send, Paperclip, RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea"
import { cn } from "@/lib/utils"
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
    label: "Impact Agent",
    pluralLabel: "Impact Agents",
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
    label: "Opportunity",
    pluralLabel: "Opportunities",
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
    } catch (err) {
      // localStorage may be unavailable in private browsing
    }
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
// RESULT CARD (compact, used inside chat messages)
// ============================================

function ResultCard({ result, query, onClick }: { result: SearchResult; query: string; onClick: () => void }) {
  const config = TYPE_CONFIG[result.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.opportunity
  const Icon = config.icon
  const workModeLabel = result.workMode === "remote" ? "Remote" : result.workMode === "onsite" ? "On-site" : result.workMode === "hybrid" ? "Hybrid" : null
  const pricingLabel = result.volunteerType === "free" ? "Pro Bono" : result.volunteerType === "paid" ? "Paid" : null
  const descSnippet = result.description
    ? result.description.replace(/<[^>]*>/g, "").substring(0, 90).trim() + (result.description.length > 90 ? "…" : "")
    : null

  const href =
    result.type === "volunteer" ? `/volunteers/${result.id}` :
    result.type === "ngo" ? `/ngos/${result.id}` :
    result.type === "opportunity" ? `/projects/${result.id}` : "#"

  return (
    <LocaleLink
      href={href}
      onClick={onClick}
      className="group block bg-background rounded-xl border hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className={`px-3 py-1 flex items-center justify-between border-b ${
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
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            {result.avatar ? (
              <img
                src={result.avatar}
                alt={result.title}
                className="w-10 h-10 rounded-full object-cover bg-muted ring-2 ring-background shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.badgeClass} ring-2 ring-background shadow-sm`}>
                <Icon className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm">
                <HighlightedText text={result.title} query={query} />
              </h3>
              {result.verified && (
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" fill="currentColor" strokeWidth={0} />
              )}
            </div>
            {result.subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                <HighlightedText text={result.subtitle} query={query} />
              </p>
            )}
            <div className="flex items-center gap-2.5 flex-wrap">
              {result.location && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  <HighlightedText text={result.location} query={query} />
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
        {descSnippet && (
          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {descSnippet}
          </p>
        )}
        {result.skills && result.skills.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
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
      </div>
    </LocaleLink>
  )
}

// ============================================
// CHAT TYPES
// ============================================

type SearchTypeFilter = "all" | "opportunity" | "volunteer" | "ngo"

// Inline AI-style cycling loader (compact, with shimmer gradient)
function CyclingLoader({ texts, interval = 1400 }: { texts: string[]; interval?: number }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % texts.length), interval)
    return () => clearInterval(t)
  }, [texts.length, interval])
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{
            opacity: 1,
            y: 0,
            backgroundPosition: ["200% center", "-200% center"],
          }}
          exit={{ opacity: 0, y: -6 }}
          transition={{
            opacity: { duration: 0.25 },
            y: { duration: 0.25 },
            backgroundPosition: {
              duration: 2.2,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            },
          }}
          className="inline-block bg-size-[200%_100%] bg-linear-to-r from-foreground via-muted-foreground to-foreground bg-clip-text text-transparent text-sm font-medium"
        >
          {texts[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

type ChatMessage =
  | { id: string; role: "user"; query: string; type: SearchTypeFilter }
  | { id: string; role: "assistant"; query: string; type: SearchTypeFilter; status: "loading" | "done" | "error"; results: SearchResult[]; error?: string }

// ============================================
// AI-style natural-language summary builder
// ============================================

function buildAssistantSummary(query: string, results: SearchResult[]): string {
  if (results.length === 0) return ""
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1
    return acc
  }, {})
  const parts: string[] = []
  if (counts.volunteer) parts.push(`${counts.volunteer} ${counts.volunteer === 1 ? "impact agent" : "impact agents"}`)
  if (counts.ngo) parts.push(`${counts.ngo} ${counts.ngo === 1 ? "NGO" : "NGOs"}`)
  if (counts.opportunity) parts.push(`${counts.opportunity} ${counts.opportunity === 1 ? "opportunity" : "opportunities"}`)

  const topSkills = Array.from(
    results.flatMap((r) => r.skills || []).reduce<Map<string, number>>((m, s) => {
      m.set(s, (m.get(s) || 0) + 1)
      return m
    }, new Map())
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([s]) => resolveSkillName(s))

  const topLocations = Array.from(
    results.map((r) => r.location).filter((l): l is string => !!l).reduce<Map<string, number>>((m, l) => {
      m.set(l, (m.get(l) || 0) + 1)
      return m
    }, new Map())
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([l]) => l)

  let line = `I found ${parts.join(", ")} matching \u201C${query}\u201D.`
  if (topSkills.length > 0) line += ` Top skills: ${topSkills.join(", ")}.`
  if (topLocations.length > 0) line += ` Mostly in ${topLocations.join(" and ")}.`
  return line
}

// ============================================
// MAIN COMPONENT — JBCerta Chat
// ============================================

export function GlobalSearchSection() {
  const router = useRouter()
  const locale = useLocale()
  const dict = useDictionary()
  const s = (dict as any).search || {}

  const [searchType, setSearchType] = useState<SearchTypeFilter>("all")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 200 })
  const [isFocused, setIsFocused] = useState(false)

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages])

  // Cleanup all in-flight requests on unmount
  useEffect(() => {
    const controllers = abortControllersRef.current
    return () => {
      controllers.forEach((c) => c.abort())
      controllers.clear()
    }
  }, [])

  const runQuery = useCallback(async (query: string, type: SearchTypeFilter) => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length > 200) return

    const userId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", query: trimmed, type },
      { id: assistantId, role: "assistant", query: trimmed, type, status: "loading", results: [] },
    ])

    addRecentSearch(trimmed)

    const controller = new AbortController()
    abortControllersRef.current.set(assistantId, controller)

    try {
      const types = type === "all" ? `&types=${ALLOWED_TYPES}` : `&types=${type}`
      const res = await fetch(
        `/api/unified-search?q=${encodeURIComponent(trimmed)}${types}&limit=15`,
        { signal: controller.signal }
      )
      const data = await res.json()
      if (controller.signal.aborted) return

      let filtered: SearchResult[] = (data.results || []).filter(
        (r: any) => r.type === "volunteer" || r.type === "ngo" || r.type === "opportunity"
      )
      if (type !== "all") filtered = filtered.filter((r: any) => r.type === type)

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === "assistant"
            ? { ...m, status: "done", results: filtered }
            : m
        )
      )
    } catch (error: any) {
      if (error.name === "AbortError") return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === "assistant"
            ? { ...m, status: "error", results: [], error: "Search failed. Please try again." }
            : m
        )
      )
    } finally {
      abortControllersRef.current.delete(assistantId)
    }
  }, [addRecentSearch])

  const handleSubmit = useCallback(() => {
    const v = inputValue.trim()
    if (!v) return
    setInputValue("")
    adjustHeight(true)
    runQuery(v, searchType)
  }, [inputValue, searchType, runQuery, adjustHeight])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleResetChat = () => {
    abortControllersRef.current.forEach((c) => c.abort())
    abortControllersRef.current.clear()
    setMessages([])
  }

  const getViewAllLink = (msg: Extract<ChatMessage, { role: "assistant" }>) => {
    if (msg.type !== "all") {
      return `${TYPE_CONFIG[msg.type].viewAllPath}?q=${encodeURIComponent(msg.query)}`
    }
    const counts = msg.results.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    }, {})
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] as keyof typeof TYPE_CONFIG | undefined
    return top
      ? `${TYPE_CONFIG[top].viewAllPath}?q=${encodeURIComponent(msg.query)}`
      : `/projects?q=${encodeURIComponent(msg.query)}`
  }

  const hasMessages = messages.length > 0

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          {/* Header — preserved */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {s.findTitle || "Save time - just use our Intelligent Search Engine"}{" "}
              <span className="font-extrabold">{s.jbcertaName || "JBCerta"}</span>
            </h2>
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

          {/* Type tabs — controls the next query */}
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
                  {type === "all" ? (s.all || "All") : type === "volunteer" ? (s.impactAgents || "Impact Agents") : type === "ngo" ? (s.ngos || "NGOs") : (s.opportunities || "Opportunities")}
                </button>
              )
            })}
          </div>

          {/* Chat surface */}
          <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
            {/* Messages feed */}
            {hasMessages ? (
              <div className="max-h-[60vh] overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
                {messages.map((msg) =>
                  msg.role === "user" ? (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 justify-end"
                    >
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-sm">
                        {msg.query}
                      </div>
                      <div className="shrink-0 mt-0.5 h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3"
                    >
                      <div className="shrink-0 mt-0.5 h-7 w-7 rounded-full bg-linear-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center ring-1 ring-primary/10">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        {msg.status === "loading" && (
                          <div className="text-sm flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            <CyclingLoader
                              texts={[
                                `Searching for \u201C${msg.query}\u201D\u2026`,
                                "Scanning impact agents\u2026",
                                "Matching NGOs\u2026",
                                "Ranking opportunities\u2026",
                                "Almost ready\u2026",
                              ]}
                            />
                          </div>
                        )}

                        {msg.status === "error" && (
                          <div className="text-sm text-destructive">{msg.error || "Search failed."}</div>
                        )}

                        {msg.status === "done" && msg.results.length === 0 && (
                          <div className="rounded-xl border bg-muted/30 px-4 py-5 text-center">
                            <Search className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                            <p className="text-sm font-medium text-foreground mb-1">
                              {s.noResultsFor || "No results found for"} &quot;{msg.query}&quot;
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.tryDifferent || "Try different keywords or browse categories"}
                            </p>
                          </div>
                        )}

                        {msg.status === "done" && msg.results.length > 0 && (
                          <>
                            <p className="text-sm text-foreground leading-relaxed">
                              {buildAssistantSummary(msg.query, msg.results)}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {msg.results.slice(0, 6).map((r) => (
                                <ResultCard
                                  key={`${r.type}-${r.id}`}
                                  result={r}
                                  query={msg.query}
                                  onClick={() => addRecentSearch(msg.query)}
                                />
                              ))}
                            </div>
                            {msg.results.length > 6 && (
                              <Button asChild variant="ghost" size="sm" className="text-primary -ml-2">
                                <LocaleLink href={getViewAllLink(msg)}>
                                  {s.viewAllResults || "View all"} {msg.results.length} {s.results || "results"}
                                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </LocaleLink>
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              /* Empty state — friendly intro + suggestions */
              <div className="px-4 sm:px-6 py-8">
                <div className="flex items-start gap-3 mb-5">
                  <div className="shrink-0 mt-0.5 h-7 w-7 rounded-full bg-linear-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center ring-1 ring-primary/10">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      {s.jbcertaGreeting || "Hi! I'm JBCerta. Ask me to find people, NGOs or opportunities — try one of these:"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 ml-10">
                  {POPULAR_SEARCHES.map((item) => (
                    <button
                      key={item.query}
                      onClick={() => runQuery(item.query, searchType)}
                      className="px-3 py-1.5 text-xs rounded-full bg-muted/60 border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {recentSearches.length > 0 && (
                  <div className="mt-5 ml-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {s.recentSearches || "Recent"}
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {s.clearAll || "Clear"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((q) => (
                        <button
                          key={q}
                          onClick={() => runQuery(q, searchType)}
                          className="px-3 py-1.5 text-xs rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-all duration-200 flex items-center gap-1.5"
                        >
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI input bar — Kokonut-style */}
            <div className="border-t bg-muted/20 p-3 sm:p-4">
              <div
                className={cn(
                  "relative flex w-full cursor-text flex-col rounded-xl bg-background text-left transition-all duration-200",
                  "ring-1 ring-border",
                  isFocused && "ring-2 ring-primary/40"
                )}
                onClick={() => textareaRef.current?.focus()}
              >
                <div className="max-h-50 overflow-y-auto">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value)
                      adjustHeight()
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      searchType === "volunteer"
                        ? (s.placeholderVolunteer || "Ask JBCerta to find impact agents…")
                        : searchType === "ngo"
                        ? (s.placeholderNgo || "Ask JBCerta to find NGOs…")
                        : searchType === "opportunity"
                        ? (s.placeholderOpportunity || "Ask JBCerta to find opportunities…")
                        : (s.jbcertaPlaceholder || "Ask JBCerta anything — people, NGOs, opportunities…")
                    }
                    aria-label="Ask JBCerta"
                    rows={1}
                    className="w-full resize-none rounded-xl rounded-b-none border-none bg-transparent px-4 py-3 text-sm leading-[1.4] outline-none placeholder:text-muted-foreground/70"
                  />
                </div>

                <div className="h-12 rounded-b-xl bg-muted/40 dark:bg-white/5">
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <button
                      type="button"
                      title={s.attach || "Attach (coming soon)"}
                      className="cursor-pointer rounded-lg bg-background/60 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <div className="flex h-8 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">JBCerta</span>
                    </div>
                    <div className="flex h-8 items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {searchType === "all"
                          ? (s.all || "All")
                          : searchType === "volunteer"
                          ? (s.impactAgents || "Impact Agents")
                          : searchType === "ngo"
                          ? (s.ngos || "NGOs")
                          : (s.opportunities || "Opportunities")}
                      </span>
                    </div>
                  </div>
                  <div className="absolute right-3 bottom-3 flex items-center gap-1">
                    {hasMessages && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResetChat()
                        }}
                        className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Reset chat"
                        title={s.resetChat || "Reset chat"}
                        type="button"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSubmit()
                      }}
                      disabled={!inputValue.trim()}
                      className={cn(
                        "rounded-lg p-2 transition-colors",
                        inputValue.trim()
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                      )}
                      aria-label="Send"
                      type="button"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {s.enterToSend || "Press Enter to send · Shift+Enter for new line"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

