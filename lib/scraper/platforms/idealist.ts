// ============================================
// Idealist Scraper — HTML scraping via Cheerio
// ============================================
// Scrapes volunteer opportunities from idealist.org
// Uses their public search page: https://www.idealist.org/en/volunteer-opportunities

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

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
    const url = `${SEARCH_URL}?page=${page}&q=&type=VOLOP&remote=TRUE`

    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited — stop
        console.warn("[Idealist Scraper] Rate limited, stopping")
        return
      }
      throw new Error(`Idealist fetch error: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Idealist uses structured listing cards
    const listings = $('a[href*="/volunteer-opp/"]')

    if (listings.length === 0) break

    const processedUrls = new Set<string>()

    listings.each((_, el) => {
      const $el = $(el)
      const href = $el.attr("href")
      if (!href || processedUrls.has(href)) return
      processedUrls.add(href)

      const title = $el.find("h3, h4, [class*='title'], [class*='Title']").first().text().trim()
        || $el.text().trim().split("\n")[0]?.trim()

      if (!title || title.length < 5) return

      // Try to extract org name and location from the card
      const cardText = $el.closest("[class*='card'], [class*='listing'], li, article").text()
      const orgName = extractOrgName($, $el)
      const location = extractLocation(cardText)

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").pop() || href

      // We can't get full descriptions from the listing page,
      // so short description from card text
      const snippetText = cardText.replace(title, "").replace(orgName, "").trim().slice(0, 500)

      const allText = [title, snippetText, location].join(" ")
      const causes = mapCauseTags(allText.split(/[\s,;]+/).filter(w => w.length > 3))
      const skills = mapSkillTags(allText.split(/[\s,;]+/).filter(w => w.length > 3))

      // Queue the item — will be yielded outside .each()
      ;(listings as any).__items = (listings as any).__items || []
      ;(listings as any).__items.push({
        sourceplatform: "idealist" as const,
        sourceUrl: fullUrl,
        externalId,
        title,
        description: snippetText || title,
        shortDescription: snippetText.slice(0, 280) || title,
        organization: orgName || "Organization on Idealist",
        organizationUrl: undefined,
        causes,
        skillsRequired: skills,
        workMode: detectWorkMode(allText),
        location: location || undefined,
        country: extractCountry(location),
        postedDate: new Date(),
        compensationType: "volunteer" as const,
        projectType: "short-term" as const,
      } satisfies ScrapedOpportunity)
    })

    const items = ((listings as any).__items || []) as ScrapedOpportunity[]
    for (const item of items) {
      yield item
    }

    // Be respectful — delay between pages
    await sleep(2000)
  }
}

function extractOrgName($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): string {
  // Try common patterns
  const card = $el.closest("[class*='card'], [class*='listing'], li, article")
  const orgEl = card.find("[class*='org'], [class*='company'], [class*='Org']").first()
  if (orgEl.length) return orgEl.text().trim()

  // Try looking for a secondary link or span
  const spans = card.find("span, p")
  for (let i = 0; i < spans.length; i++) {
    const text = $(spans[i]).text().trim()
    if (text && text.length > 2 && text.length < 100 && !text.includes("Volunteer")) {
      return text
    }
  }

  return ""
}

function extractLocation(text: string): string {
  // Try to find location patterns: "City, State" or "City, Country" or "Remote"
  const match = text.match(/(?:in\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
  if (match) return match[1]
  if (/remote/i.test(text)) return "Remote"
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
