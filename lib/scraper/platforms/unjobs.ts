// ============================================
// UN Jobs Scraper — HTML scraping via Cheerio
// ============================================
// Scrapes from unjobs.org (independent UN job aggregator)
// Uses a[href*="/vacancies/"] links on the homepage

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
        console.warn("[UNJobs] Rate limited, stopping")
        return
      }
      throw new Error(`UNJobs fetch error: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Only select actual vacancy links
    const vacancyLinks = $('a[href*="/vacancies/"]')
    if (vacancyLinks.length === 0) break

    const processedUrls = new Set<string>()

    for (let i = 0; i < vacancyLinks.length; i++) {
      const $link = $(vacancyLinks[i])
      const href = $link.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      const title = $link.text().trim()
      if (!title || title.length < 5) continue

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").filter(Boolean).pop() || href

      // The vacancy link sits inside a div. Sibling or parent text may contain
      // organization name, location, and ISO date strings.
      const $container = $link.closest("div")
      const containerText = $container.length ? $container.text() : ""

      // Try to extract ISO date from surrounding text (e.g. "2026-03-19T15:04:27Z")
      const dateMatch = containerText.match(/\d{4}-\d{2}-\d{2}T[\d:]+Z/)
      const deadline = dateMatch ? tryParseDate(dateMatch[0]) : undefined

      // Extract org from title patterns or surrounding text
      const org = extractOrg(title + " " + containerText)

      const allText = [title, containerText].join(" ")
      const causes = mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))
      const skills = mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))

      yield {
        sourceplatform: "unjobs",
        sourceUrl: fullUrl,
        externalId: `unjobs_${externalId}`,
        title,
        description: title,
        shortDescription: title,
        organization: org || "United Nations",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: detectWorkMode(allText),
        deadline,
        postedDate: new Date(),
        compensationType: "paid",
        projectType: "long-term",
      }
    }

    await sleep(3000)
  }
}

function extractOrg(text: string): string {
  const patterns = [
    /\b(UNDP|UNICEF|WHO|FAO|UNHCR|UNESCO|WFP|UNFPA|ILO|UNIDO|ITU|IAEA|IMF|UNODC|UN Women|UNOPS|OCHA|ECLAC|ESCAP|ECA)\b/,
    /\b(World Bank|Red Cross|ICRC|MSF|Save the Children|Oxfam|CARE)\b/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
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
