import { NextResponse } from "next/server"
import { fetchAllJobs, mapApiJobToOpportunity } from "@/lib/reliefweb-api"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { sendEmail, getCronSyncEmailHtml } from "@/lib/email"

export const maxDuration = 300

// ============================================
// GET /api/cron/reliefweb — Daily ReliefWeb API sync
// ============================================
// Fetches all published jobs from the official ReliefWeb API
// and upserts them into the externalOpportunities collection.
// Secured via CRON_SECRET header on Vercel.
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

    // Fetch all published jobs (API returns max 1000 per call)
    // With ~1000 active jobs, one call is enough
    const { jobs, total } = await fetchAllJobs(1000, 0)

    // Track which IDs we see from the API (to mark stale ones inactive)
    const seenIds = new Set<string>()

    for (const job of jobs) {
      try {
        const opportunity = mapApiJobToOpportunity(job)
        seenIds.add(opportunity.externalId)

        const { isNew } = await externalOpportunitiesDb.upsert(opportunity)
        if (isNew) totalNew++
        else totalUpdated++
        totalProcessed++
      } catch (err) {
        console.error(`Failed to process job ${job.id}:`, err)
      }
    }

    // If API returned more than 1000, fetch next page
    if (total > 1000) {
      const { jobs: moreJobs } = await fetchAllJobs(1000, 1000)
      for (const job of moreJobs) {
        try {
          const opportunity = mapApiJobToOpportunity(job)
          seenIds.add(opportunity.externalId)
          const { isNew } = await externalOpportunitiesDb.upsert(opportunity)
          if (isNew) totalNew++
          else totalUpdated++
          totalProcessed++
        } catch (err) {
          console.error(`Failed to process job ${job.id}:`, err)
        }
      }
    }

    // Mark jobs no longer in the API as inactive
    // (jobs that were "reliefweb-api" but weren't in this sync)
    const staleCount = await markStaleInactive(seenIds)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(
      `[ReliefWeb Sync] ${totalProcessed} processed (${totalNew} new, ${totalUpdated} updated, ${staleCount} deactivated) in ${elapsed}s`
    )

    const syncStats = {
      apiTotal: total,
      processed: totalProcessed,
      new: totalNew,
      updated: totalUpdated,
      deactivated: staleCount,
      elapsedSeconds: parseFloat(elapsed),
    }

    // Send notification email
    try {
      const notifyEmail = process.env.CRON_NOTIFY_EMAIL
      if (notifyEmail) {
        await sendEmail({
          to: notifyEmail,
          subject: `[Cron] ReliefWeb Sync — ${totalNew} new, ${totalUpdated} updated`,
          html: getCronSyncEmailHtml("ReliefWeb", syncStats),
        })
      }
    } catch (emailErr) {
      console.error("[ReliefWeb Sync] Notification email failed:", emailErr)
    }

    return NextResponse.json({ success: true, stats: syncStats })
  } catch (error) {
    console.error("[ReliefWeb Sync] Fatal error:", error)
    return NextResponse.json(
      { error: "ReliefWeb sync failed", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Mark reliefweb-api opportunities that were NOT in the latest sync as inactive.
 * This handles expired/removed jobs.
 */
async function markStaleInactive(seenIds: Set<string>): Promise<number> {
  const { getDb } = await import("@/lib/database")
  const db = await getDb()
  const collection = db.collection("externalOpportunities")

  const result = await collection.updateMany(
    {
      sourceplatform: "reliefweb-api",
      isActive: true,
      externalId: { $nin: Array.from(seenIds) },
    },
    { $set: { isActive: false, updatedAt: new Date() } }
  )

  return result.modifiedCount
}
