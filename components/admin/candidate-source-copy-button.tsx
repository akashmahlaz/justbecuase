"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"

export function CandidateSourceCopyButton({ path }: { path: string }) {
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const fullLink = useMemo(() => `${origin}${path}`, [origin, path])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullLink || path)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy registration link"
      className={cn(
        "group flex min-w-80 max-w-md items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
        copied
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-1 font-medium">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground group-hover:text-foreground">
        {path}
      </span>
    </button>
  )
}