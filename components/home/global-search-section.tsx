"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import LocaleLink from "@/components/locale-link"
import {
  Users, Building2, Briefcase, ArrowRight,
  CheckCircle, Loader2, Sparkles,
  Send, RotateCcw, ChevronRight, MapPin,
} from "lucide-react"
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea"
import { cn } from "@/lib/utils"
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
    accent: "text-blue-600 dark:text-blue-400",
    viewAllPath: "/volunteers",
  },
  ngo: {
    icon: Building2,
    label: "NGO",
    pluralLabel: "NGOs",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    accent: "text-green-600 dark:text-green-400",
    viewAllPath: "/ngos",
  },
  opportunity: {
    icon: Briefcase,
    label: "Opportunity",
    pluralLabel: "Opportunities",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    accent: "text-purple-600 dark:text-purple-400",
    viewAllPath: "/projects",
  },
} as const

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
// COMPACT INLINE RESULT ROW (chat citation style)
// ============================================

function ResultRow({ result, onClick }: { result: SearchResult; onClick?: () => void }) {
  const config = TYPE_CONFIG[result.type] || TYPE_CONFIG.opportunity
  const Icon = config.icon
  const href =
    result.type === "volunteer" ? `/volunteers/${result.id}` :
    result.type === "ngo" ? `/ngos/${result.id}` :
    `/projects/${result.id}`

  return (
    <LocaleLink
      href={href}
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg border border-transparent bg-transparent px-2 py-2 hover:border-border hover:bg-muted/40 transition-colors"
    >
      <div className="shrink-0">
        {result.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.avatar}
            alt={result.title}
            className="w-8 h-8 rounded-full object-cover bg-muted ring-1 ring-border"
            loading="lazy"
          />
        ) : (
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-border", config.badgeClass)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {result.title}
          </span>
          {result.verified && (
            <CheckCircle className="h-3 w-3 shrink-0 text-primary" fill="currentColor" strokeWidth={0} />
          )}
          <span className={cn("text-[10px] font-medium uppercase tracking-wider shrink-0", config.accent)}>
            · {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
          {result.subtitle && <span className="truncate">{result.subtitle}</span>}
          {result.location && (
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin className="h-2.5 w-2.5" />
              {result.location}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </LocaleLink>
  )
}

// ============================================
// AI THINKING SHIMMER (kokonut motion technique)
// ============================================

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

// ============================================
// CHAT TYPES
// ============================================

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string
      role: "assistant"
      status: "loading" | "done" | "error"
      content: string
      results: SearchResult[]
      action?: "reply" | "search"
      query?: string
      type?: "all" | "volunteer" | "ngo" | "opportunity"
      error?: string
    }

// ============================================
// MAIN COMPONENT — JBCerta (Minimax-powered chat)
// ============================================

const SUGGESTIONS = [
  "Find me a graphic designer in Madrid",
  "Show NGOs working on education",
  "Are there remote video editing opportunities?",
  "Recommend volunteers for marketing",
  "What can JBCerta help me with?",
]

export function GlobalSearchSection() {
  const dict = useDictionary()
  const s = (dict as { search?: Record<string, string> }).search || {}

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 200 })

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > 2000) return

    const userId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    // Snapshot current conversation BEFORE adding new turns to send to API
    const history = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.role === "user" ? m.content : (m.content || ""),
    }))
    history.push({ role: "user", content: trimmed })

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: trimmed },
      { id: assistantId, role: "assistant", status: "loading", content: "", results: [] },
    ])

    addRecentSearch(trimmed)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/jbcerta-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const data = await res.json()
      const action: "reply" | "search" = data?.action === "search" ? "search" : "reply"
      const message: string = typeof data?.message === "string" ? data.message : ""
      const results: SearchResult[] = Array.isArray(data?.results) ? data.results : []
      const query: string | undefined = typeof data?.query === "string" ? data.query : undefined
      const type = (["all", "volunteer", "ngo", "opportunity"] as const).includes(data?.type)
        ? (data.type as "all" | "volunteer" | "ngo" | "opportunity")
        : undefined

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === "assistant"
            ? { ...m, status: "done", action, content: message, results, query, type }
            : m
        )
      )
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && m.role === "assistant"
            ? { ...m, status: "error", error: "Sorry, JBCerta couldn't reply. Please try again." }
            : m
        )
      )
    }
  }, [messages, addRecentSearch])

  const handleSubmit = useCallback(() => {
    const v = inputValue.trim()
    if (!v) return
    setInputValue("")
    adjustHeight(true)
    sendMessage(v)
  }, [inputValue, sendMessage, adjustHeight])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleResetChat = () => {
    abortRef.current?.abort()
    setMessages([])
  }

  const getViewAllLink = (msg: Extract<ChatMessage, { role: "assistant" }>) => {
    const q = msg.query || ""
    if (msg.type && msg.type !== "all") {
      return `${TYPE_CONFIG[msg.type].viewAllPath}?q=${encodeURIComponent(q)}`
    }
    const counts = msg.results.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    }, {})
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] as keyof typeof TYPE_CONFIG | undefined
    return top
      ? `${TYPE_CONFIG[top].viewAllPath}?q=${encodeURIComponent(q)}`
      : `/projects?q=${encodeURIComponent(q)}`
  }

  const hasMessages = messages.length > 0

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          {/* Header — preserved */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {s.findTitle || "Save time - just use our Intelligent Search Engine"}{" "}
              <span className="font-extrabold">{s.jbcertaName || "JBCerta"}</span>
            </h2>
            <div className="inline-flex items-center gap-1.5 mb-3 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3 w-3" />
              {s.jbcertaBrand || "Powered by JBCerta AI"}
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              {s.findSubtitle || "Advanced AI search engine specifically engineered for NGOs and social impact talent"}
            </p>
          </div>

          {/* Single unified chat surface — Kokonut-inspired */}
          <div
            className={cn(
              "relative rounded-2xl bg-background shadow-sm transition-all duration-200",
              "ring-1 ring-border",
              isFocused && "ring-2 ring-primary/40 shadow-lg shadow-primary/5"
            )}
          >
            {/* Soft top gradient bar — visual anchor for the AI surface */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/30 to-transparent" />
            {/* Conversation feed (only visible after first message) */}
            <AnimatePresence initial={false}>
              {hasMessages && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-[55vh] overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
                    {messages.map((msg) =>
                      msg.role === "user" ? (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-3 justify-end"
                        >
                          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap wrap-break-word">
                            {msg.content}
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
                                    "Thinking\u2026",
                                    "Understanding your request\u2026",
                                    "Looking through the platform\u2026",
                                    "Almost ready\u2026",
                                  ]}
                                />
                              </div>
                            )}

                            {msg.status === "error" && (
                              <div className="text-sm text-destructive">{msg.error || "Something went wrong."}</div>
                            )}

                            {msg.status === "done" && (
                              <>
                                {msg.content && (
                                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                  </p>
                                )}

                                {msg.action === "search" && msg.results.length === 0 && msg.query && (
                                  <p className="text-xs text-muted-foreground italic">
                                    {s.noResultsHint || "No matches yet — try rephrasing or being more specific."}
                                  </p>
                                )}

                                {msg.results.length > 0 && (
                                  <div className="rounded-xl border bg-muted/20 p-2 space-y-0.5">
                                    {msg.results.slice(0, 6).map((r) => (
                                      <ResultRow
                                        key={`${r.type}-${r.id}`}
                                        result={r}
                                        onClick={() => msg.query && addRecentSearch(msg.query)}
                                      />
                                    ))}
                                    {msg.results.length > 6 && (
                                      <LocaleLink
                                        href={getViewAllLink(msg)}
                                        className="flex items-center justify-center gap-1 px-2 py-2 text-xs text-primary font-medium hover:underline"
                                      >
                                        {s.viewAllResults || "View all"} {msg.results.length} {s.results || "results"}
                                        <ArrowRight className="h-3 w-3" />
                                      </LocaleLink>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input row — seamlessly part of the same surface, no divider */}
            <div className="relative" onClick={() => textareaRef.current?.focus()}>
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
                placeholder={s.jbcertaPlaceholder || "Ask JBCerta anything\u2026"}
                aria-label="Ask JBCerta"
                rows={1}
                className={cn(
                  "w-full resize-none border-none bg-transparent px-5 pt-4 pb-14 text-sm leading-normal outline-none placeholder:text-muted-foreground/60",
                  hasMessages ? "rounded-b-2xl" : "rounded-2xl"
                )}
              />

              {/* Bottom-bar inside the same input box */}
              <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none">
                <div className="flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 text-primary pointer-events-auto">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-[11px] font-medium">JBCerta</span>
                </div>
                <span className="hidden sm:inline text-[11px] text-muted-foreground">
                  {s.enterToSend || "Enter to send · Shift+Enter for new line"}
                </span>
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-1">
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

          {/* Suggestion chips below the box (only when empty) */}
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 flex flex-wrap justify-center gap-2"
            >
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-1.5 text-xs rounded-full bg-background border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
                >
                  {q}
                </button>
              ))}
              {recentSearches.length > 0 && (
                <button
                  onClick={clearRecentSearches}
                  className="ml-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s.clearAll || "Clear recents"}
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
