import type { JBCertaResult } from "@/lib/ai/jbcerta-ui"

export type JBCertaMessagePart = {
  type: string
  text?: string
  state?: string
  toolCallId?: string
  input?: unknown
  output?: unknown
  errorText?: string
  data?: unknown
}

export function isTextPart(part: JBCertaMessagePart) {
  return part.type === "text" && typeof part.text === "string"
}

export function isReasoningPart(part: JBCertaMessagePart) {
  return part.type === "reasoning" && typeof part.text === "string"
}

export function isToolPart(part: JBCertaMessagePart) {
  return part.type.startsWith("tool-")
}

export function getToolName(part: JBCertaMessagePart) {
  return part.type.startsWith("tool-") ? part.type.slice(5) : part.type
}

export function isResultsPart(part: JBCertaMessagePart): part is JBCertaMessagePart & {
  data: { items: JBCertaResult[]; elapsedMs: number; modelLabel: string }
} {
  if (part.type !== "data-results" || !part.data || typeof part.data !== "object") return false
  const data = part.data as { items?: unknown }
  return Array.isArray(data.items)
}

export function getTextFromParts(parts: JBCertaMessagePart[]) {
  return parts.filter(isTextPart).map((part) => part.text).join("")
}

export function getReasoningFromParts(parts: JBCertaMessagePart[]) {
  return parts.filter(isReasoningPart).map((part) => part.text).join("\n")
}

export function getResultsFromParts(parts: JBCertaMessagePart[]) {
  return parts.filter(isResultsPart).flatMap((part) => part.data.items)
}

export function getToolNamesFromParts(parts: JBCertaMessagePart[]) {
  return parts.filter(isToolPart).map(getToolName)
}
