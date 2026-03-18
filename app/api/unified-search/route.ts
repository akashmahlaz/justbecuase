import { NextRequest, NextResponse } from "next/server"
import { elasticSearch, elasticSuggest } from "@/lib/es-search"
// MongoDB fallback (kept for graceful degradation)
import { unifiedSearch, getSearchSuggestions } from "@/lib/search-indexes"
import { trackEvent } from "@/lib/analytics"

// ============================================
// Unified Search API — Elasticsearch-powered
// ============================================

const ELASTICSEARCH_ENABLED = !!(process.env.ELASTICSEARCH_URL && process.env.ELASTICSEARCH_API_KEY)

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
    const query = searchParams.get("q") || ""
    const typesParam = searchParams.get("types")
    const limitParam = searchParams.get("limit")
    const mode = searchParams.get("mode") || "full"
    const sort = (searchParams.get("sort") || "relevance") as "relevance" | "newest" | "rating"
    const filtersParam = searchParams.get("filters")
    const engine = searchParams.get("engine") || (ELASTICSEARCH_ENABLED ? "es" : "mongo")

    console.log(`[Search API] query="${query}" mode=${mode} types=${typesParam} engine=${engine}`)

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

      // ── Rich search analytics tracking (ES) ──
      const typeCounts: Record<string, number> = {}
      finalResults.forEach(r => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1 })
      trackEvent("search", "query", {
        metadata: {
          query,
          engine: "elasticsearch",
          count: finalResults.length,
          took: result.took,
          types: rawTypes || ["all"],
          filters: filters ? Object.keys(filters) : [],
          typeBreakdown: typeCounts,
          zeroResult: finalResults.length === 0,
          hasFilters: !!(filters && Object.keys(filters).length > 0),
        },
      })

      return NextResponse.json({
        success: true,
        results: finalResults,
        query,
        count: finalResults.length,
        took: result.took,
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
      trackEvent("search", "suggest", {
        metadata: {
          query,
          engine: "mongodb",
          count: suggestions.length,
          types: mongoTypes || ["all"],
          zeroResult: suggestions.length === 0,
        },
      })
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

    const mongoTook = Date.now() - startTime
    const mongoTypeCounts: Record<string, number> = {}
    results.forEach((r: any) => { mongoTypeCounts[r.type || "unknown"] = (mongoTypeCounts[r.type || "unknown"] || 0) + 1 })
    trackEvent("search", "query", {
      metadata: {
        query,
        engine: "mongodb",
        count: results.length,
        took: mongoTook,
        types: mongoTypes || ["all"],
        typeBreakdown: mongoTypeCounts,
        zeroResult: results.length === 0,
      },
    })
    return NextResponse.json({
      success: true,
      results,
      query,
      count: results.length,
      engine: "mongodb",
    })
  } catch (error: any) {
    console.error(`[Search API] ERROR after ${Date.now() - startTime}ms:`, error?.message || error)

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
