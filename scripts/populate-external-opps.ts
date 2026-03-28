import { externalOpportunitiesDb, scraperConfigsDb } from "../lib/scraper/db"
import { runScraper } from "../lib/scraper/runner"
import type { ScraperPlatform } from "../lib/scraper/types"

const TARGETS: Array<{ platform: ScraperPlatform; cronSchedule: string; settings: Record<string, string> }> = [
  { platform: "idealist", cronSchedule: "0 4 * * *", settings: { maxPages: "5" } },
  { platform: "unjobs", cronSchedule: "0 6 * * *", settings: { maxPages: "3" } },
  { platform: "impactpool", cronSchedule: "30 5 * * *", settings: { maxPages: "3" } },
]

async function main() {
  console.log(`[populate] started ${new Date().toISOString()}`)

  await externalOpportunitiesDb.ensureIndexes()
  await scraperConfigsDb.seedDefaults()

  for (const target of TARGETS) {
    const existing = await scraperConfigsDb.getByPlatform(target.platform)
    await scraperConfigsDb.upsert({
      platform: target.platform,
      enabled: true,
      cronSchedule: target.cronSchedule,
      totalItemsScraped: existing?.totalItemsScraped || 0,
      lastRunAt: existing?.lastRunAt,
      lastRunStatus: existing?.lastRunStatus,
      settings: { ...(existing?.settings || {}), ...target.settings },
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    })
  }

  const beforeCounts = await externalOpportunitiesDb.countByPlatform()
  console.log(`[populate] before counts: ${JSON.stringify(beforeCounts)}`)

  const runs = [] as Array<{
    platform: ScraperPlatform
    status: string
    itemsScraped: number
    itemsNew: number
    itemsUpdated: number
    itemsSkipped: number
    errorCount: number
  }>

  for (const target of TARGETS) {
    console.log(`[populate] running ${target.platform}...`)
    const result = await runScraper(target.platform, "manual")
    runs.push({
      platform: target.platform,
      status: result.status,
      itemsScraped: result.itemsScraped,
      itemsNew: result.itemsNew,
      itemsUpdated: result.itemsUpdated,
      itemsSkipped: result.itemsSkipped,
      errorCount: result.errors.length,
    })
    console.log(`[populate] ${target.platform} => ${JSON.stringify(runs[runs.length - 1])}`)
    if (result.errors.length) {
      console.log(`[populate] ${target.platform} errors:`)
      for (const err of result.errors) console.log(`  - ${err}`)
    }
  }

  const afterCounts = await externalOpportunitiesDb.countByPlatform()
  console.log(`[populate] after counts: ${JSON.stringify(afterCounts)}`)

  const deltas = Object.fromEntries(
    TARGETS.map(({ platform }) => [platform, (afterCounts[platform] || 0) - (beforeCounts[platform] || 0)])
  )

  const summary = {
    beforeCounts,
    afterCounts,
    deltas,
    runs,
    totalInsertedAcrossTargets: Object.values(deltas).reduce((sum, value) => sum + value, 0),
  }

  console.log("[populate] summary")
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error("[populate] fatal error", error)
  process.exit(1)
})
