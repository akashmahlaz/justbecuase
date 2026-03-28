// ============================================
// Base Scraper Runner
// ============================================
// Orchestrates scraping: creates run log, calls platform scraper, upserts results.

import { externalOpportunitiesDb, scraperRunsDb, scraperConfigsDb } from "./db"
import type { ScraperPlatform, ScrapedOpportunity, ScraperRun, ExternalOpportunity } from "./types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "./skill-mapper"
import { fetchPage, extractPageContent } from "./text-extractor"
import { sendEmail } from "@/lib/email"

// Platform scraper registry
import { scrapeReliefWeb } from "./platforms/reliefweb"
import { scrapeIdealist } from "./platforms/idealist"
import { scrapeUNJobs } from "./platforms/unjobs"
import { scrapeCharityJob } from "./platforms/charityjob"
import { scrapeImpactpool } from "./platforms/impactpool"
import { scrapeGoAbroad } from "./platforms/goabroad"
import { scrapeDevNetJobs } from "./platforms/devnetjobs"

type PlatformScraper = (settings: Record<string, string>) => AsyncGenerator<ScrapedOpportunity>

const SCRAPERS: Record<string, PlatformScraper> = {
  reliefweb: scrapeReliefWeb,
  idealist: scrapeIdealist,
  unjobs: scrapeUNJobs,
  devex: scrapeCharityJob,
  impactpool: scrapeImpactpool,
  workforgood: scrapeGoAbroad,
  devnetjobs: scrapeDevNetJobs,
}

/**
 * Run a scraper for a specific platform.
 * Yields progress updates; returns final run summary.
 */
export async function runScraper(
  platform: ScraperPlatform,
  triggeredBy: "cron" | "manual" = "manual"
): Promise<ScraperRun> {
  const scraperFn = SCRAPERS[platform]
  if (!scraperFn) {
    throw new Error(`No scraper registered for platform: ${platform}`)
  }

  // Get config
  const config = await scraperConfigsDb.getByPlatform(platform)
  const settings = config?.settings || {}
  const deepScrapeEnabled = settings.deepScrape === "true"
  const maxDeepScrapes = parseInt(settings.maxDetailPages || "50", 10)
  let deepScrapeCount = 0

  // Create run record
  const run: Omit<ScraperRun, "_id"> = {
    platform,
    status: "running",
    startedAt: new Date(),
    itemsScraped: 0,
    itemsNew: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    errors: [],
    triggeredBy,
  }
  const runId = await scraperRunsDb.create(run)

  try {
    const generator = scraperFn(settings)

    for await (const item of generator) {
      try {
        // Transform scraped item to our external opportunity format
        const opportunity = transformToOpportunity(item)
        const { isNew } = await externalOpportunitiesDb.upsert(opportunity)

        run.itemsScraped++
        if (isNew) run.itemsNew++
        else run.itemsUpdated++

        // Deep scrape: fetch detail page for NEW items or EXISTING items with thin descriptions
        const shouldDeepScrape = deepScrapeEnabled
          && deepScrapeCount < maxDeepScrapes
          && item.sourceUrl
          && (isNew || opportunity.description.length < 500)

        if (shouldDeepScrape) {
          try {
            const enriched = await deepScrapeDetailPage(item.sourceUrl, item.sourceplatform)
            if (enriched) {
              await externalOpportunitiesDb.enrich(item.sourceplatform, item.externalId, enriched)
            }
            deepScrapeCount++
            await new Promise(r => setTimeout(r, 1200)) // rate limit
          } catch {
            // Non-fatal — listing data is already saved
          }
        }
      } catch (err) {
        run.itemsSkipped++
        const msg = err instanceof Error ? err.message : String(err)
        if (run.errors.length < 20) run.errors.push(msg)
      }
    }

    run.status = "completed"
  } catch (err) {
    run.status = "failed"
    const msg = err instanceof Error ? err.message : String(err)
    run.errors.push(`Fatal: ${msg}`)
  }

  run.completedAt = new Date()

  // Update run record
  await scraperRunsDb.update(runId, {
    status: run.status,
    completedAt: run.completedAt,
    itemsScraped: run.itemsScraped,
    itemsNew: run.itemsNew,
    itemsUpdated: run.itemsUpdated,
    itemsSkipped: run.itemsSkipped,
    errors: run.errors,
  })

  // Update config with last run status
  await scraperConfigsDb.updateRunStatus(platform, run.status, run.itemsNew)

  // Send email notification
  await sendScraperEmail(run as ScraperRun)

  return run as ScraperRun
}

/**
 * Run all enabled scrapers sequentially.
 */
export async function runAllScrapers(triggeredBy: "cron" | "manual" = "cron") {
  const configs = await scraperConfigsDb.getAll()
  const enabledPlatforms = configs.filter(c => c.enabled).map(c => c.platform)

  // Seed defaults if no configs exist
  if (configs.length === 0) {
    await scraperConfigsDb.seedDefaults()
    return runAllScrapers(triggeredBy)
  }

  const results: ScraperRun[] = []
  for (const platform of enabledPlatforms) {
    if (SCRAPERS[platform]) {
      const result = await runScraper(platform, triggeredBy)
      results.push(result)
    }
  }
  return results
}

/**
 * Transform a ScrapedOpportunity into an ExternalOpportunity document.
 */
function transformToOpportunity(item: ScrapedOpportunity): Omit<ExternalOpportunity, "_id"> {
  // Combine all text for enrichment
  const allText = [item.title, item.description, item.location || ""].join(" ")

  // Map skill tags from raw data + detected from description
  const rawSkillTags = item.skillsRequired.length > 0
    ? item.skillsRequired.map(s => s.subskillId)
    : [] // Will rely on description analysis

  const skillTags = [...new Set([
    ...rawSkillTags,
    ...(item.causes || []),
  ])]

  const mappedSkills = item.skillsRequired.length > 0
    ? item.skillsRequired
    : mapSkillTags(skillTags)

  const mappedCauses = item.causes.length > 0
    ? item.causes
    : mapCauseTags(skillTags)

  return {
    sourceplatform: item.sourceplatform,
    externalId: item.externalId,
    sourceUrl: item.sourceUrl,
    title: item.title,
    description: item.description,
    shortDescription: item.shortDescription || item.description.slice(0, 280),
    organization: item.organization,
    organizationUrl: item.organizationUrl,
    organizationLogo: item.organizationLogo,
    causes: mappedCauses,
    skillTags,
    skillsRequired: mappedSkills,
    experienceLevel: item.experienceLevel || detectExperienceLevel(allText),
    workMode: item.workMode || detectWorkMode(allText),
    location: item.location,
    city: item.city,
    country: item.country,
    timeCommitment: item.timeCommitment,
    duration: item.duration,
    projectType: item.projectType,
    deadline: item.deadline,
    postedDate: item.postedDate,
    compensationType: item.compensationType,
    salary: item.salary,
    isActive: true,
    scrapedAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Deep scrape a detail page to extract rich structured data.
 * Uses the text extractor (JSON-LD, OG, DOM heuristics) for any URL.
 * Returns partial fields to merge into the existing record.
 */
async function deepScrapeDetailPage(
  url: string,
  platform: ScraperPlatform
): Promise<Partial<ExternalOpportunity> | null> {
  try {
    const html = await fetchPage(url)
    const baseUrl = new URL(url).origin
    const content = extractPageContent(html, baseUrl)

    if (!content.title && !content.description) return null

    const allText = [content.title, content.description, content.location || "", ...content.tags].join(" ")

    const enriched: Partial<ExternalOpportunity> = {}

    // Only override fields with richer data (longer description, non-empty values)
    if (content.description && content.description.length > 100) {
      enriched.description = content.description.slice(0, 25000)
      enriched.shortDescription = content.description.slice(0, 280)
    }
    if (content.organization) enriched.organization = content.organization
    if (content.organizationUrl) enriched.organizationUrl = content.organizationUrl
    if (content.location) {
      enriched.location = content.location
      const parts = content.location.split(",").map(s => s.trim())
      if (parts.length > 1) enriched.country = parts[parts.length - 1]
    }
    if (content.deadline) {
      const d = new Date(content.deadline)
      if (!isNaN(d.getTime())) enriched.deadline = d
    }
    if (content.postedDate) {
      const d = new Date(content.postedDate)
      if (!isNaN(d.getTime())) enriched.postedDate = d
    }
    if (content.salary) enriched.salary = content.salary
    if (content.duration) enriched.duration = content.duration
    if (content.experienceLevel) enriched.experienceLevel = content.experienceLevel

    // Re-map skills and causes from the richer text
    const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
    const skills = mapSkillTags(words)
    const causes = mapCauseTags(words)
    if (skills.length > 0) enriched.skillsRequired = skills
    if (causes.length > 0) enriched.causes = causes

    enriched.experienceLevel = content.experienceLevel || detectExperienceLevel(allText)
    const wm = content.workMode || detectWorkMode(allText)
    if (wm === "remote" || wm === "onsite" || wm === "hybrid") enriched.workMode = wm

    return Object.keys(enriched).length > 0 ? enriched : null
  } catch {
    return null
  }
}

const SCRAPER_NOTIFY_EMAILS = ["akashdalla406@gmail.com", "julesfern@gmail.com"]

async function sendScraperEmail(run: ScraperRun) {
  try {
    const duration = run.completedAt && run.startedAt
      ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
      : 0
    const mins = Math.floor(duration / 60)
    const secs = duration % 60
    const isSuccess = run.status === "completed"
    const emoji = isSuccess ? "✅" : "❌"
    const errorSection = run.errors.length > 0
      ? `<tr><td style="padding:8px 12px;color:#64748b">Errors</td><td style="padding:8px 12px;color:#ef4444">${run.errors.slice(0, 5).join("<br/>")}</td></tr>`
      : ""

    await sendEmail({
      to: SCRAPER_NOTIFY_EMAILS,
      subject: `${emoji} Scraper ${run.platform} — ${run.status} | ${run.itemsNew} new, ${run.itemsScraped} total`,
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="margin:0 0 16px;color:${isSuccess ? '#16a34a' : '#dc2626'}">${emoji} ${run.platform.toUpperCase()} Scraper ${run.status}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Platform</td><td style="padding:8px 12px;font-weight:600">${run.platform}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Status</td><td style="padding:8px 12px;font-weight:600;color:${isSuccess ? '#16a34a' : '#dc2626'}">${run.status}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Items Scraped</td><td style="padding:8px 12px;font-weight:600">${run.itemsScraped}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">New Items</td><td style="padding:8px 12px;font-weight:600;color:#2563eb">${run.itemsNew}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Updated</td><td style="padding:8px 12px">${run.itemsUpdated}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Skipped</td><td style="padding:8px 12px">${run.itemsSkipped}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Duration</td><td style="padding:8px 12px">${mins}m ${secs}s</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Triggered By</td><td style="padding:8px 12px">${run.triggeredBy}</td></tr>
            ${errorSection}
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">JustBeCause Scraper System — ${new Date().toUTCString()}</p>
        </div>
      `,
    })
  } catch {
    console.warn(`[Scraper] Failed to send email notification for ${run.platform}`)
  }
}
