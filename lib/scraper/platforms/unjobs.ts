// ============================================
// UN Jobs Scraper — HTML scraping via Cheerio
// ============================================
// Scrapes from unjobs.org (independent UN job aggregator)
// Public listings available at: https://unjobs.org/

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://unjobs.org"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; JustBeCauseBot/1.0; +https://justbecausenetwork.com)",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeUNJobs(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "3", 10)

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? BASE_URL : `${BASE_URL}/?page=${page}`

    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("[UNJobs Scraper] Rate limited, stopping")
        return
      }
      throw new Error(`UNJobs fetch error: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // UN Jobs typically lists jobs in table rows or card elements
    const jobLinks = $('a[href*="/duty_stations/"], a[href*="/organizations/"], table a, .job-listing a, article a')
      .filter((_, el) => {
        const href = $(el).attr("href") || ""
        // Filter for actual job links (typically contain year or detail pages)
        return href.length > 5 && !href.includes("javascript") && !href.startsWith("#")
      })

    // Also try structured job listing selectors
    const jobRows = $("tr, .job-item, .listing-item, article").filter((_, el) => {
      const text = $(el).text()
      return text.length > 50 && (
        text.includes("UN") || text.includes("UNDP") || text.includes("UNICEF") ||
        text.includes("WHO") || text.includes("FAO") || text.includes("Programme") ||
        text.includes("Officer") || text.includes("Specialist") || text.includes("Consultant")
      )
    })

    const items: ScrapedOpportunity[] = []
    const processedIds = new Set<string>()

    // Process job rows
    jobRows.each((_, el) => {
      const $row = $(el)
      const link = $row.find("a").first()
      const href = link.attr("href") || ""
      const title = link.text().trim()

      if (!title || title.length < 5 || processedIds.has(href)) return
      processedIds.add(href)

      const rowText = $row.text()
      const org = extractOrg(rowText)
      const location = extractLocation(rowText)
      const deadline = extractDeadline(rowText)

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 200)

      const allText = [title, rowText].join(" ")
      const causes = mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))
      const skills = mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))

      items.push({
        sourceplatform: "unjobs",
        sourceUrl: fullUrl,
        externalId,
        title,
        description: rowText.trim().slice(0, 5000),
        shortDescription: title,
        organization: org || "United Nations",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: detectWorkMode(allText),
        location: location || undefined,
        country: extractCountry(location),
        deadline: deadline || undefined,
        postedDate: new Date(),
        compensationType: "paid",
        projectType: "long-term",
      })
    })

    if (items.length === 0 && jobLinks.length === 0) break

    for (const item of items) {
      yield item
    }

    // Respect rate limits
    await sleep(3000)
  }
}

function extractOrg(text: string): string {
  const patterns = [
    /\b(UNDP|UNICEF|WHO|FAO|UNHCR|UNESCO|WFP|UNFPA|ILO|UNIDO|ITU|IAEA|IMF|UNODC|UN Women|UN\s+\w+)\b/,
    /\b(World Bank|Red Cross|ICRC|MSF|Save the Children|Oxfam|CARE)\b/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return ""
}

function extractLocation(text: string): string {
  // Look for "City, Country" or "Duty Station: ..." patterns
  const dutyMatch = text.match(/[Dd]uty\s+[Ss]tation[:\s]+([^\n,]+(?:,\s*[^\n]+)?)/i)
  if (dutyMatch) return dutyMatch[1].trim().slice(0, 100)

  const locMatch = text.match(/[Ll]ocation[:\s]+([^\n,]+(?:,\s*[^\n]+)?)/i)
  if (locMatch) return locMatch[1].trim().slice(0, 100)

  return ""
}

function extractDeadline(text: string): Date | null {
  // Look for "Closing date: DD Month YYYY" or similar
  const patterns = [
    /[Cc]losing\s+[Dd]ate[:\s]+(\d{1,2}\s+\w+\s+\d{4})/,
    /[Dd]eadline[:\s]+(\d{1,2}\s+\w+\s+\d{4})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const d = new Date(match[1])
      if (!isNaN(d.getTime())) return d
    }
  }
  return null
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  const parts = location.split(",").map(s => s.trim())
  return parts.length > 1 ? parts[parts.length - 1] : location
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
