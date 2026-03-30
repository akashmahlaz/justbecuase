import { NextResponse } from "next/server"
import { runAllScrapers, runScraper, scraperConfigsDb, externalOpportunitiesDb } from "@/lib/scraper"
import type { ScraperPlatform } from "@/lib/scraper"

export const maxDuration = 800 // Max allowed on Vercel Pro plan

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
  // ALL SCRAPERS DISABLED — pending legal review of platform ToS
  return NextResponse.json({ 
    error: "All scrapers are disabled pending legal review", 
    disabled: true 
  }, { status: 403 })
}
