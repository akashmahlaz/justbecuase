"use client"

import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { useDictionary } from "@/components/dictionary-provider"
import { Sparkles } from "lucide-react"
import AI_Input_Search from "@/components/kokonutui/ai-input-search"

/**
 * AI-style search entry on the home page.
 *
 * Wraps the Kokonut `AI_Input_Search` component and routes the query to
 * the most relevant existing listing page based on a tiny intent classifier:
 *   - "ngo", "nonprofit", "charity"      -> /ngos
 *   - "project", "opportunity", "gig",   -> /projects
 *     "job", "role", "volunteering"
 *   - everything else (people / skills)  -> /impact-agents
 *
 * The destination pages already wire `?q=` into their `UnifiedSearchBar`
 * pipeline, so no new backend is needed.
 */
export function AiSearchHero() {
  const router = useRouter()
  const locale = useLocale()
  const dict = useDictionary() as any
  const t = dict.aiSearch || {}

  const handleSubmit = (raw: string) => {
    const value = raw?.trim()
    if (!value) return

    const lower = value.toLowerCase()
    const isNgo = /\b(ngo|nonprofit|non-profit|charity|charities|foundation|organization|organisation)\b/.test(lower)
    const isProject = /\b(project|projects|opportunity|opportunities|gig|gigs|job|jobs|role|roles|volunteer(ing)?|task|mission)\b/.test(lower)

    const target = isNgo ? "/ngos" : isProject ? "/projects" : "/impact-agents"
    const url = `${localePath(target, locale)}?q=${encodeURIComponent(value)}`
    router.push(url)
  }

  return (
    <section className="relative bg-background pt-2 pb-8 md:pb-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{t.eyebrow || "Ask anything"}</span>
          </div>
          <AI_Input_Search
            placeholder={t.placeholder || "Find a Pro Bono designer in Madrid, an education NGO, a remote data project..."}
            searchLabel={t.searchLabel || "Search"}
            onSubmit={handleSubmit}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t.hint || "Try: \u201Cmarketing volunteer for climate NGO\u201D or \u201Cremote web development project\u201D"}
          </p>
        </div>
      </div>
    </section>
  )
}
