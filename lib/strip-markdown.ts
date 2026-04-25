// Lightweight markdown→plain-text. Used to clean scraped/external job
// descriptions (Idealist, ReliefWeb, TheirStack, Catchafire) before showing
// them in cards and detail pages, since we don't render markdown anywhere.

export function stripMarkdown(input: string | null | undefined): string {
  if (!input) return ""
  let s = String(input).replace(/\r\n?/g, "\n")

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

  // bold/italic markers — run twice to handle nested/overlapping markers
  for (let i = 0; i < 2; i++) {
    s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, "$1")
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "$1")
    s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    s = s.replace(/___([^_\n]+)___/g, "$1")
    s = s.replace(/__([^_\n]+)__/g, "$1")
    s = s.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1")
  }

  // strikethrough
  s = s.replace(/~~([^~]+)~~/g, "$1")

  // list bullets / numbered
  s = s.replace(/^\s*[-*+•]\s+/gm, "")
  s = s.replace(/^\s*\d+[.)]\s+/gm, "")

  // horizontal rules
  s = s.replace(/^\s*([-*_=])\1{2,}\s*$/gm, "")

  // backslash-escaped punctuation: \* \_ \[ \] \( \) \# \> \- etc.
  s = s.replace(/\\([*_\[\]()#>\-`~])/g, "$1")

  // residual stray asterisks/underscores
  s = s.replace(/\*+/g, "")
  s = s.replace(/_{2,}/g, "")

  // collapse extra whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()

  return s
}

/**
 * Heuristic: does this string look like raw markdown rather than HTML?
 * Used to decide whether a `bodyHtml` field should be rendered via
 * dangerouslySetInnerHTML or stripped to plain text first.
 */
export function looksLikeMarkdown(input: string | null | undefined): boolean {
  if (!input) return false
  const s = String(input)
  const tagCount = (s.match(/<[a-zA-Z][^>]*>/g) || []).length
  const mdSignals =
    /\*\*[^\n*]+\*\*/.test(s) ||
    /^#{1,6}\s/m.test(s) ||
    /^\s*[-*+]\s+\S/m.test(s) ||
    /\[[^\]]+\]\([^)]+\)/.test(s)
  return mdSignals && tagCount < 3
}
