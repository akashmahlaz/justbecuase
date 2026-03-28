// ============================================
// Impactpool Scraper — improved data extraction
// ============================================
// Scrapes from impactpool.org — jobs in UN, NGOs, and international development
// Extracts richer structured data from listing cards.
// Deep scraping (via runner) enriches new items with detail page content.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.impactpool.org"
const SEARCH_URL = `${BASE_URL}/jobs`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeImpactpool(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "3", 10)

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
          console.warn("[Impactpool] Rate limited at page", page)
          await sleep(10000)
          continue
        }
        console.warn(`[Impactpool] HTTP ${response.status} at page ${page}`)
        break
      }
      html = await response.text()
    } catch (err) {
      console.warn(`[Impactpool] Fetch failed page ${page}:`, err)
      break
    }

    const $ = cheerio.load(html)

    // Impactpool uses div.job containers for each job card
    const jobCards = $("div.job")
    if (jobCards.length === 0) {
      // Fallback: try other common selectors
      const altCards = $('a[href*="/jobs/"]')
      if (altCards.length === 0) {
        console.log(`[Impactpool] No job cards on page ${page}, stopping`)
        break
      }
    }

    const processedUrls = new Set<string>()

    // Process standard job cards
    const selector = jobCards.length > 0 ? "div.job" : '[class*="job-card"], [class*="listing"]'
    $(selector).each((_, el) => void 0) // just to check

    for (let i = 0; i < (jobCards.length || $('a[href*="/jobs/"]').length); i++) {
      const $card = jobCards.length > 0 ? $(jobCards[i]) : $($('a[href*="/jobs/"]')[i]).closest("div")

      // Job link inside the card
      const $link = $card.find('a[href*="/jobs/"]').first()
      const href = $link.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      const title = $link.text().trim()
      if (!title || title.length < 5) continue

      const cardText = $card.text().trim()
      const textAfterTitle = cardText.replace(title, "").trim()

      // Parse structured data from card
      const lines = textAfterTitle.split(/\n/).map(s => s.trim()).filter(s => s.length > 1)
      const org = lines[0] || ""

      // Extract location — look for patterns with commas or location keywords
      let location = ""
      for (const line of lines) {
        if (/remote|home based/i.test(line) || line.includes(",") || /\b(office|city|country|global|regional)\b/i.test(line)) {
          location = line
          break
        }
      }
      if (!location && lines[1]) location = lines[1]

      // Extract deadline from card text
      const deadlineMatch = cardText.match(/(?:closes?|deadline|apply by|closing)[:\s]*(\w+ \d+,?\s*\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
      const deadline = deadlineMatch ? tryParseDate(deadlineMatch[1]) : undefined

      // Extract salary information
      const salaryMatch = cardText.match(/(?:salary|compensation)[:\s]*([\$€£]\s*[\d,]+(?:\s*[-–]\s*[\$€£]?\s*[\d,]+)?(?:\s*(?:per|\/)\s*(?:month|year|annum))?)/i)
      const salary = salaryMatch ? salaryMatch[1].trim() : undefined

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").filter(Boolean).pop() || href

      const allText = [title, org, location, cardText].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)

      // Detect compensation type
      const isVolunteer = /volunteer|unpaid/i.test(title + " " + cardText)
      const isInternship = /intern/i.test(title)
      const compensationType = isVolunteer ? "volunteer" : isInternship ? "stipend" : "paid"

      // Detect project type
      const isConsultancy = /consult/i.test(title)
      const isShortTerm = /short[- ]?term|temporary/i.test(title + " " + cardText)
      const projectType = isConsultancy ? "consultation" : isShortTerm ? "short-term" : "long-term"

      yield {
        sourceplatform: "impactpool",
        sourceUrl: fullUrl,
        externalId: `impactpool_${externalId}`,
        title,
        description: cardText.slice(0, 5000),
        shortDescription: title,
        organization: org || "Organization on Impactpool",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: detectWorkMode(allText),
        location: location || undefined,
        country: extractCountry(location),
        deadline,
        salary,
        postedDate: new Date(),
        compensationType,
        projectType,
      }
    }

    await sleep(3000)
  }
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
