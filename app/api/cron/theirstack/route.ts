// filepath: app/api/cron/theirstack/route.ts
import { NextResponse } from "next/server"
import { ASIA_COUNTRY_CODES, runTheirStackSync } from "@/lib/theirstack-sync"

export const maxDuration = 800 // Vercel Pro max is 800s

function parseCsv(value: string | null): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCountryCodes(value: string | null): string[] {
  return parseCsv(value).map((code) => code.toUpperCase())
}

function parseLocationIds(value: string | null): number[] {
  return parseCsv(value)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
}

// ============================================
// GET /api/cron/theirstack — Daily TheirStack sync
// ============================================
// Fetches NGO/nonprofit-related jobs from TheirStack using the same
// NGO filters as the prospecting tooling and stores them in the shared
// externalOpportunities collection. Supports preview mode for low-credit testing.

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const startTime = Date.now()
    const { searchParams } = new URL(request.url)
    const preview = searchParams.get("preview") === "true"
    const remoteOnly = searchParams.get("remoteOnly") === "true"
    const onlyWithContacts = searchParams.get("onlyWithContacts") !== "false"
    const maxAgeDays = Number(searchParams.get("maxAgeDays") || "30")
    const maxJobs = Number(searchParams.get("maxJobs") || "50")
    const maxPages = Number(searchParams.get("maxPages") || "10")
    const region = searchParams.get("region")?.toLowerCase()
    const countryCodes = region === "asia"
      ? Array.from(new Set([...ASIA_COUNTRY_CODES, ...parseCountryCodes(searchParams.get("countryCodes"))]))
      : parseCountryCodes(searchParams.get("countryCodes"))
    const locationPatterns = parseCsv(searchParams.get("locationPatterns"))
    const locationIds = parseLocationIds(searchParams.get("locationIds"))

    console.log(
      `[/cron/theirstack] Starting sync preview=${preview} remoteOnly=${remoteOnly} countryCodes=${countryCodes.join("|") || "all"} locationPatterns=${locationPatterns.join("|") || "none"} locationIds=${locationIds.join("|") || "none"} maxJobs=${maxJobs} maxPages=${maxPages}`
    )

    const result = await runTheirStackSync({
      preview,
      remoteOnly,
      onlyWithContacts,
      maxAgeDays,
      maxJobs,
      maxPages,
      countryCodes,
      locationPatterns,
      locationIds,
      pageSize: 25,
    })

    const elapsed = Date.now() - startTime
    console.log(
      `[/cron/theirstack] Done in ${elapsed}ms — fetched=${result.stats.fetched} unique=${result.stats.uniqueJobs} inserted=${result.stats.inserted} updated=${result.stats.updated}`
    )

    return NextResponse.json({
      success: true,
      preview,
      query: result.query,
      sampleJobs: preview
        ? result.jobs.slice(0, 5).map((job) => ({
            id: job.id,
            title: job.job_title,
            company: job.company,
            location: job.location || job.long_location || job.short_location || null,
            country: job.country || job.countries?.[0] || job.locations?.[0]?.country_name || null,
            countryCodes: job.country_codes || (job.country_code ? [job.country_code] : []),
            remote: job.remote,
            hybrid: job.hybrid,
            datePosted: job.date_posted,
          }))
        : undefined,
      totalFetched: result.stats.fetched,
      totalUnique: result.stats.uniqueJobs,
      totalNew: result.stats.inserted,
      totalUpdated: result.stats.updated,
      totalAvailable: result.stats.totalAvailable,
      remainingCredits: result.stats.remainingCredits,
      skippedReason: result.stats.skippedReason,
      geography: {
        remoteOnly,
        countryCodes,
        locationPatterns,
        locationIds,
      },
      elapsedMs: elapsed,
    })
  } catch (err: any) {
    console.error("[/cron/theirstack] Fatal:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
