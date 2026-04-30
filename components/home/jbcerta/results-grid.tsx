import type { JBCertaResult } from "@/lib/ai/jbcerta-ui"
import { Sparkles } from "lucide-react"
import { ResultCard } from "./result-card"

export function ResultsGrid({ results }: { results: JBCertaResult[] }) {
  if (results.length === 0) return null

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/25 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          {results.length} {results.length === 1 ? "match" : "matches"}
        </span>
        <span className="text-[10px] text-muted-foreground/60">Opens in new tab</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {results.slice(0, 6).map((result) => (
          <ResultCard key={`${result.type}-${result.id}`} result={result} />
        ))}
      </div>
    </div>
  )
}
