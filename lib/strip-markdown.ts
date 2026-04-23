// Lightweight markdown→plain-text. Used to clean scraped/external job
// descriptions (Idealist, ReliefWeb, TheirStack, Catchafire) before showing
// them in cards and detail pages, since we don't render markdown anywhere.

export function stripMarkdown(input: string | null | undefined): string {
  if (!input) return ""
  let s = String(input)

  // code fences and inline code
  s = s.replace(/```[\s\S]*?```/g, "")
  s = s.replace(/`([^`]+)`/g, "$1")

  // images ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
  // links [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  // bare references [text][1] -> text
  s = s.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")

  // headings, blockquotes
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "")
  s = s.replace(/^\s{0,3}>\s?/gm, "")

  // bold/italic markers
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1")
  s = s.replace(/\*([^*\n]+)\*/g, "$1")
  s = s.replace(/___([^_]+)___/g, "$1")
  s = s.replace(/__([^_]+)__/g, "$1")
  s = s.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1")

  // strikethrough
  s = s.replace(/~~([^~]+)~~/g, "$1")

  // list bullets / numbered
  s = s.replace(/^\s*[-*+]\s+/gm, "")
  s = s.replace(/^\s*\d+\.\s+/gm, "")

  // horizontal rules
  s = s.replace(/^\s*([-*_])\1{2,}\s*$/gm, "")

  // residual stray asterisks/underscores at word boundaries
  s = s.replace(/\*+/g, "")

  // collapse extra whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()

  return s
}
