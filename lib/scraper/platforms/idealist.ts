// ============================================
// Idealist Scraper — HTML scraping via Cheerio
// ============================================
// Scrapes volunteer opportunities from idealist.org
// Uses their public search page with /volunteer-opportunity/ links

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode } from "../skill-mapper"

const BASE_URL = "https://www.idealist.org"
const SEARCH_URL = `${BASE_URL}/en/volunteer-opportunities`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; JustBeCauseBot/1.0; +https://justbecausenetwork.com)",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeIdealist(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)

  for (let page = 1; page <= maxPages; page++) {
    const url = `${SEARCH_URL}?page=${page}&q=&type=VOLOP`

    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("[Idealist] Rate limited, stopping")
        return
      }
      throw new Error(`Idealist fetch error: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Idealist uses /volunteer-opportunity/ in listing links
    const listings = $('a[href*="/volunteer-opportunity/"]')
    if (listings.length === 0) break

    const processedUrls = new Set<string>()

    for (let i = 0; i < listings.length; i++) {
      const $el = $(listings[i])
      const href = $el.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      // Title is inside an h3 within the link
      const title = $el.find("h3").first().text().trim()
        || $el.text().trim().split("\n")[0]?.trim()
      if (!title || title.length < 5) continue

      // The link text is concatenated: "Title + OrgName + On-site/Remote + City, State + Posted X ago"
      const fullText = $el.text().trim()
      const textAfterTitle = fullText.replace(title, "").trim()

      // Parse parts: org name, work mode, location, posted date
      const parts = textAfterTitle.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean)
      const orgName = parts[0] || ""
      const location = extractLocationFromParts(parts)
      const workMode = detectWorkMode(fullText)

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").filter(Boolean).pop() || href

      const allText = [title, orgName, location].join(" ")
      const causes = mapCauseTags(allText.split(/[\s,;]+/).filter(w => w.length > 3))
      const skills = mapSkillTags(allText.split(/[\s,;]+/).filter(w => w.length > 3))

      yield {
        sourceplatform: "idealist",
        sourceUrl: fullUrl,
        externalId: `idealist_${externalId}`,
        title,
        description: textAfterTitle.slice(0, 5000) || title,
        shortDescription: title,
        organization: orgName || "Organization on Idealist",
        causes,
        skillsRequired: skills,
        workMode,
        location: location || undefined,
        country: extractCountry(location),
        postedDate: new Date(),
        compensationType: "volunteer",
        projectType: "short-term",
      }
    }

    await sleep(2000)
  }
}

function extractLocationFromParts(parts: string[]): string {
  for (const part of parts) {
    // Location patterns: "City, State" or "City, Country" or standalone "Remote"
    if (/^remote$/i.test(part)) return "Remote"
    if (/[A-Z][a-z]+,\s*[A-Z]/.test(part)) return part
  }
  return ""
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  const parts = location.split(",").map(s => s.trim())
  return parts.length > 1 ? parts[parts.length - 1] : undefined
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
