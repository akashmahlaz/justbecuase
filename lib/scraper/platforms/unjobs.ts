// ============================================
// UN Jobs Scraper — HTML scraping with improved extraction
// ============================================
// Scrapes from unjobs.org (independent UN job aggregator)
// Extracts structured metadata and full descriptions from listings.
// Deep scraping (via runner) enriches new items with detail page content.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://unjobs.org"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

// Major UN/international organizations for name recognition
const ORG_PATTERNS = [
  /\b(UNDP|UNICEF|WHO|FAO|UNHCR|UNESCO|WFP|UNFPA|ILO|UNIDO|ITU|IAEA|IMF|UNODC|UN Women|UNOPS|OCHA|ECLAC|ESCAP|ECA|UNEP|UN-Habitat|UNCTAD|UNWTO|UPU|WIPO|WMO|IFAD)\b/,
  /\b(World Bank|Red Cross|ICRC|MSF|Save the Children|Oxfam|CARE|World Vision|Mercy Corps|IRC|ACTED|NRC|DRC|Plan International|ActionAid|Amnesty International)\b/i,
  /\b(African Development Bank|Asian Development Bank|Inter-American Development Bank|European Commission|OECD|NATO)\b/i,
]

export async function* scrapeUNJobs(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "3", 10)

  for (let page = 1; page <= maxPages; page++) {
    // Filter for remote positions
    const url = page === 1 ? `${BASE_URL}/?q=remote` : `${BASE_URL}/?q=remote&page=${page}`

    let html: string
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("[UNJobs] Rate limited at page", page)
          await sleep(10000)
          continue
        }
        console.warn(`[UNJobs] HTTP ${response.status} at page ${page}`)
        break
      }
      html = await response.text()
    } catch (err) {
      console.warn(`[UNJobs] Fetch failed page ${page}:`, err)
      break
    }

    const $ = cheerio.load(html)

    const vacancyLinks = $('a[href*="/vacancies/"]')
    if (vacancyLinks.length === 0) {
      console.log(`[UNJobs] No vacancy links on page ${page}, stopping`)
      break
    }

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

      // The vacancy entry sits inside a container with metadata
      const $container = $link.closest("div, tr, li, article")
      const containerText = $container.length ? $container.text() : ""

      // Extract deadline from ISO date or date patterns
      const dateMatch = containerText.match(/\d{4}-\d{2}-\d{2}(?:T[\d:]+Z)?/)
      const deadline = dateMatch ? tryParseDate(dateMatch[0]) : undefined

      // Extract location from container text
      const locationMatch = containerText.match(/(?:Duty Station|Location)[:\s]*([A-Z][\w\s,.-]+?)(?:\s{2,}|\n|$)/i)
      const location = locationMatch ? locationMatch[1].trim() : ""

      // Extract organization using pattern matching
      const org = extractOrg(title + " " + containerText)

      // Extract grade/level if present  
      const gradeMatch = containerText.match(/\b([PGD]-\d|NO-[A-D]|UNV|SC-\d+|GS-\d+|P\d|D\d|ASG)\b/)
      const grade = gradeMatch ? gradeMatch[1] : ""

      // Build rich text for analysis
      const allText = [title, containerText, org, location, grade].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)

      // Determine contract type from title/text
      const isConsultancy = /consult/i.test(title)
      const isInternship = /intern/i.test(title)
      const isTemporary = /temporary|short[- ]term/i.test(title + " " + containerText)
      const projectType = isConsultancy ? "consultation" : isTemporary ? "short-term" : "long-term"
      const compensationType = isInternship ? "stipend" : "paid"

      // Skip non-remote jobs (safety filter)
      const workMode = detectWorkMode(allText)
      if (workMode !== "remote") continue

      yield {
        sourceplatform: "unjobs",
        sourceUrl: fullUrl,
        externalId: `unjobs_${externalId}`,
        title,
        description: containerText.trim().slice(0, 5000) || title,
        shortDescription: title + (grade ? ` (${grade})` : ""),
        organization: org || "United Nations",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: "remote",
        location: location || "Remote",
        country: extractCountry(location),
        deadline,
        postedDate: new Date(),
        compensationType,
        projectType,
      }
    }

    await sleep(3000)
  }
}

function extractOrg(text: string): string {
  for (const pattern of ORG_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return ""
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  const parts = location.split(",").map(s => s.trim())
  return parts.length > 1 ? parts[parts.length - 1] : undefined
}

function tryParseDate(str: string): Date | undefined {
  if (!str) return undefined
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
