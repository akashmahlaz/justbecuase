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
    const engine = searchParams.get("engine") || (ALGOLIA_ENABLED ? "algolia" : ELASTICSEARCH_ENABLED && isESAvailable() ? "es" : "mongo")

    console.log(`\n🔍 [Search API] ========== ${mode.toUpperCase()} REQUEST ==========`)
    console.log(`🔍 [Search API] Query: "${query}"`)
    console.log(`🔍 [Search API] Mode: ${mode} | Engine: ${engine} | Types: ${typesParam || "all"} | Limit: ${limitParam || "default"} | Sort: ${sort}`)
    console.log(`🔍 [Search API] ALGOLIA_ENABLED: ${ALGOLIA_ENABLED} | ES_ENABLED: ${ELASTICSEARCH_ENABLED} | ES_AVAILABLE: ${ELASTICSEARCH_ENABLED ? isESAvailable() : "N/A"}`)

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
    if (filters) console.log(`🔍 [Search API] Filters:`, JSON.stringify(filters))

    // ---- ALGOLIA ENGINE (PRIMARY) ----
    if (engine === "algolia" && ALGOLIA_ENABLED) {
      try {
        const algoliaClient = getAlgoliaSearchClient()
        console.log(`🟢 [Search API] Using ALGOLIA engine`)

        // Determine which indexes to search
        const indexNames: string[] = []
        if (!rawTypes || rawTypes.includes("volunteer")) indexNames.push(ALGOLIA_INDEXES.VOLUNTEERS)
        if (!rawTypes || rawTypes.includes("ngo")) indexNames.push(ALGOLIA_INDEXES.NGOS)
        if (!rawTypes || rawTypes.includes("opportunity")) indexNames.push(ALGOLIA_INDEXES.OPPORTUNITIES)
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

        // Full search — multi-index
        console.log(`🟢 [Search API] FULL SEARCH mode`)
        const facetFilters: string[] = []
        if (filters) {
          if (filters.workMode) facetFilters.push(`workMode:${filters.workMode}`)
          if (filters.volunteerType) facetFilters.push(`volunteerType:${filters.volunteerType}`)
          if (filters.experienceLevel) facetFilters.push(`experienceLevel:${filters.experienceLevel}`)
          if (filters.isVerified) facetFilters.push(`isVerified:true`)
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

        const requests = indexNames.map(indexName => ({
          indexName,
          query: query.trim(),
          hitsPerPage: Math.min(limit, 50),
          facetFilters: facetFilters.length > 0 ? facetFilters : undefined,
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
              experienceLevel: hit.experienceLevel || undefined,
              rating: hit.rating || undefined,
              causes: hit.causeNames || undefined,
              ngoName: hit.ngoName || undefined,
              status: hit.status || undefined,
            })
          }
        }

        const took = Date.now() - startTime
        console.log(`🟢 [Search API] ✅ FULL SEARCH DONE — ${mappedResults.length} results in ${took}ms (Algolia: ${algoliaMs}ms)`)
        for (const r of mappedResults.slice(0, 10)) {
          console.log(`   📌 [${r.type}] "${r.title}" — skills: [${(r.skills || []).slice(0, 3).join(", ")}] — ${r.location || "no location"} [id: ${r.id}]`)
        }
        if (mappedResults.length > 10) console.log(`   ... and ${mappedResults.length - 10} more`)
        console.log(`🔍 [Search API] ==========================================\n`)
        trackEvent("search", "query", { metadata: { query, engine: "algolia", count: mappedResults.length, took } })

        return NextResponse.json({
          success: true,
          results: mappedResults.slice(0, limit),
          query,
          count: mappedResults.length,
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
