// ============================================
// DevNetJobs Scraper — DISABLED
// ============================================
// DevNetJobs uses ASP.NET postback (javascript:__doPostBack) for all job links.
// Cannot extract real URLs without a headless browser.
// Keeping the export for runner compatibility but it yields nothing.

import type { ScrapedOpportunity } from "../types"

export async function* scrapeDevNetJobs(
  _settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  console.warn("[DevNetJobs] Scraper disabled — site uses ASP.NET postback links")
  // Yields nothing
}
