// ============================================
// CharityJob Scraper — UK's largest charity job board
// ============================================
// Scrapes from charityjob.co.uk — thousands of charity/NGO jobs
// Replaces the disabled Devex scraper with a working alternative.
// Uses the same platform key "devex" in the registry for backward compat.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.charityjob.co.uk"
const SEARCH_URL = `${BASE_URL}/jobs`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
}

export async function* scrapeCharityJob(
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
          console.warn("[CharityJob] Rate limited at page", page)
          await sleep(10000)
          continue
        }
        if (response.status === 403) {
          console.warn("[CharityJob] Access denied, stopping")
          return
        }
        console.warn(`[CharityJob] HTTP ${response.status} at page ${page}`)
        break
      }
      html = await response.text()
    } catch (err) {
      console.warn(`[CharityJob] Fetch failed page ${page}:`, err)
      break
    }

    const $ = cheerio.load(html)

    // CharityJob listings: look for job links  
    const jobLinks = $('a[href*="/job/"], a[href*="/jobs/"]').filter((_, el) => {
      const href = $(el).attr("href") || ""
      return /\/jobs?\/\d+/.test(href)
    })

    if (jobLinks.length === 0) {
      // Try broader selectors
      const altLinks = $('[class*="job"] a, [class*="listing"] a, [class*="vacancy"] a')
      if (altLinks.length === 0) {
        console.log(`[CharityJob] No job listings on page ${page}, stopping`)
        break
      }
    }

    const processedUrls = new Set<string>()
    const allJobElements = jobLinks.length > 0
      ? jobLinks
      : $('[class*="job"] a[href*="/job"]')

    for (let i = 0; i < allJobElements.length; i++) {
      const $el = $(allJobElements[i])
      const href = $el.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      const title = $el.text().trim()
      if (!title || title.length < 5) continue

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.match(/\/(\d+)/)?.[1] || href.split("/").filter(Boolean).pop() || href

      // Get the containing card/row for metadata
      const $card = $el.closest('[class*="job"], [class*="listing"], li, div').first()
      const cardText = $card.length ? $card.text() : ""

      // Extract organization
      const org = $card.find('[class*="company"], [class*="employer"], [class*="org"]').first().text().trim()
        || extractOrgFromCardText(cardText, title)

      // Extract location
      const location = $card.find('[class*="location"]').first().text().trim()
        || extractLocationFromText(cardText)

      // Extract salary
      const salaryEl = $card.find('[class*="salary"], [class*="pay"]').first().text().trim()
      const salaryMatch = cardText.match(/(£\d[\d,.]+(?:\s*[-–]\s*£?\d[\d,.]+)?(?:\s*(?:per|pa|p\.a\.|\/)\s*(?:annum|year|month))?)/i)
      const salary = salaryEl || (salaryMatch ? salaryMatch[1] : undefined)

      // Extract closing date
      const closingMatch = cardText.match(/(?:closes?|closing|deadline|apply by)[:\s]*(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
      const deadline = closingMatch ? tryParseDate(closingMatch[1]) : undefined

      // Build rich text for analysis
      const allText = [title, org, location, cardText].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)

      const isVolunteer = /volunteer|voluntary|unpaid/i.test(title + " " + cardText)
      const compensationType = isVolunteer ? "volunteer" : salary ? "paid" : "paid"

      const isPartTime = /part[- ]?time/i.test(cardText)
      const isContract = /contract|temporary|fixed[- ]?term/i.test(cardText)
      const projectType = isContract ? "short-term" : "long-term"

      yield {
        sourceplatform: "devex", // reuse platform key for registry compat
        sourceUrl: fullUrl,
        externalId: `charityjob_${externalId}`,
        title,
        description: cardText.slice(0, 5000) || title,
        shortDescription: title,
        organization: org || "Charity Organization",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: detectWorkMode(allText),
        location: location || "United Kingdom",
        country: "United Kingdom",
        deadline,
        salary,
        postedDate: new Date(),
        compensationType,
        projectType,
        timeCommitment: isPartTime ? "Part-time" : undefined,
      }
    }

    await sleep(2000)
  }
}

function extractOrgFromCardText(text: string, title: string): string {
  const BADGE_LABELS = /^(new|featured|hot|promoted|urgent|closing soon|top pick)$/i
  const cleaned = text.replace(title, "").trim()
  // Org name often appears right after title in card text — skip badge labels
  const lines = cleaned.split(/\n/).map(s => s.trim()).filter(s => s.length > 2 && !BADGE_LABELS.test(s))
  if (lines[0] && lines[0].length < 100) return lines[0]
  return ""
}

function extractLocationFromText(text: string): string {
  const match = text.match(/\b(London|Manchester|Birmingham|Edinburgh|Glasgow|Leeds|Bristol|Liverpool|Cardiff|Belfast|Remote|Home[- ]?based|Hybrid)(?:,\s*[A-Z][\w\s]+)?/i)
  return match ? match[0] : ""
}

function tryParseDate(str: string): Date | undefined {
  if (!str) return undefined
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
