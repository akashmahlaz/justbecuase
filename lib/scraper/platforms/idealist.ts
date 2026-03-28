// ============================================
// Idealist Scraper — HTML scraping with improved extraction
// ============================================
// Scrapes volunteer opportunities from idealist.org
// Extracts structured data from listing cards.
// Deep scraping (via runner) enriches new items with full detail page content.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.idealist.org"
const SEARCH_URL = `${BASE_URL}/en/volunteer-opportunities`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeIdealist(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)

  for (let page = 1; page <= maxPages; page++) {
    const url = `${SEARCH_URL}?page=${page}&q=&type=VOLOP`

    let html: string
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[Idealist] Rate limited at page", page)
          await sleep(10000)
          continue
        }
        console.warn(`[Idealist] HTTP ${response.status} at page ${page}`)
        break
      }
      html = await response.text()
    } catch (err) {
      console.warn(`[Idealist] Fetch failed page ${page}:`, err)
      break
    }

    const $ = cheerio.load(html)

    // Idealist uses /volunteer-opportunity/ in listing links
    const listings = $('a[href*="/volunteer-opportunity/"]')
    if (listings.length === 0) {
      console.log(`[Idealist] No listings on page ${page}, stopping`)
      break
    }

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

      // The link text is concatenated with org, work mode, location, date
      const fullText = $el.text().trim()
      const textAfterTitle = fullText.replace(title, "").trim()

      // Parse structured parts from the card text
      const parts = textAfterTitle.split(/\s{2,}|\n/).map(s => s.trim()).filter(Boolean)
      const orgName = parts[0] || ""
      const location = extractLocationFromParts(parts)
      const workMode = detectWorkMode(fullText)

      // Look for time commitment in the card text
      const timeMatch = fullText.match(/(\d+\s*(?:hours?|hrs?)\s*(?:\/|per)\s*(?:week|month|day))/i)
      const timeCommitment = timeMatch ? timeMatch[1] : ""

      // Look for posted date indicators
      const postedMatch = fullText.match(/posted\s+(\d+\s+(?:day|week|month|hour)s?\s+ago)/i)
      const postedText = postedMatch ? postedMatch[1] : ""
      const postedDate = postedText ? parseRelativeDate(postedText) : new Date()

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").filter(Boolean).pop() || href

      const allText = [title, orgName, location, textAfterTitle].join(" ")
      const words = allText.split(/[\s,;]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)
      const experienceLevel = detectExperienceLevel(allText)

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
        experienceLevel,
        workMode,
        location: location || undefined,
        country: extractCountry(location),
        timeCommitment: timeCommitment || undefined,
        postedDate,
        compensationType: "volunteer",
        projectType: "short-term",
      }
    }

    await sleep(2000)
  }
}

function extractLocationFromParts(parts: string[]): string {
  for (const part of parts) {
    if (/^remote$/i.test(part)) return "Remote"
    if (/[A-Z][a-z]+,\s*[A-Z]/.test(part)) return part
    if (/\b(united states|canada|uk|india|kenya|nigeria|germany|france|australia)\b/i.test(part)) return part
  }
  return ""
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  const parts = location.split(",").map(s => s.trim())
  return parts.length > 1 ? parts[parts.length - 1] : undefined
}

/** Parse relative date strings like "3 days ago", "2 weeks ago" */
function parseRelativeDate(text: string): Date {
  const now = new Date()
  const match = text.match(/(\d+)\s*(day|week|month|hour)s?\s*ago/i)
  if (!match) return now
  const num = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  if (unit === "hour") now.setHours(now.getHours() - num)
  else if (unit === "day") now.setDate(now.getDate() - num)
  else if (unit === "week") now.setDate(now.getDate() - num * 7)
  else if (unit === "month") now.setMonth(now.getMonth() - num)
  return now
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
