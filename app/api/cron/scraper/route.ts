import { NextResponse } from "next/server"
import { runAllScrapers, runScraper, scraperConfigsDb, externalOpportunitiesDb } from "@/lib/scraper"
import type { ScraperPlatform } from "@/lib/scraper"

export const maxDuration = 300 // 5 min for Vercel Pro

const VALID_PLATFORMS: ScraperPlatform[] = [
  "reliefweb",
  "idealist",
  "unjobs",
  "devex",
  "impactpool",
  "workforgood",
  "devnetjobs",
]

// ============================================
// GET /api/cron/scraper — Scheduled scraper run
// ============================================
// Secured via CRON_SECRET header.
// If ?platform=... is provided, only that scraper runs.
// Otherwise all enabled scrapers run sequentially.
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
    }

    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get("platform") as ScraperPlatform | null

    if (platform && !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
    }

    // Ensure DB indexes exist
    await externalOpportunitiesDb.ensureIndexes()

    // Seed scraper configs if first run
    await scraperConfigsDb.seedDefaults()

    if (platform) {
      const result = await runScraper(platform, "cron")
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        platform: {
          platform: result.platform,
          status: result.status,
          scraped: result.itemsScraped,
          new: result.itemsNew,
          updated: result.itemsUpdated,
          skipped: result.itemsSkipped,
          errors: result.errors,
        },
      })
    }

    const results = await runAllScrapers("cron")

    const summary = results.map(r => ({
      platform: r.platform,
      status: r.status,
      scraped: r.itemsScraped,
      new: r.itemsNew,
      updated: r.itemsUpdated,
      skipped: r.itemsSkipped,
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
