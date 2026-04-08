import { NextResponse } from "next/server"
import { fetchAllJobsUnfiltered, mapApiJobToOpportunity } from "@/lib/reliefweb-api"
import { fetchAllIdealistJobs } from "@/lib/idealist-fast-fetch"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { sendEmail } from "@/lib/email"

export const maxDuration = 580 // ~10 min — Vercel Pro limit

// ============================================
// GET /api/cron/fetch-5k — High-volume sync
// ============================================
// Fetches maximum volume from ReliefWeb (~913 jobs) + Idealist (~3000-5000 jobs)
// and upserts them into externalOpportunities.
//
// Idealist uses parallel detail fetching for speed:
// - Phase 1: Fetch all listing IDs (fast cursor pagination)
// - Phase 2: Fetch details for most recent ~3000 in parallel batches
// - Remaining listings saved with basic data (no description)
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const stats = { reliefweb: { total: 0, new: 0, updated: 0, errors: 0 }, idealist: { total: 0, new: 0, updated: 0, errors: 0 } }

  // ── ReliefWeb ────────────────────────────────────────────────
  try {
    console.log("[fetch-5k] Fetching ReliefWeb...")
    const { jobs: rwJobs } = await fetchAllJobsUnfiltered()
    stats.reliefweb.total = rwJobs.length

    for (const job of rwJobs) {
      try {
        const opp = mapApiJobToOpportunity(job)
        opp.scrapedAt = new Date()
        opp.updatedAt = new Date()
        const { isNew } = await externalOpportunitiesDb.upsert(opp)
        if (isNew) stats.reliefweb.new++; else stats.reliefweb.updated++
      } catch {
        stats.reliefweb.errors++
      }
    }
    console.log(`[fetch-5k] ReliefWeb: ${stats.reliefweb.total} processed (${stats.reliefweb.new} new, ${stats.reliefweb.updated} updated)`)
  } catch (e: any) {
    console.error("[fetch-5k] ReliefWeb fatal:", e.message)
  }

  // ── Idealist ────────────────────────────────────────────────
  try {
    console.log("[fetch-5k] Fetching Idealist (parallel detail fetching)...")
    const istStart = Date.now()
    const opportunities = await fetchAllIdealistJobs(3000) // max 3000 with details
    stats.idealist.total = opportunities.length

    for (const opp of opportunities) {
      try {
        const { isNew } = await externalOpportunitiesDb.upsert(opp)
        if (isNew) stats.idealist.new++; else stats.idealist.updated++
      } catch {
        stats.idealist.errors++
      }
    }
    console.log(`[fetch-5k] Idealist: ${stats.idealist.total} processed (${stats.idealist.new} new, ${stats.idealist.updated} updated) in ${((Date.now() - istStart) / 1000).toFixed(1)}s`)
  } catch (e: any) {
    console.error("[fetch-5k] Idealist fatal:", e.message)
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const grandTotal = stats.reliefweb.total + stats.idealist.total
  const grandNew = stats.reliefweb.new + stats.idealist.new
  const grandUpdated = stats.reliefweb.updated + stats.idealist.updated

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
              <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">ReliefWeb</td><td style="padding:8px">${stats.reliefweb.total} total | ${stats.reliefweb.new} new | ${stats.reliefweb.errors} errors</td></tr>
              <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">Idealist</td><td style="padding:8px">${stats.idealist.total} total | ${stats.idealist.new} new | ${stats.idealist.errors} errors</td></tr>
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
