import { NextResponse } from "next/server"
import { fetchAllJobsUnfiltered, mapApiJobToOpportunity } from "@/lib/reliefweb-api"
import { fetchAllIdealistJobs } from "@/lib/idealist-fast-fetch"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { sendEmail } from "@/lib/email"
import { runTheirStackSync } from "@/lib/theirstack-sync"

export const maxDuration = 580 // ~10 min — Vercel Pro limit

const BATCH_SIZE = 200 // Bulk upsert batch size
const MAX_IDEALIST_FETCH = Number(process.env.IDEALIST_MAX_DETAIL_FETCH || 5000)

// ============================================
// GET /api/cron/fetch-5k — High-volume sync
// ============================================
// Fetches maximum volume from ReliefWeb (~500-900 remote jobs) + Idealist (~500-2000 remote jobs)
// and bulk-upserts them into externalOpportunities.
//
// Performance targets:
// - ReliefWeb: ~913 API call → bulk upsert in ~5-10s
// - Idealist: ~3000 detail fetches (parallel) + bulk upsert in ~2-5min
// - Total: < 10 minutes
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const includeTheirStack =
    searchParams.get("includeTheirStack") === "true" ||
    process.env.THEIRSTACK_SYNC_ENABLED === "true"
  const theirStackMaxJobs = Number(
    searchParams.get("theirStackMaxJobs") ||
      process.env.THEIRSTACK_SYNC_MAX_JOBS ||
      "50"
  )
  const stats = {
    reliefweb: { total: 0, remoteOnly: 0, new: 0, updated: 0, errors: 0 },
    idealist: { total: 0, new: 0, updated: 0, errors: 0 },
    theirstack: {
      total: 0,
      new: 0,
      updated: 0,
      errors: 0,
      skippedReason: includeTheirStack ? null as string | null : "Disabled",
    },
  }

  // ── ReliefWeb ────────────────────────────────────────────────
  try {
    console.log("[fetch-5k] Fetching ReliefWeb...")
    const { jobs: rwJobs } = await fetchAllJobsUnfiltered()
    stats.reliefweb.total = rwJobs.length

    // Filter to remote-only and prepare for bulk upsert
    const remoteOpps = rwJobs
      .map(job => {
        const opp = mapApiJobToOpportunity(job)
        opp.scrapedAt = new Date()
        opp.updatedAt = new Date()
        return opp
      })
      .filter(opp => opp.workMode === "remote")

    stats.reliefweb.remoteOnly = remoteOpps.length
    console.log(`[fetch-5k] ReliefWeb: ${stats.reliefweb.total} total, ${stats.reliefweb.remoteOnly} remote`)

    // Bulk upsert in batches
    for (let i = 0; i < remoteOpps.length; i += BATCH_SIZE) {
      const batch = remoteOpps.slice(i, i + BATCH_SIZE)
      try {
        const { inserted, updated } = await externalOpportunitiesDb.bulkUpsert(batch)
        stats.reliefweb.new += inserted
        stats.reliefweb.updated += updated
      } catch (e: any) {
        console.error(`[fetch-5k] RW batch error: ${e.message}`)
        stats.reliefweb.errors += batch.length
      }
    }
    console.log(`[fetch-5k] ReliefWeb: ${stats.reliefweb.new} new, ${stats.reliefweb.updated} updated`)
  } catch (e: any) {
    console.error("[fetch-5k] ReliefWeb fatal:", e.message)
  }

  // ── Idealist ────────────────────────────────────────────────
  try {
    console.log("[fetch-5k] Fetching Idealist (parallel detail fetching)...")
    const istStart = Date.now()
    const opportunities = await fetchAllIdealistJobs(MAX_IDEALIST_FETCH)
    stats.idealist.total = opportunities.length
    console.log(`[fetch-5k] Idealist: ${stats.idealist.total} remote opportunities with details`)

    // Bulk upsert in batches
    for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
      const batch = opportunities.slice(i, i + BATCH_SIZE)
      try {
        const { inserted, updated } = await externalOpportunitiesDb.bulkUpsert(batch)
        stats.idealist.new += inserted
        stats.idealist.updated += updated
      } catch (e: any) {
        console.error(`[fetch-5k] IST batch error: ${e.message}`)
        stats.idealist.errors += batch.length
      }
    }
    console.log(`[fetch-5k] Idealist: ${stats.idealist.new} new, ${stats.idealist.updated} updated in ${((Date.now() - istStart) / 1000).toFixed(1)}s`)
  } catch (e: any) {
    console.error("[fetch-5k] Idealist fatal:", e.message)
  }

  // ── TheirStack ──────────────────────────────────────────────
  if (includeTheirStack && theirStackMaxJobs > 0) {
    try {
      console.log(`[fetch-5k] Fetching TheirStack (up to ${theirStackMaxJobs} jobs)...`)
      const result = await runTheirStackSync({
        preview: false,
        remoteOnly: true,
        onlyWithContacts: true,
        maxAgeDays: 30,
        maxJobs: theirStackMaxJobs,
        maxPages: Math.max(1, Math.ceil(theirStackMaxJobs / BATCH_SIZE)),
        pageSize: Math.min(25, theirStackMaxJobs),
      })
      stats.theirstack.total = result.stats.uniqueJobs
      stats.theirstack.new = result.stats.inserted
      stats.theirstack.updated = result.stats.updated
      stats.theirstack.skippedReason = result.stats.skippedReason ?? null
      console.log(
        `[fetch-5k] TheirStack: ${result.stats.uniqueJobs} fetched | ${result.stats.inserted} new | ${result.stats.updated} updated`
      )
    } catch (e: any) {
      console.error("[fetch-5k] TheirStack fatal:", e.message)
      stats.theirstack.errors += 1
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const grandNew = stats.reliefweb.new + stats.idealist.new + stats.theirstack.new
  const grandUpdated = stats.reliefweb.updated + stats.idealist.updated + stats.theirstack.updated
  const grandTotal = stats.reliefweb.remoteOnly + stats.idealist.total + stats.theirstack.total

  // Email notification
  try {
    const email = process.env.CRON_NOTIFY_EMAIL
    if (email) {
      await sendEmail({
        to: email,
        subject: `[Cron] fetch-5k — ${grandNew} new, ${grandTotal} total | ${totalElapsed}s`,
        html: `
          <div style="font-family:system-ui;max-width:500px">
            <h2>fetch-5k Complete</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">ReliefWeb</td><td style="padding:8px">${stats.reliefweb.total} total | ${stats.reliefweb.remoteOnly} remote | ${stats.reliefweb.new} new | ${stats.reliefweb.errors} errors</td></tr>
              <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">Idealist</td><td style="padding:8px">${stats.idealist.total} remote | ${stats.idealist.new} new | ${stats.idealist.errors} errors</td></tr>
              <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">TheirStack</td><td style="padding:8px">${stats.theirstack.total} total | ${stats.theirstack.new} new | ${stats.theirstack.errors} errors${stats.theirstack.skippedReason ? ` | ${stats.theirstack.skippedReason}` : ""}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Grand Total</td><td style="padding:8px">${grandTotal} | ${grandNew} new | ${grandUpdated} updated</td></tr>
            </table>
            <p style="color:#64748b;font-size:12px;margin-top:16px">Duration: ${totalElapsed}s</p>
          </div>
        `,
      })
    }
  } catch {}

  return NextResponse.json({
    success: true,
    stats,
    grandTotal,
    grandNew,
    grandUpdated,
    elapsedSeconds: parseFloat(totalElapsed),
  })
}
