import { NextResponse } from "next/server"
import { fetchAllJobsUnfiltered, mapApiJobToOpportunity } from "@/lib/reliefweb-api"
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

    // Fetch ALL published humanitarian/NGO jobs from ReliefWeb
    // Then filter to only keep remote jobs
    const { jobs, total } = await fetchAllJobsUnfiltered()
    let skippedNonRemote = 0

    for (const job of jobs) {
      try {
        const opportunity = mapApiJobToOpportunity(job)

        // Only sync remote jobs — skip onsite/hybrid
        if (opportunity.workMode !== "remote") {
          skippedNonRemote++
          continue
        }

        const { isNew } = await externalOpportunitiesDb.upsert(opportunity)
        if (isNew) totalNew++
        else totalUpdated++
        totalProcessed++
      } catch (err) {
        console.error(`Failed to process job ${job.id}:`, err)
      }
    }

    // Mark expired jobs as inactive (deadline-based, safe for partial runs)
    const staleCount = await markExpiredInactive()

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(
      `[ReliefWeb Sync] ${totalProcessed} processed (${totalNew} new, ${totalUpdated} updated, ${staleCount} deactivated, ${skippedNonRemote} skipped non-remote) in ${elapsed}s`
    )

    const syncStats = {
      apiTotal: total,
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
          subject: `[Cron] ReliefWeb Sync — ${totalNew} new, ${totalUpdated} updated`,
          html: getCronSyncEmailHtml("ReliefWeb", syncStats),
        })
        emailStatus = sent ? "sent" : "failed"
      } else {
        emailStatus = "no_CRON_NOTIFY_EMAIL"
      }
    } catch (emailErr) {
      emailStatus = `error: ${String(emailErr)}`
      console.error("[ReliefWeb Sync] Notification email failed:", emailErr)
    }

    return NextResponse.json({ success: true, stats: syncStats, emailStatus })
  } catch (error) {
    console.error("[ReliefWeb Sync] Fatal error:", error)
    return NextResponse.json(
      { error: "ReliefWeb sync failed", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Mark reliefweb-api opportunities whose deadline has passed as inactive.
 * Deadline-based deactivation is safe regardless of how many jobs the API returns,
 * unlike the old seen-based approach which could incorrectly deactivate valid jobs.
 */
async function markExpiredInactive(): Promise<number> {
  const { getDb } = await import("@/lib/database")
  const db = await getDb()
  const collection = db.collection("externalOpportunities")

  const result = await collection.updateMany(
    {
      sourceplatform: "reliefweb-api",
      isActive: true,
      deadline: { $lt: new Date() },
    },
    { $set: { isActive: false, updatedAt: new Date() } }
  )

  return result.modifiedCount
}
