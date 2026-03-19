// ============================================
// Base Scraper Runner
// ============================================
// Orchestrates scraping: creates run log, calls platform scraper, upserts results.

import { externalOpportunitiesDb, scraperRunsDb, scraperConfigsDb } from "./db"
import type { ScraperPlatform, ScrapedOpportunity, ScraperRun, ExternalOpportunity } from "./types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "./skill-mapper"

// Platform scraper registry
import { scrapeReliefWeb } from "./platforms/reliefweb"
import { scrapeIdealist } from "./platforms/idealist"
import { scrapeUNJobs } from "./platforms/unjobs"

type PlatformScraper = (settings: Record<string, string>) => AsyncGenerator<ScrapedOpportunity>

const SCRAPERS: Record<string, PlatformScraper> = {
  reliefweb: scrapeReliefWeb,
  idealist: scrapeIdealist,
  unjobs: scrapeUNJobs,
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
