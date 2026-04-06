import { NextRequest, NextResponse } from "next/server"
import { searchJobs, type TheirStackJob, type SearchMetadata } from "@/lib/theirstack"

// ============================================
// GET /api/jobs — Public cached NGO/nonprofit job listings
// ============================================
// Fetches from TheirStack API with in-memory caching to preserve credits.
// Cache TTL: 30 minutes (jobs don't change that frequently).

interface CachedResult {
  data: TheirStackJob[]
  metadata: SearchMetadata
  cachedAt: number
}

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const cache = new Map<string, CachedResult>()

// Default NGO-focused search filters
const DEFAULT_FILTERS = {
  posted_at_max_age_days: 30,
  company_description_pattern_or: [
    "nonprofit", "non-profit", "NGO", "charitable", "social impact",
    "humanitarian", "development organization", "foundation", "civil society",
  ],
  company_description_pattern_not: [
    "research institute", "laboratory", "university", "college",
    "hospital", "government agency", "defense",
  ],
  job_description_contains_or: [
    "volunteer", "volunteering", "volunteer management", "volunteer coordination",
    "community outreach", "community engagement", "social impact", "humanitarian",
    "community service", "civic engagement", "community development", "program manager",
    "fundraising", "grant", "nonprofit",
  ],
  company_type: "direct_employer" as const,
  include_total_results: true,
  blur_company_data: true,
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)))
    const query = searchParams.get("q")?.trim() || ""
    const remote = searchParams.get("remote")
    const country = searchParams.get("country")?.trim() || ""

    // Build cache key from query params
    const cacheKey = JSON.stringify({ page, limit, query, remote, country })

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        jobs: cached.data,
        metadata: cached.metadata,
        cached: true,
      })
    }

    // Build search params
    const params = {
      ...DEFAULT_FILTERS,
      page,
      limit,
      ...(query ? { job_title_pattern_or: [query] } : {}),
      ...(remote === "true" ? { remote: true } : {}),
      ...(country ? { job_country_code_or: [country.toUpperCase()] } : {}),
    }

    const result = await searchJobs(params)

    // Store in cache
    cache.set(cacheKey, {
      data: result.data,
      metadata: result.metadata,
      cachedAt: Date.now(),
    })

    // Evict old cache entries (keep max 50)
    if (cache.size > 50) {
      const oldest = [...cache.entries()]
        .sort((a, b) => a[1].cachedAt - b[1].cachedAt)
        .slice(0, cache.size - 50)
      for (const [key] of oldest) cache.delete(key)
    }

    return NextResponse.json({
      jobs: result.data,
      metadata: result.metadata,
      cached: false,
    })
  } catch (error: any) {
    console.error("Jobs API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch jobs", message: error.message },
      { status: 500 }
    )
  }
}
