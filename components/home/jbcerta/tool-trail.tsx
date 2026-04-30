"use client"

import { CheckCircle, Search, Sparkles, Zap } from "lucide-react"
import { motion } from "motion/react"
import { TOOL_LABELS } from "./constants"

function iconForTool(toolName: string) {
  if (toolName.startsWith("search")) return Search
  if (toolName === "matchCandidates") return Zap
  if (toolName.startsWith("get")) return CheckCircle
  return Sparkles
}

export function ToolTrail({ toolNames }: { toolNames: string[] }) {
  if (toolNames.length === 0) return null

  const groups: { name: string; count: number }[] = []
  for (const name of toolNames) {
    const last = groups[groups.length - 1]
    if (last?.name === name) last.count += 1
    else groups.push({ name, count: 1 })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-2">
      {groups.map((group) => {
        const Icon = iconForTool(group.name)
        return (
          <span
            key={group.name}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            <Icon className="h-2.5 w-2.5 text-primary/70" />
            <span>
              {TOOL_LABELS[group.name] || group.name}
              {group.count > 1 ? ` x${group.count}` : ""}
            </span>
          </span>
        )
      })}
    </motion.div>
  )
}
