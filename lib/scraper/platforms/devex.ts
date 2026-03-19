// ============================================
// Devex Scraper — DISABLED
// ============================================
// Devex is a JavaScript SPA — job listings are rendered client-side.
// Cheerio cannot extract them. Would need a headless browser (Playwright).
// Keeping the export for runner compatibility but it yields nothing.

import type { ScrapedOpportunity } from "../types"

export async function* scrapeDevex(
  _settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  console.warn("[Devex] Scraper disabled — site requires JavaScript rendering")
  // Yields nothing
}
