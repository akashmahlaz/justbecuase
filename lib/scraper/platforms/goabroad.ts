// ============================================
// GoAbroad Volunteer Scraper — international volunteer programs
// ============================================
// Scrapes volunteer abroad opportunities from goabroad.com
// Replaces the disabled WorkForGood scraper with a working alternative.
// Uses the same platform key "workforgood" in the registry for backward compat.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.goabroad.com"
const SEARCH_URL = `${BASE_URL}/volunteer-abroad`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeGoAbroad(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  // GoAbroad is volunteer-abroad (onsite by nature) — disabled for remote-only mode
  console.log("[GoAbroad] Skipped — platform is onsite-only (volunteer abroad). Remote-only mode active.")
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
