import { NextRequest, NextResponse } from "next/server"
import { elasticSearch, elasticSuggest } from "@/lib/es-search"
// MongoDB fallback (kept for graceful degradation)
import { unifiedSearch, getSearchSuggestions } from "@/lib/search-indexes"
import { trackEvent } from "@/lib/analytics"
import { isESAvailable, markESFailed } from "@/lib/elasticsearch"
import { getAlgoliaSearchClient, ALGOLIA_INDEXES } from "@/lib/algolia"

// ============================================
// Unified Search API — Algolia-first, ES + MongoDB fallback
// ============================================

const ALGOLIA_ENABLED = !!(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY)
const ELASTICSEARCH_ENABLED = !!(process.env.ELASTICSEARCH_URL && process.env.ELASTICSEARCH_API_KEY)

function parseHoursPerWeekUpperBound(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) return Number(rangeMatch[2])

  const plusMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\+/)
  if (plusMatch) return Number(plusMatch[1])

  const numberMatch = normalized.match(/\d+(?:\.\d+)?/)
  return numberMatch ? Number(numberMatch[0]) : null
}

function parseHoursPerWeekLowerBound(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) return Number(rangeMatch[1])

  const plusMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\+/)
  if (plusMatch) return Number(plusMatch[1])

  const numberMatch = normalized.match(/\d+(?:\.\d+)?/)
  return numberMatch ? Number(numberMatch[0]) : null
}

function parseNaturalLanguageFilters(rawQuery: string) {
  let q = rawQuery.trim().replace(/\s+/g, " ")
  const f: Record<string, any> = {}

  // Helper: consume first matching pattern
  function consume(patterns: Array<[RegExp, string]>, key: string) {
    for (const [pat, val] of patterns) {
      if (pat.test(q)) {
        f[key] = val
        q = q.replace(pat, " ")
        return true
      }
    }
    return false
  }

  // 1. Work mode
  consume([
    [/\b(remote|wfh|work\s*from\s*home|virtual|online)\b/i, "remote"],
    [/\b(on-?site|on\s+site|in-?\s*person|in\s+person|office)\b/i, "onsite"],
    [/\bhybrid\b/i, "hybrid"],
  ], "workMode")

  // 2. Volunteer type
  consume([
    [/\b(pro[\s-]?bono)\b/i, "free"],
    [/\bfree\b/i, "free"],
    [/\bpaid\b/i, "paid"],
    [/\b(either|both)\b/i, "both"],
  ], "volunteerType")

  // 3. Experience level (Algolia facet values on opportunities)
  consume([
    [/\b(beginner|entry[\s-]?level|junior)\b/i, "beginner"],
    [/\b(intermediate|mid[\s-]?level)\b/i, "intermediate"],
    [/\badvanced\b/i, "advanced"],
    [/\bexpert\b/i, "expert"],
  ], "experienceLevel")

  // 4. Availability (Algolia facet on volunteers)
  consume([
    [/\b(weekdays?|week\s*days?)\b/i, "weekdays"],
    [/\b(weekends?|week\s*ends?)\b/i, "weekends"],
    [/\b(evenings?|after[\s-]?hours?|nights?)\b/i, "evenings"],
    [/\bflexible\b/i, "flexible"],
  ], "availability")

  // 5. Verified filter
  const verifiedMatch = q.match(/\b(verified|trusted)\b/i)
  if (verifiedMatch) {
    f.isVerified = true
    q = q.replace(verifiedMatch[0], " ")
  }

  // 6. Rating — explicit numeric ("4 stars", "4+ rated", "rating above 3")
  const ratingPatterns = [
    /\b(\d+(?:\.\d+)?)\s*\+?\s*stars?\b/i,
    /\b(\d+(?:\.\d+)?)\s*\+?\s*rated?\b/i,
    /\bratings?\s*(?:above|over|>=?|at\s*least)\s*(\d+(?:\.\d+)?)\b/i,
  ]
  for (const pat of ratingPatterns) {
    const m = q.match(pat)
    if (m) {
      f.minRating = Math.min(Number(m[1]), 5)
      q = q.replace(m[0], " ")
      break
    }
  }
  // Quality keywords → implied minRating 4
  if (!f.minRating) {
    const qualityMatch = q.match(/\b(top[\s-]?rated|highly[\s-]?rated|best|top\s+quality)\b/i)
    if (qualityMatch) {
      f.minRating = 4
      q = q.replace(qualityMatch[0], " ")
    }
  }

  // 7. Hours per week — parse BEFORE money to avoid "10 hours" matching dollar patterns
  //    Supports: "5 hours a week", "10-20 hrs/week", "5 to 10 hours per week"
  const hrsRangeMatch = q.match(/\b(\d+)\s*(?:to|-)\s*(\d+)\s*(?:hours?|hrs?)\s*(?:per|\/|a)?\s*week\b/i)
  if (hrsRangeMatch) {
    f.maxHoursPerWeek = Number(hrsRangeMatch[2])
    q = q.replace(hrsRangeMatch[0], " ")
  } else {
    const hrsSingleMatch = q.match(/\b(\d+)\s*(?:hours?|hrs?)\s*(?:per|\/|a)?\s*week\b/i)
    if (hrsSingleMatch) {
      f.maxHoursPerWeek = Number(hrsSingleMatch[1])
      q = q.replace(hrsSingleMatch[0], " ")
    }
  }

  // Part-time / full-time → implied hours
  if (!f.maxHoursPerWeek && !f.minHoursPerWeek) {
    const ptMatch = q.match(/\b(part[\s-]?time)\b/i)
    if (ptMatch) {
      f.maxHoursPerWeek = 20
      q = q.replace(ptMatch[0], " ")
    } else {
      const ftMatch = q.match(/\b(full[\s-]?time)\b/i)
      if (ftMatch) {
        f.minHoursPerWeek = 35
        q = q.replace(ftMatch[0], " ")
      }
    }
  }

  // 8. Money + time-period detection
  //    Handle: "$10/hr", "10 dollars per week", "under $50 per hour",
  //    "10$/week", "10 bucks", "€50/month", "₹500"
  const currencySymbols = /[$€£₹]/
  const currencyWords = /(?:usd|dollars?|bucks?|inr|rupees?|rs\.?|eur(?:os?)?|gbp|pounds?)/i
  const timePeriods = /(?:per|a|an|\/|every)\s*(?:hour|hr|week|wk|month|mo)\b/i

  // Pattern A: explicit "$ amount / period" — e.g. "under $50 per hour", "$10/week"
  const moneyWithPeriod = q.match(
    new RegExp(
      `\\b(?:under|below|less\\s*than|upto|up\\s*to|max(?:imum)?|budget(?:\\s*of)?|within)?\\s*` +
      `(?:${currencySymbols.source})?\\s*(\\d+(?:\\.\\d+)?)\\s*` +
      `(?:${currencySymbols.source})?\\s*` +
      `(?:${currencyWords.source})?\\s*` +
      `(?:per|a|an|\\/|every)\\s*(hour|hr|week|wk|month|mo)\\b`,
      "i"
    )
  )

  if (moneyWithPeriod) {
    const amount = Number(moneyWithPeriod[1])
    const period = moneyWithPeriod[2].toLowerCase()
    q = q.replace(moneyWithPeriod[0], " ")
    if (period === "hour" || period === "hr") f.maxHourlyRate = amount
    else if (period === "week" || period === "wk") f.maxWeeklyBudget = amount
    else if (period === "month" || period === "mo") f.maxMonthlyBudget = amount
  } else {
    // Pattern B: dollar amount without explicit period
    //   e.g. "under $50", "$10", "10 dollars", "10$", "₹500"
    const bareMoney = q.match(
      new RegExp(
        `\\b(?:under|below|less\\s*than|upto|up\\s*to|max(?:imum)?|budget(?:\\s*of)?|within)?\\s*` +
        `(?:${currencySymbols.source})\\s*(\\d+(?:\\.\\d+)?)(?:\\s*${currencyWords.source})?\\b`,
        "i"
      )
    ) || q.match(
      new RegExp(
        `\\b(\\d+(?:\\.\\d+)?)\\s*(?:${currencySymbols.source})(?:\\s*${currencyWords.source})?\\b`,
        "i"
      )
    ) || q.match(
      new RegExp(
        `\\b(?:under|below|less\\s*than|upto|up\\s*to|max(?:imum)?|budget(?:\\s*of)?)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${currencyWords.source})\\b`,
        "i"
      )
    ) || q.match(
      new RegExp(
        `\\b(\\d+(?:\\.\\d+)?)\\s+(?:${currencyWords.source})\\b`,
        "i"
      )
    )

    if (bareMoney) {
      const amount = Number(bareMoney[1])
      q = q.replace(bareMoney[0], " ")

      // Check if a trailing period word remains after removing the dollar phrase
      const trailingPeriod = q.match(/\b(?:per|a|an|\/|every)\s*(hour|hr|week|wk|month|mo)\b/i)
      if (trailingPeriod) {
        q = q.replace(trailingPeriod[0], " ")
        const period = trailingPeriod[1].toLowerCase()
        if (period === "hour" || period === "hr") f.maxHourlyRate = amount
        else if (period === "week" || period === "wk") f.maxWeeklyBudget = amount
        else if (period === "month" || period === "mo") f.maxMonthlyBudget = amount
      } else {
        // No period → default to hourly rate
        f.maxHourlyRate = amount
      }
    }
  }

  // 9. Cleanup residual noise
  q = q
    .replace(/\b(per|an?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return { cleanedQuery: q, inferredFilters: f }
}

function normalizeSearchToken(value: string): string {
  let normalized = value.toLowerCase().trim()
  if (!normalized) return ""

  normalized = normalized.replace(/[^a-z0-9]+/g, "")
  if (normalized.endsWith("ment") && normalized.length > 6) normalized = normalized.slice(0, -4)
  if (normalized.endsWith("ers") && normalized.length > 5) normalized = normalized.slice(0, -3)
  else if (normalized.endsWith("er") && normalized.length > 4) normalized = normalized.slice(0, -2)
  else if (normalized.endsWith("ing") && normalized.length > 5) normalized = normalized.slice(0, -3)
  else if (normalized.endsWith("ed") && normalized.length > 4) normalized = normalized.slice(0, -2)
  return normalized
}

function getMeaningfulQueryTerms(query: string): string[] {
  const stopWords = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "with"])
  return Array.from(new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .map(normalizeSearchToken)
      .filter((term) => term.length >= 3 && !stopWords.has(term))
  ))
}

function hasStrongLexicalMatch(result: Record<string, any>, query: string): boolean {
  const terms = getMeaningfulQueryTerms(query)
  if (terms.length <= 1) return true

  const candidateParts = [
    result.title,
    result.subtitle,
    result.description,
    result.location,
    result.ngoName,
    ...(Array.isArray(result.skills) ? result.skills : []),
    ...(Array.isArray(result.causes) ? result.causes : []),
  ].filter(Boolean)

  const normalizedText = candidateParts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")

  let matchedTerms = 0
  for (const term of terms) {
    if (!term) continue
    if (normalizedText.includes(term)) matchedTerms += 1
  }

  return matchedTerms >= Math.min(2, terms.length)
}

function mapTypes(types: string[] | undefined): ("volunteer" | "ngo" | "project" | "blog" | "page")[] | undefined {
  if (!types) return undefined
  return types.map(t => t === "opportunity" ? "project" : t) as any
}

function mapResultType(type: string): string {
  return type === "project" ? "opportunity" : type
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get("q") || ""
    const typesParam = searchParams.get("types")
    const limitParam = searchParams.get("limit")
    const mode = searchParams.get("mode") || "full"
    const sort = (searchParams.get("sort") || "relevance") as "relevance" | "newest" | "rating"
    const filtersParam = searchParams.get("filters")
    const engine = searchParams.get("engine") || (ALGOLIA_ENABLED ? "algolia" : ELASTICSEARCH_ENABLED && isESAvailable() ? "es" : "mongo")

    const { cleanedQuery, inferredFilters } = parseNaturalLanguageFilters(rawQuery)
    const query = cleanedQuery || rawQuery.trim()

    console.log(`\n🔍 [Search API] ========== ${mode.toUpperCase()} REQUEST ==========`)
    console.log(`🔍 [Search API] Query: "${rawQuery}"`)
    console.log(`🔍 [Search API] Mode: ${mode} | Engine: ${engine} | Types: ${typesParam || "all"} | Limit: ${limitParam || "default"} | Sort: ${sort}`)
    console.log(`🔍 [Search API] ALGOLIA_ENABLED: ${ALGOLIA_ENABLED} | ES_ENABLED: ${ELASTICSEARCH_ENABLED} | ES_AVAILABLE: ${ELASTICSEARCH_ENABLED ? isESAvailable() : "N/A"}`)
    if (cleanedQuery !== rawQuery.trim()) {
      console.log(`🔍 [Search API] Cleaned query: "${query}"`)
    }
    if (Object.keys(inferredFilters).length > 0) {
      console.log(`🔍 [Search API] Inferred filters:`, JSON.stringify(inferredFilters))
    }

    if (!query && Object.keys(inferredFilters).length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        suggestions: [],
        message: "Query too short",
        query: "",
        count: 0,
        engine,
      })
    }

    const rawTypes = typesParam ? typesParam.split(",") : undefined
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    // Explicit filters from API params (hard — sent to Algolia directly)
    let explicitFilters: Record<string, any> | undefined
    if (filtersParam) {
      try {
        explicitFilters = JSON.parse(filtersParam)
      } catch {
        // ignore invalid filters
      }
    }
    // Merged filters: NLP-inferred + explicit (for index selection and post-filtering)
    const allFilters: Record<string, any> = {
      ...inferredFilters,
      ...(explicitFilters || {}),
    }
    const hasFilters = Object.keys(allFilters).length > 0
    if (hasFilters) console.log(`🔍 [Search API] All filters:`, JSON.stringify(allFilters))
    if (explicitFilters) console.log(`🔍 [Search API] Explicit (hard) filters:`, JSON.stringify(explicitFilters))

    // ---- ALGOLIA ENGINE (PRIMARY) ----
    if (engine === "algolia" && ALGOLIA_ENABLED) {
      try {
        const algoliaClient = getAlgoliaSearchClient()
        console.log(`🟢 [Search API] Using ALGOLIA engine`)

        // Determine which indexes to search based on filter types
        const hasVolunteerFilters = !!(
          allFilters.volunteerType || allFilters.maxHourlyRate ||
          allFilters.maxWeeklyBudget || allFilters.maxMonthlyBudget ||
          allFilters.maxHoursPerWeek || allFilters.minHoursPerWeek ||
          allFilters.availability || allFilters.minRating
        )
        const hasOpportunityFilters = !!(allFilters.experienceLevel)
        const indexNames: string[] = []
        if (hasVolunteerFilters && !hasOpportunityFilters) {
          // Volunteer-specific filters → only search volunteer index
          indexNames.push(ALGOLIA_INDEXES.VOLUNTEERS)
        } else if (hasOpportunityFilters && !hasVolunteerFilters) {
          // Opportunity-specific filters → opportunities + volunteers (skills still relevant)
          if (!rawTypes || rawTypes.includes("opportunity")) indexNames.push(ALGOLIA_INDEXES.OPPORTUNITIES)
          if (!rawTypes || rawTypes.includes("volunteer")) indexNames.push(ALGOLIA_INDEXES.VOLUNTEERS)
        } else if (hasVolunteerFilters && hasOpportunityFilters) {
          // Both → search volunteers and opportunities
          if (!rawTypes || rawTypes.includes("volunteer")) indexNames.push(ALGOLIA_INDEXES.VOLUNTEERS)
          if (!rawTypes || rawTypes.includes("opportunity")) indexNames.push(ALGOLIA_INDEXES.OPPORTUNITIES)
        } else {
          // No type-specific filters → search all
          if (!rawTypes || rawTypes.includes("ngo")) indexNames.push(ALGOLIA_INDEXES.NGOS)
          if (!rawTypes || rawTypes.includes("opportunity")) indexNames.push(ALGOLIA_INDEXES.OPPORTUNITIES)
          if (!rawTypes || rawTypes.includes("volunteer")) indexNames.push(ALGOLIA_INDEXES.VOLUNTEERS)
        }
        console.log(`🟢 [Search API] Searching indexes: [${indexNames.join(", ")}]`)

        if (mode === "suggestions") {
          // Multi-index search for autocomplete suggestions
          const requests = indexNames.map(indexName => ({
            indexName,
            query: query.trim(),
            hitsPerPage: Math.min(limit, 4),
            attributesToRetrieve: ["objectID", "type", "name", "orgName", "title", "headline", "description", "skillNames", "causeNames", "city", "avatar", "logo", "workMode"],
            attributesToHighlight: ["name", "orgName", "title", "headline", "skillNames"],
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
          }))

          console.log(`🟢 [Search API] SUGGESTIONS mode — sending ${requests.length} multi-index requests`)
          const algoliaT0 = Date.now()
          const { results } = await algoliaClient.search({ requests })
          const algoliaMs = Date.now() - algoliaT0
          console.log(`🟢 [Search API] Algolia responded in ${algoliaMs}ms — ${results.length} index results`)
          const suggestions: any[] = []

          for (const indexResult of results) {
            if (!("hits" in indexResult)) continue
            const ir = indexResult as any
            console.log(`🟢 [Search API] Index "${ir.index}": ${ir.nbHits} total hits, ${ir.hits.length} returned, processingTimeMS=${ir.processingTimeMS}ms`)
            for (const hit of indexResult.hits as any[]) {
              const type = hit.type || (ir.index?.includes("volunteer") ? "volunteer" : ir.index?.includes("ngo") ? "ngo" : "opportunity")
              let text = hit.name || hit.orgName || hit.title || ""
              let subtitle = hit.headline || hit.description?.slice(0, 60) || ""
              if (type === "opportunity") {
                text = hit.title || ""
                subtitle = [hit.workMode === "remote" ? "Remote" : hit.location, hit.skillNames?.slice(0, 2).join(", ")].filter(Boolean).join(" · ")
              } else if (type === "ngo") {
                text = hit.name || hit.orgName || ""
                subtitle = hit.description?.slice(0, 60) || "Organization"
              } else {
                subtitle = hit.headline || hit.skillNames?.slice(0, 3).join(", ") || ""
              }
              console.log(`   📌 [${type}] "${text}" — ${subtitle || "(no subtitle)"} [id: ${hit.objectID}]`)
              suggestions.push({
                text,
                type: type === "project" ? "opportunity" : type,
                id: hit.objectID,
                subtitle,
              })
            }
          }

          const took = Date.now() - startTime
          console.log(`🟢 [Search API] ✅ SUGGESTIONS DONE — ${suggestions.length} total suggestions in ${took}ms (Algolia: ${algoliaMs}ms)`)
          console.log(`🔍 [Search API] ==========================================\n`)
          trackEvent("search", "suggest", { metadata: { query, engine: "algolia", count: suggestions.length } })
          return NextResponse.json({
            success: true,
            suggestions: suggestions.slice(0, limit),
            query,
            count: suggestions.length,
            engine: "algolia",
            took,
          })
        }

        // Full search — multi-index with per-index filter building
        console.log(`🟢 [Search API] FULL SEARCH mode`)

        // Only EXPLICIT filters go to Algolia as hard facet filters.
        // NLP-inferred filters are applied as post-filters with soft fallback.
        const commonFacets: string[] = []
        const volunteerFacets: string[] = []
        const opportunityFacets: string[] = []
        if (explicitFilters) {
          if (explicitFilters.workMode) commonFacets.push(`workMode:${explicitFilters.workMode}`)
          if (explicitFilters.isVerified) commonFacets.push(`isVerified:true`)
          if (explicitFilters.causes) {
            const causeList = Array.isArray(explicitFilters.causes) ? explicitFilters.causes : [explicitFilters.causes]
            for (const c of causeList) commonFacets.push(`causeNames:${c}`)
          }
          if (explicitFilters.skills) {
            const skillList = Array.isArray(explicitFilters.skills) ? explicitFilters.skills : [explicitFilters.skills]
            for (const s of skillList) commonFacets.push(`skillNames:${s}`)
          }
          if (explicitFilters.volunteerType) volunteerFacets.push(`volunteerType:${explicitFilters.volunteerType}`)
          if (explicitFilters.availability) volunteerFacets.push(`availability:${explicitFilters.availability}`)
          if (explicitFilters.experienceLevel) opportunityFacets.push(`experienceLevel:${explicitFilters.experienceLevel}`)
        }

        console.log(`🟢 [Search API] Common facets: [${commonFacets.join(", ")}]`)
        if (volunteerFacets.length) console.log(`🟢 [Search API] Volunteer facets: [${volunteerFacets.join(", ")}]`)
        if (opportunityFacets.length) console.log(`🟢 [Search API] Opportunity facets: [${opportunityFacets.join(", ")}]`)

        // Build per-index requests with only the filters that index supports
        const requests = indexNames.map(indexName => {
          const isVolunteer = indexName === ALGOLIA_INDEXES.VOLUNTEERS
          const isOpportunity = indexName === ALGOLIA_INDEXES.OPPORTUNITIES
          const facets = [...commonFacets]
          if (isVolunteer) facets.push(...volunteerFacets)
          if (isOpportunity) facets.push(...opportunityFacets)
          return {
            indexName,
            query: query.trim(),
            hitsPerPage: Math.min(limit, 50),
            facetFilters: facets.length > 0 ? facets : undefined,
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
          }
        })

        console.log(`🟢 [Search API] Sending ${requests.length} multi-index full search requests`)
        const algoliaT0 = Date.now()
        const { results } = await algoliaClient.search({ requests })
        const algoliaMs = Date.now() - algoliaT0
        console.log(`🟢 [Search API] Algolia responded in ${algoliaMs}ms — ${results.length} index results`)
        const mappedResults: any[] = []

        for (const indexResult of results) {
          if (!("hits" in indexResult)) continue
          const ir = indexResult as any
          console.log(`🟢 [Search API] Index "${ir.index}": ${ir.nbHits} total hits, ${ir.hits.length} returned, processingTimeMS=${ir.processingTimeMS}ms`)
          for (const hit of indexResult.hits as any[]) {
            const type = hit.type || (indexResult.index?.includes("volunteer") ? "volunteer" : indexResult.index?.includes("ngo") ? "ngo" : "opportunity")
            const mappedType = type === "project" ? "opportunity" : type

            // Sort skills so query-matching ones appear first
            let skills = hit.skillNames || undefined
            if (skills && query) {
              const queryTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length >= 2)
              skills = [...skills].sort((a: string, b: string) => {
                const aMatch = queryTerms.some((t: string) => a.toLowerCase().includes(t))
                const bMatch = queryTerms.some((t: string) => b.toLowerCase().includes(t))
                if (aMatch && !bMatch) return -1
                if (!aMatch && bMatch) return 1
                return 0
              })
            }

            // Build highlight snippets from Algolia _highlightResult
            const highlights: string[] = []
            if (hit._highlightResult) {
              for (const [key, val] of Object.entries(hit._highlightResult as Record<string, any>)) {
                if (val?.matchLevel === "full" || val?.matchLevel === "partial") {
                  highlights.push(val.value)
                }
              }
            }

            mappedResults.push({
              id: hit.objectID,
              mongoId: hit.objectID,
              userId: hit.objectID,
              type: mappedType,
              title: mappedType === "opportunity" ? hit.title : (hit.name || hit.orgName || ""),
              subtitle: hit.headline || hit.description?.slice(0, 80) || "",
              description: hit.description || hit.bio || hit.mission || "",
              url: mappedType === "volunteer" ? `/volunteers/${hit.objectID}` : mappedType === "ngo" ? `/ngos/${hit.objectID}` : `/opportunities/${hit.objectID}`,
              score: (hit as any)._rankingInfo?.firstMatchedWord ?? 1,
              highlights,
              avatar: hit.avatar || hit.logo || undefined,
              location: [hit.city, hit.country].filter(Boolean).join(", ") || hit.location || undefined,
              skills,
              verified: hit.isVerified || false,
              volunteerType: hit.volunteerType || undefined,
              workMode: hit.workMode || undefined,
              hoursPerWeek: hit.hoursPerWeek || undefined,
              hourlyRate: hit.hourlyRate || undefined,
              experienceLevel: hit.experienceLevel || undefined,
              rating: hit.rating || undefined,
              availability: hit.availability || undefined,
              causes: hit.causeNames || undefined,
              ngoName: hit.ngoName || undefined,
              status: hit.status || undefined,
            })
          }
        }

        // ---- Post-filters: ALL NLP-inferred filters applied here with soft fallback ----
        const maxHoursPerWeek = typeof allFilters.maxHoursPerWeek === "number" ? allFilters.maxHoursPerWeek : null
        const minHoursPerWeek = typeof allFilters.minHoursPerWeek === "number" ? allFilters.minHoursPerWeek : null
        const maxWeeklyBudget = typeof allFilters.maxWeeklyBudget === "number" ? allFilters.maxWeeklyBudget : null
        const maxMonthlyBudget = typeof allFilters.maxMonthlyBudget === "number" ? allFilters.maxMonthlyBudget : null
        const maxHourlyRate = typeof allFilters.maxHourlyRate === "number" ? allFilters.maxHourlyRate : null
        const minRating = typeof allFilters.minRating === "number" ? allFilters.minRating : null
        const filterWorkMode = allFilters.workMode || null
        const filterVolunteerType = allFilters.volunteerType || null
        const filterAvailability = allFilters.availability || null
        const filterExperienceLevel = allFilters.experienceLevel || null
        const filterIsVerified = allFilters.isVerified || false

        const hasPostFilters = maxHoursPerWeek !== null || minHoursPerWeek !== null ||
          maxWeeklyBudget !== null || maxMonthlyBudget !== null ||
          maxHourlyRate !== null || minRating !== null ||
          filterWorkMode !== null || filterVolunteerType !== null ||
          filterAvailability !== null || filterExperienceLevel !== null ||
          filterIsVerified

        // Lexical relevance filter (always applied when query is non-empty)
        const lexicalResults = query
          ? mappedResults.filter((result) => hasStrongLexicalMatch(result, query))
          : mappedResults

        // Apply all NLP-inferred post-filters on top of lexical results
        const strictResults = !hasPostFilters ? lexicalResults : lexicalResults.filter((result) => {
          // Facet-style filters (apply to all types that have the field)
          if (filterWorkMode !== null && result.workMode && result.workMode !== filterWorkMode) return false
          if (filterIsVerified && !result.verified) return false

          // Volunteer-specific filters
          if (result.type === "volunteer") {
            if (filterVolunteerType !== null && result.volunteerType && result.volunteerType !== filterVolunteerType) return false
            if (filterAvailability !== null && result.availability && result.availability !== filterAvailability) return false

            const rate = typeof result.hourlyRate === "number" ? result.hourlyRate : null
            const rating = typeof result.rating === "number" ? result.rating : null
            if (maxHourlyRate !== null && rate !== null && rate > maxHourlyRate) return false
            if (minRating !== null && rating !== null && rating < minRating) return false
            if (maxHoursPerWeek !== null) {
              const upper = parseHoursPerWeekUpperBound(result.hoursPerWeek)
              if (upper !== null && upper > maxHoursPerWeek) return false
            }
            if (minHoursPerWeek !== null) {
              const lower = parseHoursPerWeekLowerBound(result.hoursPerWeek)
              if (lower !== null && lower < minHoursPerWeek) return false
            }
            if (maxWeeklyBudget !== null && rate !== null) {
              const minHrs = parseHoursPerWeekLowerBound(result.hoursPerWeek)
              if (minHrs !== null && rate * minHrs > maxWeeklyBudget) return false
            }
            if (maxMonthlyBudget !== null && rate !== null) {
              const minHrs = parseHoursPerWeekLowerBound(result.hoursPerWeek)
              if (minHrs !== null && rate * minHrs * 4.33 > maxMonthlyBudget) return false
            }
          }

          // Opportunity-specific filters
          if (result.type === "opportunity") {
            if (filterExperienceLevel !== null && result.experienceLevel && result.experienceLevel !== filterExperienceLevel) return false
          }

          return true
        })

        // Soft fallback: if post-filters eliminated ALL results, show lexical matches
        const finalResults = strictResults.length > 0 ? strictResults : lexicalResults
        const filtersRelaxed = hasPostFilters && strictResults.length === 0 && lexicalResults.length > 0

        const took = Date.now() - startTime
        console.log(`🟢 [Search API] ✅ FULL SEARCH DONE — ${finalResults.length} results in ${took}ms (Algolia: ${algoliaMs}ms)${filtersRelaxed ? " [post-filters relaxed — no exact budget matches]" : ""}`)
        for (const r of finalResults.slice(0, 10)) {
          console.log(`   📌 [${r.type}] "${r.title}" — skills: [${(r.skills || []).slice(0, 3).join(", ")}] — ${r.location || "no location"} [id: ${r.id}]`)
        }
        if (finalResults.length > 10) console.log(`   ... and ${finalResults.length - 10} more`)
        console.log(`🔍 [Search API] ==========================================\n`)
        trackEvent("search", "query", { metadata: { query: rawQuery, normalizedQuery: query, engine: "algolia", count: finalResults.length, took } })

        return NextResponse.json({
          success: true,
          results: finalResults.slice(0, limit),
          query: rawQuery,
          normalizedQuery: query,
          count: finalResults.length,
          took,
          engine: "algolia",
          ...(Object.keys(inferredFilters).length > 0 && { inferredFilters }),
          ...(filtersRelaxed && { filtersRelaxed: true }),
        })
      } catch (algoliaError: any) {
        console.error(`❌ [Search API] Algolia FAILED: ${algoliaError?.message}`, algoliaError)
        console.log(`🟡 [Search API] Falling through to ES/MongoDB...`)
        // Fall through to ES or MongoDB
      }
    }

    // ---- ELASTICSEARCH ENGINE ----
    if (engine === "es" && ELASTICSEARCH_ENABLED) {
      // Autocomplete suggestions
      if (mode === "suggestions") {
        const suggestions = await elasticSuggest({
          query,
          types: mapTypes(rawTypes),
          limit: Math.min(limit, 8),
        })

        // Filter suggestions to only include requested types (the ES suggester
        // may inject in-memory skill/cause suggestions that don't match the filter).
        // Always allow skill/cause suggestions through — they help refine searches
        // regardless of the selected entity type.
        const requestedTypes = rawTypes ? new Set(rawTypes) : null
        const mappedSuggestions = suggestions
          .map(s => ({
            text: s.text,
            type: mapResultType(s.type),
            id: s.id,
            subtitle: s.subtitle,
          }))
          .filter(s => !requestedTypes || requestedTypes.has(s.type) || s.type === "skill" || s.type === "cause")

        return NextResponse.json({
          success: true,
          suggestions: mappedSuggestions,
          query,
          count: mappedSuggestions.length,
          engine: "elasticsearch",
        })
      }

      // Full search
      const result = await elasticSearch({
        query,
        types: mapTypes(rawTypes),
        filters: hasFilters ? allFilters : undefined,
        limit: Math.min(limit, 50),
        sort,
      })

      // Map types back and flatten metadata for frontend card components.
      // CRITICAL: For volunteer results, we expose THREE ID fields:
      //   - id:      ES document _id (= user._id = Better Auth user ID)
      //   - mongoId: same as id for volunteers
      //   - userId:  from ES source.userId (= user._id.toString(), set by es-sync)
      // The client uses (r.userId || r.mongoId || r.id) to extract the volunteer ID
      // for cross-referencing with the pre-loaded volunteer list.
      const mappedResults = result.results.map(r => {
        const m = r.metadata || {}
        const locationParts = [m.city, m.country].filter(Boolean)
        const location = m.location || (locationParts.length > 0 ? locationParts.join(", ") : undefined)

        // Sort skills so query-matching ones appear first on cards
        let skills = Array.isArray(m.skillNames) && m.skillNames.length > 0 ? m.skillNames : undefined
        if (skills && query) {
          const queryTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length >= 2)
          skills = [...skills].sort((a: string, b: string) => {
            const aMatch = queryTerms.some((t: string) => a.toLowerCase().includes(t))
            const bMatch = queryTerms.some((t: string) => b.toLowerCase().includes(t))
            if (aMatch && !bMatch) return -1
            if (!aMatch && bMatch) return 1
            return 0
          })
        }

        return {
          id: r.id,
          mongoId: r.mongoId,
          userId: m.userId || undefined,
          type: mapResultType(r.type),
          title: r.title,
          subtitle: r.subtitle,
          description: r.description,
          url: r.url,
          score: r.score,
          highlights: r.highlights,
          avatar: m.avatar || m.logo || undefined,
          location,
          skills,
          verified: m.isVerified || false,
          matchedField: r.highlights?.length > 0 ? r.highlights[0] : undefined,
          volunteerType: m.volunteerType || undefined,
          workMode: m.workMode || undefined,
          experienceLevel: m.experienceLevel || undefined,
          rating: m.rating || undefined,
          causes: Array.isArray(m.causeNames) && m.causeNames.length > 0 ? m.causeNames : undefined,
          ngoName: m.ngoName || undefined,
          status: m.status || undefined,
        }
      })

      // Strictly enforce type filter on the final result set — even if ES
      // returned cross-index matches, only send back what was requested.
      let finalResults = mappedResults
      if (rawTypes && rawTypes.length > 0) {
        const allowedSet = new Set(rawTypes.map(t => t === "project" ? "opportunity" : t))
        finalResults = mappedResults.filter(r => allowedSet.has(r.type))
      }

      // When ES returns no results, fall back to MongoDB.
      // Skip fallback for pure work-mode queries (remote/onsite/hybrid).
      const isPureWorkModeQuery = /^(remote|onsite|on-site|on site|in-person|in person|office|wfh|work from home|virtual|online|hybrid)$/i.test(query.trim())
      if (finalResults.length === 0 && mode !== "suggestions" && !isPureWorkModeQuery) {
        console.log(`[Search API] ES returned 0 results for "${query}" — falling back to MongoDB`)
        const mongoFallbackTypes = rawTypes as ("volunteer" | "ngo" | "opportunity")[] | undefined
        try {
          const mongoResults = await unifiedSearch({ query, types: mongoFallbackTypes, limit: Math.min(limit, 50) })
          return NextResponse.json({
            success: true,
            results: mongoResults,
            query,
            count: mongoResults.length,
            engine: "mongodb-fallback",
          })
        } catch (mongoErr) {
          console.error("[Search API] MongoDB fallback also failed:", mongoErr)
        }
      }

      return NextResponse.json({
        success: true,
        results: finalResults,
        query,
        count: finalResults.length,
        took: result.took,
        didYouMean: (result as any).didYouMean || undefined,
        engine: "elasticsearch",
      })
    }

    // ---- MONGODB FALLBACK ENGINE ----
    const mongoTypes = rawTypes as ("volunteer" | "ngo" | "opportunity")[] | undefined

    if (mode === "suggestions") {
      const suggestions = await getSearchSuggestions({
        query,
        types: mongoTypes,
        limit: Math.min(limit, 8),
      })
      trackEvent("search", "suggest", { metadata: { query, engine: "mongodb", count: suggestions.length } })
      return NextResponse.json({
        success: true,
        suggestions,
        query,
        count: suggestions.length,
        engine: "mongodb",
      })
    }

    const results = await unifiedSearch({
      query,
      types: mongoTypes,
      limit: Math.min(limit, 50),
    })

    trackEvent("search", "query", { metadata: { query, engine: "mongodb", count: results.length, took: Date.now() - startTime } })
    return NextResponse.json({
      success: true,
      results,
      query,
      count: results.length,
      engine: "mongodb",
    })
  } catch (error: any) {
    console.error(`[Search API] ERROR after ${Date.now() - startTime}ms:`, error?.message || error)

    // Mark ES circuit open so subsequent requests skip ES immediately
    markESFailed()

    // If ES fails, try MongoDB fallback
    if (ELASTICSEARCH_ENABLED) {
      try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("q") || ""
        const mode = searchParams.get("mode")
        const typesParam = searchParams.get("types")
        const fallbackTypes = typesParam ? typesParam.split(",") as ("volunteer" | "ngo" | "opportunity")[] : undefined

        if (mode === "suggestions") {
          const suggestions = await getSearchSuggestions({
            query,
            types: fallbackTypes,
            limit: 6,
          })
          return NextResponse.json({
            success: true,
            suggestions,
            query,
            count: suggestions.length,
            engine: "mongodb-fallback",
          })
        }

        const results = await unifiedSearch({ query, types: fallbackTypes, limit: 20 })
        return NextResponse.json({
          success: true,
          results,
          query,
          count: results.length,
          engine: "mongodb-fallback",
        })
      } catch (fallbackError: any) {
        console.error("[Unified Search API] Fallback also failed:", fallbackError)
      }
    }

    return NextResponse.json(
      { success: false, error: error.message || "Search failed", results: [], count: 0 },
      { status: 500 }
    )
  }
}
