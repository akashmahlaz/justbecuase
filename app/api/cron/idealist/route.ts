import { NextResponse } from "next/server"
import { fetchAllIdealistJobs } from "@/lib/idealist-fast-fetch"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { sendEmail, getCronSyncEmailHtml } from "@/lib/email"

export const maxDuration = 800 // Vercel Pro max is 800s
const BATCH_SIZE = 200
const MAX_IDEALIST_FETCH = Number(process.env.IDEALIST_MAX_DETAIL_FETCH || 5000)

// ============================================
// GET /api/cron/idealist — Daily Idealist API sync
// ============================================
// Fetches remote nonprofit jobs from the Idealist Listings API at high volume
// and bulk-upserts them into the externalOpportunities collection.
export async function GET(request: Request) {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const startTime = Date.now()
    let totalNew = 0
    let totalUpdated = 0
    let totalProcessed = 0
    const skippedNonRemote = 0

    const opportunities = await fetchAllIdealistJobs(MAX_IDEALIST_FETCH)

    for (let index = 0; index < opportunities.length; index += BATCH_SIZE) {
      const batch = opportunities.slice(index, index + BATCH_SIZE)
      try {
        const { inserted, updated } = await externalOpportunitiesDb.bulkUpsert(batch)
        totalNew += inserted
        totalUpdated += updated
        totalProcessed += batch.length
      } catch (err) {
        console.error(`[Idealist Sync] Failed to upsert batch ${index / BATCH_SIZE + 1}:`, err)
      }
    }

    // Mark expired jobs as inactive (based on listing expiry date, not run coverage)
    const staleCount = await markExpiredInactive()

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(
      `[Idealist Sync] ${totalProcessed} processed (${totalNew} new, ${totalUpdated} updated, ${staleCount} deactivated, ${skippedNonRemote} skipped non-remote) in ${elapsed}s`
    )

    const syncStats = {
      apiTotal: opportunities.length,
      processed: totalProcessed,
      new: totalNew,
      updated: totalUpdated,
      deactivated: staleCount,
      skippedNonRemote,
      elapsedSeconds: parseFloat(elapsed),
    }

    // Send notification email
    let emailStatus = "skipped"
    try {
      const notifyEmail = process.env.CRON_NOTIFY_EMAIL
      if (notifyEmail) {
        const sent = await sendEmail({
          to: notifyEmail,
          subject: `[Cron] Idealist Sync — ${totalNew} new, ${totalUpdated} updated`,
          html: getCronSyncEmailHtml("Idealist", syncStats),
        })
        emailStatus = sent ? "sent" : "failed"
      } else {
        emailStatus = "no_CRON_NOTIFY_EMAIL"
      }
    } catch (emailErr) {
      emailStatus = `error: ${String(emailErr)}`
      console.error("[Idealist Sync] Notification email failed:", emailErr)
    }

    return NextResponse.json({ success: true, stats: syncStats, emailStatus })
  } catch (error) {
    console.error("[Idealist Sync] Fatal error:", error)
    return NextResponse.json(
      { error: "Idealist sync failed", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Mark idealist-api opportunities whose listing has expired as inactive.
 * Unlike seen-based marking, this is safe for partial cron runs that
 * only scan a subset of the 3,000+ total Idealist listings.
 */
async function markExpiredInactive(): Promise<number> {
  const { getDb } = await import("@/lib/database")
  const db = await getDb()
  const collection = db.collection("externalOpportunities")

  const result = await collection.updateMany(
    {
      sourceplatform: "idealist-api",
      isActive: true,
      deadline: { $lt: new Date() },
    },
    { $set: { isActive: false, updatedAt: new Date() } }
  )

  return result.modifiedCount
}
