// ============================================
// fetch-all-5k.ts — Fetch 5000+ jobs from ReliefWeb + Idealist APIs
// ============================================
// Direct script to pull maximum volume from both APIs and upsert to DB.
// Usage: bun run scripts/fetch-all-5k.ts

import { fetchAllJobsUnfiltered, mapApiJobToOpportunity } from "../lib/reliefweb-api"
import { fetchAllNonprofitJobs, mapJobToOpportunity } from "../lib/idealist-api"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb+srv://admin:ewXAu2Gg19YZbFn2@justbecause.rjzpnln.mongodb.net/?appName=justbecause"

async function upsertOne(col: any, opp: any) {
  const result = await col.updateOne(
    { sourceplatform: opp.sourceplatform, externalId: opp.externalId },
    { $set: opp },
    { upsert: true }
  )
  return result.upsertedCount > 0
}

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db("justbecause")
  const col = db.collection("externalOpportunities")

  // Ensure indexes
  await col.createIndex({ sourceplatform: 1, externalId: 1 }, { unique: true }).catch(() => {})
  await col.createIndex({ isActive: 1, scrapedAt: -1 }).catch(() => {})

  const startTime = Date.now()

  // ── ReliefWeb ────────────────────────────────────────────────
  console.log("\n🌐 Fetching ReliefWeb (all ~900 jobs)...")
  const rwStart = Date.now()
  let rwNew = 0, rwUpdated = 0, rwErrors = 0

  try {
    const { jobs: rwJobs } = await fetchAllJobsUnfiltered()
    console.log(`   → ${rwJobs.length} ReliefWeb jobs from API`)

    for (const job of rwJobs) {
      try {
        const opp = mapApiJobToOpportunity(job)
        opp.scrapedAt = new Date()
        opp.updatedAt = new Date()
        const isNew = await upsertOne(col, opp)
        if (isNew) rwNew++; else rwUpdated++
      } catch (e: any) {
        rwErrors++
        if (rwErrors <= 3) console.error(`   RW error: ${e.message?.slice(0, 80)}`)
      }
    }
    console.log(`   ✅ RW: ${rwNew} new, ${rwUpdated} updated, ${rwErrors} errors in ${((Date.now() - rwStart) / 1000).toFixed(1)}s`)
  } catch (e: any) {
    console.error(`   💥 ReliefWeb fatal: ${e.message}`)
  }

  // ── Idealist ──────────────────────────────────────────────────
  console.log("\n🌐 Fetching Idealist (up to 5000 jobs)...")
  const istStart = Date.now()
  let istNew = 0, istUpdated = 0, istErrors = 0

  try {
    const istJobs = await fetchAllNonprofitJobs(5000)
    console.log(`   → ${istJobs.length} Idealist jobs from API`)

    for (const job of istJobs) {
      try {
        const opp = mapJobToOpportunity(job)
        opp.scrapedAt = new Date()
        opp.updatedAt = new Date()
        const isNew = await upsertOne(col, opp)
        if (isNew) istNew++; else istUpdated++
      } catch (e: any) {
        istErrors++
        if (istErrors <= 3) console.error(`   IST error: ${e.message?.slice(0, 80)}`)
      }
    }
    console.log(`   ✅ IST: ${istNew} new, ${istUpdated} updated, ${istErrors} errors in ${((Date.now() - istStart) / 1000).toFixed(1)}s`)
  } catch (e: any) {
    console.error(`   💥 Idealist fatal: ${e.message}`)
  }

  // ── Summary ────────────────────────────────────────────────────
  const totalNew = rwNew + istNew
  const totalUpdated = rwUpdated + istUpdated
  const totalErrors = rwErrors + istErrors
  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  console.log(`\n╔═══════════════════════════════════════╗`)
  console.log(`║          SCRAPE COMPLETE              ║`)
  console.log(`╠═══════════════════════════════════════╣`)
  console.log(`║  ReliefWeb:  ${String(rwNew).padStart(4)} new  ${String(rwUpdated).padStart(5)} updated`)
  console.log(`║  Idealist:   ${String(istNew).padStart(4)} new  ${String(istUpdated).padStart(5)} updated`)
  console.log(`║  Total new:  ${totalNew}                      `)
  console.log(`║  Total upda: ${totalUpdated}                      `)
  console.log(`║  Errors:     ${totalErrors}                      `)
  console.log(`║  Duration:   ${totalElapsed} min                  `)
  console.log(`╚═══════════════════════════════════════╝`)

  await client.close()
}

main().catch(console.error)
