// ============================================
// WorkForGood Scraper — DISABLED
// ============================================
// WorkForGood is a UK charity donation platform, not a job board.
// The /jobs endpoint returns 404. No scrapable job listings exist.
// Keeping the export for runner compatibility but it yields nothing.

import type { ScrapedOpportunity } from "../types"

export async function* scrapeWorkForGood(
  _settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  console.warn("[WorkForGood] Scraper disabled — site is not a job board")
  // Yields nothing
}
