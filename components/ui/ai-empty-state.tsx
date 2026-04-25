"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"
import AITextLoading from "@/components/kokonutui/ai-text-loading"
import { cn } from "@/lib/utils"

/**
 * Animated empty state for search/listing pages while results are loading
 * or when no matches were found.
 *
 * Wraps Kokonut `AITextLoading` with a softer container, a static fallback
 * line, and an optional CTA. Use for:
 *   - Search loading shimmer (mode="loading")
 *   - "No results" friendly empty state (mode="empty")
 */
export interface AIEmptyStateProps {
  mode?: "loading" | "empty"
  /** Cycling phrases for loading mode. */
  loadingTexts?: string[]
  /** Static heading for empty mode. */
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function AIEmptyState({
  mode = "loading",
  loadingTexts = [
    "Scanning the network…",
    "Matching your filters…",
    "Ranking by relevance…",
    "Almost there…",
  ],
  title = "No matches yet",
  description = "Try removing a filter or broadening your search.",
  action,
  className,
}: AIEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className,
      )}
    >
      {mode === "loading" ? (
        <>
          <AITextLoading texts={loadingTexts} />
          <p className="mt-1 text-xs text-muted-foreground">
            This usually takes a moment.
          </p>
        </>
      ) : (
        <>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </>
      )}
    </div>
  )
}
