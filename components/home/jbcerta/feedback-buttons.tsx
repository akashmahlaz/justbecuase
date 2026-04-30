"use client"

import { ThumbsDown, ThumbsUp } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function FeedbackButtons({ messageId }: { messageId: string }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null)

  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        type="button"
        onClick={() => setVote("up")}
        className={cn(
          "rounded-lg p-1.5 transition-colors",
          vote === "up"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            : "text-muted-foreground/50 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40"
        )}
        aria-label="Helpful"
        title="Helpful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setVote("down")}
        className={cn(
          "rounded-lg p-1.5 transition-colors",
          vote === "down"
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            : "text-muted-foreground/50 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        )}
        aria-label="Not helpful"
        title="Not helpful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
