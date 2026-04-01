import { NextResponse } from "next/server"
import { fetchAllRemoteJobs, mapJobToOpportunity } from "@/lib/idealist-api"
import { externalOpportunitiesDb } from "@/lib/scraper"

export const maxDuration = 300

// ============================================
// GET /api/cron/idealist — Daily Idealist API sync
// ============================================
// Fetches all remote jobs from the Idealist Listings API
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

    // Fetch all remote jobs
    const jobs = await fetchAllRemoteJobs(500)

    // Track which IDs we see (to mark stale ones inactive)
    const seenIds = new Set<string>()

    for (const job of jobs) {
      try {
        const opportunity = mapJobToOpportunity(job)
        seenIds.add(opportunity.externalId)

        const { isNew } = await externalOpportunitiesDb.upsert(opportunity)
        if (isNew) totalNew++
        else totalUpdated++
        totalProcessed++
      } catch (err) {
        console.error(`[Idealist Sync] Failed to process job ${job.id}:`, err)
      }
    }

    // Mark jobs no longer in the API as inactive
    const staleCount = await markStaleInactive(seenIds)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(
      `[Idealist Sync] ${totalProcessed} processed (${totalNew} new, ${totalUpdated} updated, ${staleCount} deactivated) in ${elapsed}s`
    )

    return NextResponse.json({
      success: true,
      stats: {
        apiTotal: jobs.length,
        processed: totalProcessed,
        new: totalNew,
        updated: totalUpdated,
        deactivated: staleCount,
        elapsedSeconds: parseFloat(elapsed),
      },
    })
  } catch (error) {
    console.error("[Idealist Sync] Fatal error:", error)
    return NextResponse.json(
      { error: "Idealist sync failed", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Mark idealist-api opportunities that were NOT in the latest sync as inactive.
 */
async function markStaleInactive(seenIds: Set<string>): Promise<number> {
  const { getDb } = await import("@/lib/database")
  const db = await getDb()
  const collection = db.collection("externalOpportunities")

  const result = await collection.updateMany(
    {
      sourceplatform: "idealist-api",
      isActive: true,
      externalId: { $nin: Array.from(seenIds) },
    },
    { $set: { isActive: false, updatedAt: new Date() } }
  )

  return result.modifiedCount
}
