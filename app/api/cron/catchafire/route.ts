import { NextResponse } from "next/server"
import { runScraper } from "@/lib/scraper"

export const maxDuration = 300

// ============================================
// GET /api/cron/catchafire — Catchafire scraper sync
// ===========================================
// Scrapes volunteer opportunities from catchafire.org/volunteer/
// and stores them in the externalOpportunities collection.
// Secured via CRON_SECRET header on Vercel.

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const startTime = Date.now()
    console.log(`[/cron/catchafire] Starting Catchafire scrape`)

    const run = await runScraper("catchafire", "cron")

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    return NextResponse.json({
      success: run.status === "completed",
      status: run.status,
      stats: {
        scraped: run.itemsScraped,
        new: run.itemsNew,
        updated: run.itemsUpdated,
        skipped: run.itemsSkipped,
        errors: run.errors.slice(0, 10),
        elapsedSeconds: parseFloat(elapsed),
      },
    })
  } catch (error) {
    console.error("[/cron/catchafire] Fatal error:", error)
    return NextResponse.json(
      { error: "Catchafire scrape failed", details: String(error) },
      { status: 500 }
    )
  }
}
