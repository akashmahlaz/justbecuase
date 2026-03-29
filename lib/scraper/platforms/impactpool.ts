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
// Use /search endpoint which supports pagination & filtering
const SEARCH_URL = `${BASE_URL}/search`

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
    // Filter for remote/home-based positions
    const url = `${SEARCH_URL}?page=${page}&per_page=40&remote=true`

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

      // Extract organization using robust pattern matching
      // Impactpool cards show org as "ABBREV - Full Name" pattern (e.g., "UNDP - United Nations Development Programme")
      const org = extractOrgFromImpactpool(cardText, title)

      // Extract location — look for patterns with commas, "Remote", or location keywords
      let location = ""
      const locationPatterns = [
        /\b(Remote(?:\s*\|[^|]+)*)\b/i,
        /\b(Home\s*Based(?:\s*[-|][^|]+)*)\b/i,
      ]
      for (const pat of locationPatterns) {
        const m = cardText.match(pat)
        if (m) { location = m[1].trim(); break }
      }
      if (!location) {
        // Parse structured parts from card — skip badge labels
        const BADGE_LABELS = /^(new|featured|hot|promoted|urgent|closing soon|top pick)$/i
        const lines = textAfterTitle.split(/\n/).map(s => s.trim()).filter(s => s.length > 1 && !BADGE_LABELS.test(s))
        for (const line of lines) {
          if (/remote|home based/i.test(line) || line.includes(",") || /\b(office|city|country|global|regional)\b/i.test(line)) {
            location = line
            break
          }
        }
        if (!location && lines[1]) location = lines[1]
      }

      // Skip non-remote jobs (safety filter)
      const workMode = detectWorkMode([title, location, cardText].join(" "))
      if (workMode !== "remote") continue

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
        description: textAfterTitle.slice(0, 5000),
        shortDescription: title,
        organization: org || "International Organization",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: "remote",
        location: location || "Remote",
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

/**
 * Extract organization name from Impactpool card text.
 * Impactpool cards show "ABBREV - Full Org Name" pattern twice (before and after title).
 * e.g., "UNDP - United Nations Development Programme" or "IRC - International Rescue Committee"
 */
function extractOrgFromImpactpool(cardText: string, title: string): string {
  // Pattern: Uppercase abbreviation followed by " - " and a proper name
  // e.g., "UNDP - United Nations Development Programme"
  const orgPattern = /\b([A-Z][A-Z0-9]{1,15}(?:\s*-\s*[A-Z][A-Za-z\s&.'(),-]+?))(?=\s{2,}|\n|$|(?:[A-Z][a-z]))/
  
  // Try matching the pattern in the full card text
  const fullMatch = cardText.match(/\b([A-Z][A-Z0-9]{1,15}\s*-\s*[A-Z][A-Za-z\s&.'(),]+?)(?:\s{2,}|\n|[A-Z][a-z])/g)
  if (fullMatch && fullMatch.length > 0) {
    // Clean and return the first match (org appears before the title)
    const org = fullMatch[0].trim().replace(/\s+/g, " ")
    if (org.length > 3 && org.length < 120) return org
  }

  // Fallback: look for known org patterns in the text before the title
  const beforeTitle = cardText.split(title)[0] || ""
  const knownOrgs = beforeTitle.match(/\b(UNDP|UNICEF|WHO|FAO|UNHCR|UNESCO|WFP|UNFPA|ILO|UNIDO|IAEA|IMF|UNODC|UN Women|UNOPS|OCHA|UNEP|UN-Habitat|UNCTAD|IDB|IRC|WRI|IOM|ICRC|MSF|IFC|AfDB|ADB|OECD|ESA|CIMMYT|GGGI|AMF|CIEL|ICMP|MFO|CIP|ITC|UNDRR|UNHABITAT|UNDSS|UNDPPA|UNV|SOS|WMO|WIPO|IFAD)\b/i)
  if (knownOrgs) {
    // Find the full org name that contains this abbreviation
    const abbrev = knownOrgs[1].toUpperCase()
    const fullPattern = new RegExp(`${abbrev}\\s*[-–]\\s*([A-Z][A-Za-z\\s&.'(),-]+?)(?:\\s{2,}|\\n|$)`)
    const full = cardText.match(fullPattern)
    if (full) return `${abbrev} - ${full[1].trim()}`
    return abbrev
  }

  // Final fallback: text before title, cleaned
  const cleaned = beforeTitle.trim().replace(/^(New|Featured)\s*/i, "").trim()
  if (cleaned.length > 2 && cleaned.length < 120) return cleaned

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
