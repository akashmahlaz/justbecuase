// ============================================
// ReliefWeb Scraper — HTML scraping with deep extraction
// ============================================
// Scrapes job listings from reliefweb.int/updates?list=Jobs
// Extracts structured metadata from listing entries.
// Deep scraping (via runner) enriches new items with full detail page content.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://reliefweb.int"
// Filter for remote jobs using ReliefWeb's search facets
const SEARCH_URL = `${BASE_URL}/updates?list=Jobs&view=reports&search=remote`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeReliefWeb(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)

  for (let page = 0; page < maxPages; page++) {
    const offset = page * 20
    const url = offset === 0 ? SEARCH_URL : `${SEARCH_URL}&offset=${offset}`

    let html: string
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[ReliefWeb] Rate limited at page", page)
          await sleep(10000)
          continue
        }
        console.warn(`[ReliefWeb] HTTP ${response.status} at page ${page}`)
        break
      }
      html = await response.text()
    } catch (err) {
      console.warn(`[ReliefWeb] Fetch failed page ${page}:`, err)
      break
    }

    const $ = cheerio.load(html)

    // ReliefWeb lists jobs as article/li elements with a[href*="/job/"] links
    const jobLinks = $('a[href*="/job/"]')
    if (jobLinks.length === 0) {
      console.log(`[ReliefWeb] No job links on page ${page}, stopping`)
      break
    }

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

      // Walk up the DOM to find the containing article/card
      const $container = $link.closest("article, li, div.rw-river-article, section, .rw-entity-meta")
      const containerText = $container.length ? $container.text() : ""

      // Extract organization from source metadata
      const org = $container.find('.rw-entity-meta__tag--source a, [class*="source"] a, [class*="org"]').first().text().trim()
        || $container.find('[class*="source"]').first().text().trim()
        || extractOrgFromText(containerText, title)

      // Extract country/location from metadata tags
      const country = $container.find('.rw-entity-meta__tag--country a, [class*="country"] a, [class*="location"]').first().text().trim()
        || ""

      // Extract job type/category
      const jobType = $container.find('.rw-entity-meta__tag--type a, [class*="type"] a').first().text().trim() || ""
      const theme = $container.find('.rw-entity-meta__tag--theme a, [class*="theme"] a').first().text().trim() || ""

      // Extract closing date from metadata
      const closingText = $container.find('.rw-entity-meta__tag--date, [class*="closing"], [class*="deadline"]').text().trim()
      const deadline = tryParseDate(closingText)

      // Extract posted date from time element
      const $time = $container.find("time")
      const dateStr = $time.attr("datetime") || $time.text().trim()
      const postedDate = dateStr ? tryParseDate(dateStr) : undefined

      // Build rich text for skill/cause mapping
      const allText = [title, org, country, jobType, theme, containerText].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)

      // Determine work mode and experience from available text
      const workMode = detectWorkMode(allText)
      const experienceLevel = detectExperienceLevel(allText)

      // Determine compensation type from job category
      const isInternship = /intern/i.test(jobType + " " + title)
      const isVolunteer = /volunteer|unpaid/i.test(jobType + " " + title)
      const compensationType = isVolunteer ? "volunteer" : isInternship ? "stipend" : "paid"

      // Determine project type
      const isConsultancy = /consult/i.test(jobType + " " + title)
      const isShortTerm = /short[- ]?term|temporary/i.test(jobType + " " + title)
      const projectType = isConsultancy ? "consultation" : isShortTerm ? "short-term" : "long-term"

      // Skip non-remote jobs (safety filter)
      if (workMode !== "remote") continue

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
        experienceLevel,
        workMode: "remote",
        location: country ? `Remote | ${country}` : "Remote",
        country: country || undefined,
        postedDate: postedDate || new Date(),
        deadline,
        compensationType,
        projectType,
      }
    }

    await sleep(1500)
  }
}

function extractOrgFromText(text: string, title: string): string {
  const cleaned = text.replace(title, "").trim()
  // Look for common org patterns
  const match = cleaned.match(/(?:by|from|source[:\s]*)\s*([A-Z][\w\s&.-]+?)(?:\s{2,}|\n|$)/i)
  return match?.[1]?.trim().slice(0, 100) || ""
}

function tryParseDate(str: string): Date | undefined {
  if (!str) return undefined
  // Try ISO format first
  let d = new Date(str)
  if (!isNaN(d.getTime())) return d
  // Try common date patterns
  const cleaned = str.replace(/\s+/g, " ").trim()
  d = new Date(cleaned)
  return isNaN(d.getTime()) ? undefined : d
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
