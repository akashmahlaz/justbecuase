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
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? SEARCH_URL : `${SEARCH_URL}?page=${page}`

    let html: string
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[GoAbroad] Rate limited at page", page)
          await sleep(10000)
          continue
        }
        if (response.status === 403) {
          console.warn("[GoAbroad] Access denied, stopping")
          return
        }
        console.warn(`[GoAbroad] HTTP ${response.status} at page ${page}`)
        break
      }
      html = await response.text()
    } catch (err) {
      console.warn(`[GoAbroad] Fetch failed page ${page}:`, err)
      break
    }

    const $ = cheerio.load(html)

    // GoAbroad listings typically use program cards with links to /volunteer-abroad/{country}/{slug}
    const programLinks = $('a[href*="/volunteer-abroad/"]').filter((_, el) => {
      const href = $(el).attr("href") || ""
      // Only links to specific programs (have a second path segment after /volunteer-abroad/)
      const parts = href.replace(BASE_URL, "").split("/").filter(Boolean)
      return parts.length >= 3
    })

    if (programLinks.length === 0) {
      // Try broader selectors
      const altLinks = $('[class*="program"] a, [class*="listing"] a, [class*="result"] a')
      if (altLinks.length === 0) {
        console.log(`[GoAbroad] No program listings on page ${page}, stopping`)
        break
      }
    }

    const processedUrls = new Set<string>()
    const elements = programLinks.length > 0
      ? programLinks
      : $('[class*="program"] a, [class*="listing"] a')

    for (let i = 0; i < elements.length; i++) {
      const $el = $(elements[i])
      const href = $el.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      const title = $el.find("h2, h3, h4, [class*='title']").first().text().trim()
        || $el.text().trim().split("\n")[0]?.trim()
      if (!title || title.length < 5) continue

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").filter(Boolean).pop() || href

      // Get the containing card for metadata
      const $card = $el.closest('[class*="program"], [class*="listing"], [class*="card"], article').first()
      const cardText = $card.length ? $card.text() : $el.text()

      // Extract organization/provider
      const org = $card.find('[class*="provider"], [class*="company"], [class*="org"]').first().text().trim()

      // Extract location/country from URL path or card text
      const pathParts = href.replace(BASE_URL, "").split("/").filter(Boolean)
      const countrySlug = pathParts.length >= 2 ? pathParts[1] : ""
      const country = countrySlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())

      const locationEl = $card.find('[class*="location"], [class*="country"]').first().text().trim()
      const location = locationEl || country

      // Extract duration/time commitment
      const durationEl = $card.find('[class*="duration"], [class*="length"]').first().text().trim()
      const durationMatch = cardText.match(/(\d+(?:\s*[-–]\s*\d+)?\s*(?:weeks?|months?|days?|hours?))/i)
      const duration = durationEl || (durationMatch ? durationMatch[1] : "")

      // Extract price/cost info
      const priceMatch = cardText.match(/(?:from\s*)?\$\s*[\d,]+/i)
      const price = priceMatch ? priceMatch[0] : undefined

      // Extract rating
      const ratingMatch = cardText.match(/(\d(?:\.\d+)?)\s*(?:\/\s*5|stars?|rating)/i)

      // Build rich text
      const allText = [title, org, location, country, cardText].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)

      yield {
        sourceplatform: "workforgood", // reuse platform key for registry compat
        sourceUrl: fullUrl,
        externalId: `goabroad_${externalId}`,
        title,
        description: cardText.slice(0, 5000) || title,
        shortDescription: title + (country ? ` in ${country}` : ""),
        organization: org || "Volunteer Program Provider",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: "onsite",
        location: location || undefined,
        country: country || undefined,
        duration: duration || undefined,
        timeCommitment: duration || undefined,
        postedDate: new Date(),
        compensationType: "volunteer",
        projectType: "short-term",
      }
    }

    await sleep(2000)
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
