import { NextResponse } from "next/server"
import { runAllScrapers, scraperConfigsDb, externalOpportunitiesDb } from "@/lib/scraper"

export const maxDuration = 300 // 5 min for Vercel Pro

// ============================================
// GET /api/cron/scraper — Scheduled scraper run
// ============================================
// Secured via CRON_SECRET header.
// Runs all enabled platform scrapers sequentially.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure DB indexes exist
    await externalOpportunitiesDb.ensureIndexes()

    // Seed scraper configs if first run
    await scraperConfigsDb.seedDefaults()

    const results = await runAllScrapers("cron")

    const summary = results.map(r => ({
      platform: r.platform,
      status: r.status,
      scraped: r.itemsScraped,
      new: r.itemsNew,
      updated: r.itemsUpdated,
      errors: r.errors.length,
    }))

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      platforms: summary,
      totalNew: results.reduce((sum, r) => sum + r.itemsNew, 0),
      totalScraped: results.reduce((sum, r) => sum + r.itemsScraped, 0),
    })
  } catch (error: any) {
    console.error("[Scraper Cron] Error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
