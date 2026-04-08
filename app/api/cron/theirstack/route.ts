// filepath: app/api/cron/theirstack/route.ts
import { NextResponse } from "next/server"
import { searchJobs, type TheirStackJob } from "@/lib/theirstack"
import { externalOpportunitiesDb } from "@/lib/scraper"
import type { ExternalOpportunity } from "@/lib/scraper/types"

export const maxDuration = 800 // Vercel Pro max is 800s

// ============================================
// GET /api/cron/theirstack — Daily TheirStack sync
// ============================================
// Fetches NGO/nonprofit remote jobs with $5K+ salary from TheirStack API
// and stores them in the shared externalOpportunities collection.
// They appear natively alongside ReliefWeb/Idealist jobs.
// Runs once per day via Vercel Cron.
// Credit cost: ~50 credits/day (25 jobs × 2 pages)

/** Strip markdown formatting (**, *, #, [](), etc.) from text */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')       // *italic* → italic
    .replace(/__([^_]+)__/g, '$1')       // __bold__ → bold
    .replace(/_([^_]+)_/g, '$1')         // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, '')         // # headings → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/\n{3,}/g, '\n\n')          // collapse triple+ newlines
    .trim()
}

function mapTheirStackToOpportunity(job: TheirStackJob): Omit<ExternalOpportunity, "_id"> {
  const salaryStr = job.salary_string ?? undefined
  const location = job.location ?? "Remote"

  // Build a clean description from available fields
  const descParts: string[] = []
  if (job.description) descParts.push(stripMarkdown(job.description))
  if (salaryStr) descParts.push(`Salary: ${salaryStr}`)
  if (job.technology_slugs?.length) descParts.push(`Technologies: ${job.technology_slugs.join(", ")}`)
  const description = descParts.join("\n\n") || job.job_title

  return {
    sourceplatform: "theirstack",
    externalId: String(job.id),
    sourceUrl: job.final_url || job.url || `https://theirstack.com/jobs/${job.id}`,
    title: job.job_title,
    description,
    shortDescription: description.slice(0, 300),
    organization: job.company,
    organizationUrl: job.company_domain ? `https://${job.company_domain}` : undefined,
    organizationLogo: undefined,
    causes: [],
    skillTags: job.technology_slugs?.slice(0, 10) ?? [],
    skillsRequired: job.technology_slugs?.slice(0, 5).map((tech) => ({
      categoryId: "technology",
      subskillId: tech,
      priority: "nice-to-have" as const,
    })) ?? [],
    experienceLevel: job.seniority ?? undefined,
    workMode: "remote",
    location,
    city: undefined,
    country: undefined,
    timeCommitment: job.employment_statuses?.includes("full-time") ? "40+ hours" : "25-40 hours",
    duration: undefined,
    projectType: "long-term",
    deadline: undefined,
    postedDate: job.date_posted ? new Date(job.date_posted) : new Date(),
    compensationType: "paid",
    salary: salaryStr,
    bodyHtml: undefined,
    howToApplyHtml: undefined,
    isActive: true,
    scrapedAt: new Date(),
    updatedAt: new Date(),
  }
}

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
    let totalFetched = 0
    let totalNew = 0
    let totalUpdated = 0

    // Fetch up to 5000+ jobs (200 pages × 25 per page)
    // Free plan cap: 25 results per page
    const PAGE_SIZE = 25
    const MAX_PAGES = 200

    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        console.log(`[/cron/theirstack] Fetching page ${page}, limit=${PAGE_SIZE}...`)
        const result = await searchJobs({
          page,
          limit: PAGE_SIZE,
          remote: true,
          posted_at_max_age_days: 30,
          include_total_results: false,
          blur_company_data: false,
        })
        console.log(`[/cron/theirstack] Raw result keys: ${Object.keys(result)}, data length: ${result.data?.length}`)
        const data = result.data || []

        totalFetched += data.length

        for (const job of data) {
          try {
            const opportunity = mapTheirStackToOpportunity(job)
            const { isNew } = await externalOpportunitiesDb.upsert(opportunity)
            if (isNew) totalNew++
            else totalUpdated++
          } catch (err) {
            console.error(`[/cron/theirstack] Failed to store job ${job.id}:`, err)
          }
        }

        console.log(`[/cron/theirstack] page=${page}: fetched=${data.length} (total so far: ${totalFetched})`)
        // If fewer than PAGE_SIZE returned, we've reached the end
        if (data.length < PAGE_SIZE) break
      } catch (err: any) {
        console.error(`[/cron/theirstack] Failed for page ${page}:`, err?.message || err)
        break // Stop on error to avoid burning credits
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[/cron/theirstack] Done in ${elapsed}ms — fetched=${totalFetched} new=${totalNew} updated=${totalUpdated}`)

    return NextResponse.json({
      success: true,
      totalFetched,
      totalNew,
      totalUpdated,
      elapsedMs: elapsed,
    })
  } catch (err: any) {
    console.error("[/cron/theirstack] Fatal:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
