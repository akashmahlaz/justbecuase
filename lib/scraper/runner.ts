// ============================================
// Base Scraper Runner
// ============================================
// Orchestrates scraping: creates run log, calls platform scraper, upserts results.

import { externalOpportunitiesDb, scraperRunsDb, scraperConfigsDb } from "./db"
import type { ScraperPlatform, ScrapedOpportunity, ScraperRun, ExternalOpportunity } from "./types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "./skill-mapper"
import { fetchPage, extractPageContent } from "./text-extractor"

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

        // Deep scrape: fetch detail page for new items to get richer data
        if (isNew && deepScrapeEnabled && deepScrapeCount < maxDeepScrapes && item.sourceUrl) {
          try {
            const enriched = await deepScrapeDetailPage(item.sourceUrl, item.sourceplatform)
            if (enriched) {
              await externalOpportunitiesDb.enrich(item.sourceplatform, item.externalId, enriched)
            }
            deepScrapeCount++
            await new Promise(r => setTimeout(r, 1500)) // rate limit
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
      enriched.description = content.description.slice(0, 10000)
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

    // Re-map skills and causes from the richer text
    const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
    const skills = mapSkillTags(words)
    const causes = mapCauseTags(words)
    if (skills.length > 0) enriched.skillsRequired = skills
    if (causes.length > 0) enriched.causes = causes

    enriched.experienceLevel = detectExperienceLevel(allText)
    enriched.workMode = detectWorkMode(allText)

    return Object.keys(enriched).length > 0 ? enriched : null
  } catch {
    return null
  }
}
