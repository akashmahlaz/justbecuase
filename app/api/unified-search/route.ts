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
  let cleanedQuery = rawQuery.trim().replace(/\s+/g, " ")
  const inferredFilters: Record<string, any> = {}

  const workModePatterns: Array<[RegExp, "remote" | "onsite" | "hybrid"]> = [
    [/\b(remote|wfh|work from home|virtual|online)\b/i, "remote"],
    [/\b(onsite|on-site|on site|in-person|in person|office)\b/i, "onsite"],
    [/\bhybrid\b/i, "hybrid"],
  ]
  for (const [pattern, value] of workModePatterns) {
    if (pattern.test(cleanedQuery)) {
      inferredFilters.workMode = value
      cleanedQuery = cleanedQuery.replace(pattern, " ")
      break
    }
  }

  const volunteerTypePatterns: Array<[RegExp, "free" | "paid" | "both"]> = [
    [/\b(pro\s*bono|pro-bono|free)\b/i, "free"],
    [/\bpaid\b/i, "paid"],
    [/\b(either|both)\b/i, "both"],
  ]
  for (const [pattern, value] of volunteerTypePatterns) {
    if (pattern.test(cleanedQuery)) {
      inferredFilters.volunteerType = value
      cleanedQuery = cleanedQuery.replace(pattern, " ")
      break
    }
  }

  const hourlyRatePatterns = [
    /\b(?:under|below|less than|upto|up to|max(?:imum)?)\s*\$?\s*(\d+(?:\.\d+)?)\s*(usd|dollars?|\$|inr|rupees?|rs\.?)?(?:\s*(?:per|\/)\s*(?:hour|hr))?\b/i,
    /\$\s*(\d+(?:\.\d+)?)/i,
    /\b(\d+(?:\.\d+)?)\s*(usd|dollars?|inr|rupees?|rs\.?)\b/i,
  ]
  let matchedRatePhrase: string | null = null
  let matchedRateValue: number | null = null
  for (const pattern of hourlyRatePatterns) {
    const match = cleanedQuery.match(pattern)
    if (match) {
      matchedRateValue = Number(match[1])
      matchedRatePhrase = match[0]
      cleanedQuery = cleanedQuery.replace(match[0], " ")
      break
    }
  }

  const hoursPerWeekMatch = cleanedQuery.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:per|\/|a)?\s*week\b/i)
  if (hoursPerWeekMatch) {
    inferredFilters.maxHoursPerWeek = Number(hoursPerWeekMatch[1])
    cleanedQuery = cleanedQuery.replace(hoursPerWeekMatch[0], " ")
  } else if (matchedRatePhrase) {
    const weeklyBudgetMatch = cleanedQuery.match(/\b(per|a)\s*week\b/i)
    if (weeklyBudgetMatch && matchedRateValue !== null) {
      inferredFilters.maxWeeklyBudget = matchedRateValue
      cleanedQuery = cleanedQuery.replace(weeklyBudgetMatch[0], " ")
    } else if (matchedRateValue !== null) {
      inferredFilters.maxHourlyRate = matchedRateValue
    }
  }

  cleanedQuery = cleanedQuery.replace(/\s+/g, " ").trim()

  return {
    cleanedQuery,
    inferredFilters,
  }
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []
}

function normalizeUnifiedResult(result: Record<string, any>): Record<string, any> {
  const type = mapResultType(result.type || "")
  const skillNames = asStringArray(result.skillNames).length > 0 ? asStringArray(result.skillNames) : asStringArray(result.skills)
  const causeNames = asStringArray(result.causeNames).length > 0 ? asStringArray(result.causeNames) : asStringArray(result.causes)
  const isVerified = result.isVerified ?? result.verified ?? false

  return {
    ...result,
    type,
    id: result.id || result.mongoId || result.userId || "",
    mongoId: result.mongoId || result.id || result.userId || "",
    userId: result.userId || result.mongoId || result.id || "",
    title: result.title || result.name || result.orgName || "",
    subtitle: result.subtitle || result.headline || "",
    description: result.description || result.bio || result.mission || "",
    avatar: result.avatar || result.logo || "",
    location: result.location || "",
    skills: skillNames,
    skillNames,
    causes: causeNames,
    causeNames,
    verified: isVerified === true,
    isVerified: isVerified === true,
    rating: result.rating ?? 0,
    completedProjects: result.completedProjects ?? 0,
    hoursContributed: result.hoursContributed ?? 0,
  }
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

    if (!query || query.trim().length < 1) {
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

    let filters: Record<string, any> | undefined
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam)
      } catch {
        // ignore invalid filters
      }
    }
    filters = Object.keys(inferredFilters).length > 0
      ? { ...inferredFilters, ...(filters || {}) }
      : filters
    if (filters) console.log(`🔍 [Search API] Filters:`, JSON.stringify(filters))

    // ---- ALGOLIA ENGINE (PRIMARY) ----
    if (engine === "algolia" && ALGOLIA_ENABLED) {
      try {
        const algoliaClient = getAlgoliaSearchClient()
        console.log(`🟢 [Search API] Using ALGOLIA engine`)

        // Determine which indexes to search
        const filtersImplyVolunteerOnly = !!(
          filters?.volunteerType ||
          filters?.maxHourlyRate ||
          filters?.maxWeeklyBudget ||
          filters?.maxHoursPerWeek
        )
        const indexNames: string[] = []
        if (!filtersImplyVolunteerOnly && (!rawTypes || rawTypes.includes("ngo"))) indexNames.push(ALGOLIA_INDEXES.NGOS)
        if (!filtersImplyVolunteerOnly && (!rawTypes || rawTypes.includes("opportunity"))) indexNames.push(ALGOLIA_INDEXES.OPPORTUNITIES)
        if (!rawTypes || rawTypes.includes("volunteer") || filtersImplyVolunteerOnly) indexNames.push(ALGOLIA_INDEXES.VOLUNTEERS)
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
              const skillNames = asStringArray(hit.skillNames).length > 0 ? asStringArray(hit.skillNames) : asStringArray(hit.skills)
              let text = hit.name || hit.orgName || hit.title || ""
              let subtitle = hit.headline || hit.description?.slice(0, 60) || ""
              if (type === "opportunity") {
                text = hit.title || ""
                subtitle = [hit.workMode === "remote" ? "Remote" : hit.location, skillNames.slice(0, 2).join(", ")].filter(Boolean).join(" · ")
              } else if (type === "ngo") {
                text = hit.name || hit.orgName || ""
                subtitle = hit.description?.slice(0, 60) || "Organization"
              } else {
                subtitle = hit.headline || skillNames.slice(0, 3).join(", ") || ""
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

        // Full search — multi-index
        console.log(`🟢 [Search API] FULL SEARCH mode`)
        const facetFilters: string[] = []
        const numericFilters: string[] = []
        if (filters) {
          if (filters.workMode) facetFilters.push(`workMode:${filters.workMode}`)
          if (filters.volunteerType) facetFilters.push(`volunteerType:${filters.volunteerType}`)
          if (filters.experienceLevel) facetFilters.push(`experienceLevel:${filters.experienceLevel}`)
          if (filters.isVerified) facetFilters.push(`isVerified:true`)
          if (typeof filters.maxHourlyRate === "number" && Number.isFinite(filters.maxHourlyRate)) {
            numericFilters.push(`hourlyRate<=${filters.maxHourlyRate}`)
          }
          if (typeof filters.minRating === "number" && Number.isFinite(filters.minRating)) {
            numericFilters.push(`rating>=${filters.minRating}`)
          }
          if (filters.causes) {
            const causeList = Array.isArray(filters.causes) ? filters.causes : [filters.causes]
            for (const c of causeList) facetFilters.push(`causeNames:${c}`)
          }
          if (filters.skills) {
            const skillList = Array.isArray(filters.skills) ? filters.skills : [filters.skills]
            for (const s of skillList) facetFilters.push(`skillNames:${s}`)
          }
        }

        // Determine sort parameter
        const sortMap: Record<string, string | undefined> = {
          newest: "updatedAt",
          rating: "rating",
          relevance: undefined,
        }

        if (facetFilters.length > 0) console.log(`🟢 [Search API] Facet filters: [${facetFilters.join(", ")}]`)
        if (numericFilters.length > 0) console.log(`🟢 [Search API] Numeric filters: [${numericFilters.join(", ")}]`)

        const requests = indexNames.map(indexName => ({
          indexName,
          query: query.trim(),
          hitsPerPage: Math.min(limit, 50),
          facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
          numericFilters: numericFilters.length > 0 ? numericFilters : undefined,
          highlightPreTag: "<mark>",
          highlightPostTag: "</mark>",
        }))

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
            let skills = asStringArray(hit.skillNames).length > 0 ? asStringArray(hit.skillNames) : asStringArray(hit.skills)
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
              skillNames: skills,
              verified: hit.isVerified || false,
              isVerified: hit.isVerified || false,
              volunteerType: hit.volunteerType || undefined,
              workMode: hit.workMode || undefined,
              hoursPerWeek: hit.hoursPerWeek || undefined,
              hourlyRate: hit.hourlyRate || undefined,
              experienceLevel: hit.experienceLevel || undefined,
              rating: hit.rating ?? 0,
              completedProjects: hit.completedProjects ?? 0,
              hoursContributed: hit.hoursContributed ?? 0,
              causes: asStringArray(hit.causeNames),
              causeNames: asStringArray(hit.causeNames),
              ngoName: hit.ngoName || undefined,
              status: hit.status || undefined,
            })
          }
        }

        const maxHoursPerWeek = typeof filters?.maxHoursPerWeek === "number" && Number.isFinite(filters.maxHoursPerWeek)
          ? filters.maxHoursPerWeek
          : null
        const maxWeeklyBudget = typeof filters?.maxWeeklyBudget === "number" && Number.isFinite(filters.maxWeeklyBudget)
          ? filters.maxWeeklyBudget
          : null
        const finalResults = mappedResults.filter((result) => {
          if (!hasStrongLexicalMatch(result, query)) return false

          if (result.type !== "volunteer") return true

          if (maxHoursPerWeek !== null) {
            const upperBound = parseHoursPerWeekUpperBound(result.hoursPerWeek)
            if (upperBound !== null && upperBound > maxHoursPerWeek) return false
          }

          if (maxWeeklyBudget !== null) {
            const minHours = parseHoursPerWeekLowerBound(result.hoursPerWeek)
            const hourlyRate = typeof result.hourlyRate === "number" ? result.hourlyRate : null
            if (hourlyRate !== null && minHours !== null && hourlyRate * minHours > maxWeeklyBudget) {
              return false
            }
          }

          return true
        })

        const took = Date.now() - startTime
        console.log(`🟢 [Search API] ✅ FULL SEARCH DONE — ${finalResults.length} results in ${took}ms (Algolia: ${algoliaMs}ms)`)
        for (const r of finalResults.slice(0, 10)) {
          console.log(`   📌 [${r.type}] "${r.title}" — skills: [${(r.skills || []).slice(0, 3).join(", ")}] — ${r.location || "no location"} [id: ${r.id}]`)
        }
        if (finalResults.length > 10) console.log(`   ... and ${finalResults.length - 10} more`)
        console.log(`🔍 [Search API] ==========================================\n`)
        trackEvent("search", "query", { metadata: { query: rawQuery, normalizedQuery: query, engine: "algolia", count: finalResults.length, took } })

        return NextResponse.json({
          success: true,
          results: finalResults.slice(0, limit).map(normalizeUnifiedResult),
          query: rawQuery,
          normalizedQuery: query,
          count: finalResults.length,
          took,
          engine: "algolia",
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
        filters,
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
        let skills = asStringArray(m.skillNames).length > 0 ? asStringArray(m.skillNames) : asStringArray(m.skills)
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
          skillNames: skills || [],
          verified: m.isVerified || false,
          isVerified: m.isVerified || false,
          matchedField: r.highlights?.length > 0 ? r.highlights[0] : undefined,
          volunteerType: m.volunteerType || undefined,
          workMode: m.workMode || undefined,
          experienceLevel: m.experienceLevel || undefined,
          rating: m.rating ?? 0,
          completedProjects: m.completedProjects ?? 0,
          hoursContributed: m.hoursContributed ?? 0,
          causes: asStringArray(m.causeNames),
          causeNames: asStringArray(m.causeNames),
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
            results: mongoResults.map(normalizeUnifiedResult),
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
        results: finalResults.map(normalizeUnifiedResult),
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
      results: results.map(normalizeUnifiedResult),
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
          results: results.map(normalizeUnifiedResult),
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
