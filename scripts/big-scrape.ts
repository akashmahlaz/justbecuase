// ============================================
// Big Scrape — High-Volume Scraping Script
// ============================================
// Scrapes 8,000–10,000+ opportunities per run across all active platforms.
// Uses the runner infrastructure for enrichment + audit logging.
//
// Usage:
//   bun run scripts/big-scrape.ts                     # Full-volume (all platforms)
//   bun run scripts/big-scrape.ts --platform=idealist  # Single platform
//   bun run scripts/big-scrape.ts --quick              # Quick run (25 pages each)

import { scrapeIdealist } from "../lib/scraper/platforms/idealist"
import { scrapeUNJobs } from "../lib/scraper/platforms/unjobs"
import { scrapeImpactpool } from "../lib/scraper/platforms/impactpool"
import { scrapeReliefWeb } from "../lib/scraper/platforms/reliefweb"
import { scrapeCharityJob } from "../lib/scraper/platforms/charityjob"
import { scrapeGoAbroad } from "../lib/scraper/platforms/goabroad"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../lib/scraper/skill-mapper"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb+srv://admin:REDACTED_ROTATED_SECRET@justbecause.rjzpnln.mongodb.net/?appName=justbecause"

// ============================================
// VOLUME PROFILES (pages × ~20-30 items/page)
// ============================================
// Full:  ~300-500 pages each → ~10,000+ items per platform
// Quick: ~25 pages each     → ~2,000 items total

const args = process.argv.slice(2)
const isQuick = args.includes("--quick")
const platformArg = args.find(a => a.startsWith("--platform="))?.split("=")[1]

const FULL_VOLUME = {
  reliefweb: { name: "ReliefWeb",   maxPages: "500" },
  idealist:  { name: "Idealist",    maxPages: "400" },
  unjobs:    { name: "UN Jobs",     maxPages: "400" },
  impactpool:{ name: "Impactpool",  maxPages: "300" },
  devex:     { name: "CharityJob",  maxPages: "200" },
  workforgood:{ name: "GoAbroad",   maxPages: "150" },
}

const QUICK_VOLUME = {
  reliefweb: { name: "ReliefWeb",   maxPages: "25" },
  idealist:  { name: "Idealist",    maxPages: "25" },
  unjobs:    { name: "UN Jobs",     maxPages: "15" },
  impactpool:{ name: "Impactpool",  maxPages: "15" },
}

const SCRAPERS: Record<string, (settings: Record<string, string>) => AsyncGenerator<any>> = {
  reliefweb: scrapeReliefWeb,
  idealist: scrapeIdealist,
  unjobs: scrapeUNJobs,
  impactpool: scrapeImpactpool,
  devex: scrapeCharityJob,
  workforgood: scrapeGoAbroad,
}

async function run() {
  const volume = isQuick ? QUICK_VOLUME : FULL_VOLUME
  const startTime = Date.now()

  console.log(`\n╔════════════════════════════════════════════════╗`)
  console.log(`║   BIG SCRAPE — ${isQuick ? "QUICK" : "FULL VOLUME (8K-10K)"}`)
  console.log(`║   Started: ${new Date().toISOString()}`)
  console.log(`╚════════════════════════════════════════════════╝\n`)

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db("justbecause")
  const col = db.collection("externalOpportunities")

  // Ensure indexes
  await col.createIndex({ sourceplatform: 1, externalId: 1 }, { unique: true }).catch(() => {})
  await col.createIndex({ isActive: 1, scrapedAt: -1 }).catch(() => {})
  await col.createIndex(
    { title: "text", description: "text", organization: "text", location: "text" },
    { name: "external_opp_text" }
  ).catch(() => {})

  const initialCount = await col.countDocuments()
  console.log(`📊 DB currently has ${initialCount.toLocaleString()} opportunities\n`)

  let grandTotal = 0, grandNew = 0, grandUpdated = 0, grandErrors = 0

  // Filter platforms if --platform flag is set
  const platforms = platformArg
    ? { [platformArg]: (volume as any)[platformArg] }
    : volume

  for (const [key, config] of Object.entries(platforms)) {
    const scraperFn = SCRAPERS[key]
    if (!scraperFn || !config) {
      console.error(`⚠️ Unknown platform: ${key}`)
      continue
    }

    console.log(`\n┌─────────────────────────────────────────────┐`)
    console.log(`│ 🔍 ${config.name} — ${config.maxPages} pages`)
    console.log(`└─────────────────────────────────────────────┘`)

    let count = 0, newCount = 0, errorCount = 0
    const platformStart = Date.now()

    try {
      for await (const item of scraperFn({ maxPages: config.maxPages })) {
        try {
          // Enrich with skill/cause mapping
          const allText = [item.title, item.description, item.location || ""].join(" ")
          const enriched = {
            ...item,
            skillsRequired: item.skillsRequired?.length > 0
              ? item.skillsRequired
              : mapSkillTags((item.causes || []).concat(allText.split(/[\s,;:]+/).filter((w: string) => w.length > 3))),
            causes: item.causes?.length > 0
              ? item.causes
              : mapCauseTags(allText.split(/[\s,;:]+/).filter((w: string) => w.length > 3)),
            workMode: item.workMode || detectWorkMode(allText),
            experienceLevel: item.experienceLevel || detectExperienceLevel(allText),
            isActive: true,
            updatedAt: new Date(),
          }

          const result = await col.updateOne(
            { sourceplatform: enriched.sourceplatform, externalId: enriched.externalId },
            { $set: enriched, $setOnInsert: { scrapedAt: new Date() } },
            { upsert: true }
          )
          count++
          grandTotal++
          if (result.upsertedCount > 0) { newCount++; grandNew++ }
          else { grandUpdated++ }

          if (count % 50 === 0) {
            const elapsed = ((Date.now() - platformStart) / 1000).toFixed(0)
            process.stdout.write(`   ⏳ ${count.toLocaleString()} scraped (${newCount} new) — ${elapsed}s\r`)
          }
        } catch (e: any) {
          errorCount++
          grandErrors++
          if (errorCount <= 5) console.error(`   ❌ Item error: ${e.message?.slice(0, 80)}`)
        }
      }
    } catch (e: any) {
      console.error(`   💥 Platform error: ${e.message}`)
    }

    const elapsed = ((Date.now() - platformStart) / 1000).toFixed(1)
    console.log(`   ✅ ${config.name}: ${count.toLocaleString()} scraped | ${newCount.toLocaleString()} new | ${errorCount} errors | ${elapsed}s`)
  }

  const finalCount = await col.countDocuments()
  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  console.log(`\n╔════════════════════════════════════════════════╗`)
  console.log(`║   SCRAPE COMPLETE                              `)
  console.log(`╠════════════════════════════════════════════════╣`)
  console.log(`║   Total scraped:  ${grandTotal.toLocaleString().padStart(8)}                     `)
  console.log(`║   New items:      ${grandNew.toLocaleString().padStart(8)}                     `)
  console.log(`║   Updated:        ${grandUpdated.toLocaleString().padStart(8)}                     `)
  console.log(`║   Errors:         ${grandErrors.toLocaleString().padStart(8)}                     `)
  console.log(`║   DB before:      ${initialCount.toLocaleString().padStart(8)}                     `)
  console.log(`║   DB after:       ${finalCount.toLocaleString().padStart(8)}                     `)
  console.log(`║   Duration:       ${totalElapsed.padStart(5)} min                     `)
  console.log(`╚════════════════════════════════════════════════╝`)

  await client.close()
}

run().catch(console.error)
