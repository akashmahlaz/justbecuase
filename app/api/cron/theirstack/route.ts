// filepath: app/api/cron/theirstack/route.ts
import { NextResponse } from "next/server"
import { searchJobs } from "@/lib/theirstack"
import { theirstackJobsDb, type TheirStackJobDoc } from "@/lib/theirstack-jobs"

export const maxDuration = 300

// ============================================
// GET /api/cron/theirstack — Daily TheirStack sync
// ============================================
// Fetches fresh jobs from TheirStack API and stores them in MongoDB.
// Runs once per day via Vercel Cron (vercel.json).
// Credit cost: ~50 credits/day (25 jobs × 2 countries)
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
    const syncedAt = new Date()
    const countries = ["IN", "US"]
    const limit = 25
    let totalFetched = 0
    let totalStored = 0

    for (const country of countries) {
      try {
        const { data } = await searchJobs({
          limit,
          job_country_code_or: [country],
          posted_at_max_age_days: 30,
          company_type: "direct_employer",
          include_total_results: false,
          blur_company_data: false,
        })

        totalFetched += data.length

        const docs: Omit<TheirStackJobDoc, "_id" | "syncedAt">[] = data.map((j) => ({
          theirstackId: j.id,
          job_title: j.job_title,
          company: j.company,
          company_domain: j.company_domain ?? null,
          location: j.location ?? null,
          remote: j.remote,
          hybrid: j.hybrid,
          salary_string: j.salary_string ?? null,
          min_annual_salary_usd: j.min_annual_salary_usd ?? null,
          max_annual_salary_usd: j.max_annual_salary_usd ?? null,
          seniority: j.seniority ?? null,
          employment_statuses: j.employment_statuses ?? [],
          description: j.description ?? null,
          technology_slugs: j.technology_slugs ?? [],
          keyword_slugs: j.keyword_slugs ?? [],
          url: j.url ?? null,
          final_url: j.final_url ?? null,
          date_posted: j.date_posted ?? null,
          country_code: country,
        }))

        const { inserted, replaced } = await theirstackJobsDb.upsertBatch(docs, syncedAt)
        totalStored += inserted + replaced
        console.log(`[/cron/theirstack] ${country}: fetched=${data.length} inserted=${inserted} replaced=${replaced}`)
      } catch (err) {
        console.error(`[/cron/theirstack] Failed for ${country}:`, err)
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[/cron/theirstack] Done in ${elapsed}ms — totalFetched=${totalFetched} totalStored=${totalStored}`)

    return NextResponse.json({
      success: true,
      syncedAt: syncedAt.toISOString(),
      totalFetched,
      totalStored,
      elapsedMs: elapsed,
    })
  } catch (err: any) {
    console.error("[/cron/theirstack] Fatal:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
