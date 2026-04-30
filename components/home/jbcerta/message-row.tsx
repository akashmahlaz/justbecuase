"use client"

import type { UIMessage } from "ai"
import { Bot, Users } from "lucide-react"
import { motion } from "motion/react"
import { FeedbackButtons } from "./feedback-buttons"
import { getReasoningFromParts, getResultsFromParts, getTextFromParts, getToolNamesFromParts, type JBCertaMessagePart } from "./parts"
import { ReasoningPanel } from "./reasoning-panel"
import { ResultsGrid } from "./results-grid"
import { StreamingText } from "./streaming-text"
import { ToolTrail } from "./tool-trail"

type MessageRowProps = {
  message: UIMessage
  streaming: boolean
  showReasoning: boolean
  showFeedback: boolean
}

export function MessageRow({ message, streaming, showReasoning, showFeedback }: MessageRowProps) {
  const parts = message.parts as JBCertaMessagePart[]

  if (message.role === "user") {
    const text = getTextFromParts(parts)
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-end gap-3">
        <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap" style={{ overflowWrap: "break-word" }}>{text}</p>
        </div>
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <Users className="h-4 w-4" />
        </div>
      </motion.div>
    )
  }

  const text = getTextFromParts(parts)
  const reasoning = getReasoningFromParts(parts)
  const toolNames = getToolNamesFromParts(parts)
  const results = getResultsFromParts(parts)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/25 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
        <Bot className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <ToolTrail toolNames={toolNames} />
        {showReasoning && <ReasoningPanel text={reasoning} />}
        {text && (
          <div className="text-sm leading-relaxed text-foreground">
            <StreamingText text={text} streaming={streaming} />
          </div>
        )}
        {streaming && !text && (
          <div className="space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" />
          </div>
        )}
        <ResultsGrid results={results} />
        {showFeedback && <FeedbackButtons messageId={message.id} />}
      </div>
    </motion.div>
  )
}
