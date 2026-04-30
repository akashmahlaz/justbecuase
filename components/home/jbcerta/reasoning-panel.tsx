"use client"

import { Bot, ChevronDown, ChevronUp } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

export function ReasoningPanel({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(true)

  if (!text.trim()) return null

  const lines = text.split("\n").filter(Boolean)

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        <Bot className="h-3 w-3" />
        <span>AI reasoning</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground"
          >
            {lines.map((line, index) => (
              <p key={`${line}-${index}`} className="mb-1 last:mb-0">
                {line}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
