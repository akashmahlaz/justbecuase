// ============================================
// ReliefWeb Scraper — HTML scraping
// ============================================
// Scrapes job listings from reliefweb.int/updates?list=Jobs
// The REST API requires an approved appname, so we scrape HTML instead.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://reliefweb.int"
const SEARCH_URL = `${BASE_URL}/updates?list=Jobs&view=reports`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; JustBeCauseBot/1.0; +https://justbecausenetwork.com)",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeReliefWeb(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)

  for (let page = 0; page < maxPages; page++) {
    const offset = page * 20
    const url = offset === 0 ? SEARCH_URL : `${SEARCH_URL}&offset=${offset}`

    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("[ReliefWeb] Rate limited, stopping")
        return
      }
      throw new Error(`ReliefWeb fetch error: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const jobLinks = $('a[href*="/job/"]')
    if (jobLinks.length === 0) break

    const processedUrls = new Set<string>()

    for (let i = 0; i < jobLinks.length; i++) {
      const $link = $(jobLinks[i])
      const href = $link.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      const title = $link.text().trim()
      if (!title || title.length < 5) continue

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").filter(Boolean).pop() || href

      // Walk up to find surrounding metadata
      const $container = $link.closest("article, li, div, section")
      const containerText = $container.length ? $container.text() : ""

      // Extract organization from source element
      const org = $container.find('[class*="source"], [class*="org"]').first().text().trim()
        || extractFromText(containerText, title, "org")

      // Extract country
      const country = $container.find('[class*="country"], [class*="location"]').first().text().trim()
        || extractFromText(containerText, title, "country")

      // Extract date
      const $time = $container.find("time")
      const dateStr = $time.attr("datetime") || $time.text().trim()
      const postedDate = dateStr ? tryParseDate(dateStr) : undefined

      const allText = [title, org, country, containerText].join(" ")
      const causes = mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))
      const skills = mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))

      yield {
        sourceplatform: "reliefweb",
        sourceUrl: fullUrl,
        externalId: `rw_${externalId}`,
        title,
        description: containerText.trim().slice(0, 5000) || title,
        shortDescription: title,
        organization: org || "Organization on ReliefWeb",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: detectWorkMode(allText),
        location: country || undefined,
        country: country || undefined,
        postedDate: postedDate || new Date(),
        compensationType: "paid",
        projectType: "long-term",
      }
    }

    await sleep(1500)
  }
}

function extractFromText(text: string, title: string, type: "org" | "country"): string {
  // Remove the title from the text and try to find patterns
  const cleaned = text.replace(title, "").trim()
  if (type === "org") {
    // Look for organization-like patterns (capitalized words)
    const match = cleaned.match(/(?:by|from|source[:\s]*)\s*([A-Z][\w\s&.-]+)/i)
    return match?.[1]?.trim().slice(0, 100) || ""
  }
  return ""
}

function tryParseDate(str: string): Date | undefined {
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
