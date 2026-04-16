// ============================================
// Catchafire Scraper — HTML scraping from /volunteer/ listing
// ===========================================
// Scrapes volunteer opportunities from catchafire.org
// Catches: nonprofit skills-based volunteering platform
//
// URL: https://www.catchafire.org/volunteer/

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.catchafire.org"
const VOLUNTEER_URL = `${BASE_URL}/volunteer/`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeCatchafire(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "10", 10)
  const globalSeen = new Set<string>()

  console.log(`[Catchafire] Starting scraper, maxPages=${maxPages}`)

  for (let page = 0; page < maxPages; page++) {
    const url = page === 0 ? VOLUNTEER_URL : `${VOLUNTEER_URL}?page=${page + 1}`
    console.log(`[Catchafire] Fetching page ${page + 1}: ${url}`)

    let html: string
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        console.warn(`[Catchafire] HTTP ${response.status} at page ${page + 1}`)
        break
      }
      html = await response.text()
    } catch (err) {
      console.warn(`[Catchafire] Fetch failed page ${page + 1}:`, err)
      break
    }

    const $ = cheerio.load(html)

    // Catchafire listings are in article elements or divs with opportunity data
    // Look for common patterns: .opportunity-card, [data-opportunity], .listing-item
    const opportunityLinks = $('a[href*="/volunteer/"]').filter((_, el) => {
      const href = $(el).attr("href") || ""
      // Skip non-opportunity pages
      return !href.includes("/orgs/") && !href.includes("/about") && !href.includes("/faq")
    })

    if (opportunityLinks.length === 0) {
      console.log(`[Catchafire] No opportunity links found on page ${page + 1}, stopping`)
      break
    }

    let pageYielded = 0

    for (let i = 0; i < opportunityLinks.length; i++) {
      const $link = $(opportunityLinks[i])
      const href = $link.attr("href")
      if (!href || globalSeen.has(href)) continue
      globalSeen.add(href)

      const title = $link.text().trim()
      if (!title || title.length < 5) continue

      // Build full URL
      const detailUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`

      // Extract opportunity data from the card/list item
      const $card = $link.closest("[data-opportunity-id], .opportunity-card, .card, .listing-item, article")
      const $parent = $card.length ? $card : $link.parent()

      // Try to extract organization name from the card
      let organization = ""
      const orgEl = $card.find(".org-name, .organization, [class*='org'], [class*='organization']").first()
      if (orgEl.length) {
        organization = orgEl.text().trim()
      }
      if (!organization) {
        // Try sibling or nearby text
        organization = $parent.find("[class*='org'], [class*='organization']").first().text().trim()
      }

      // Extract location / work mode
      let location = ""
      let workMode: "remote" | "onsite" | "hybrid" = "remote"
      const locationEl = $card.find(".location, [class*='location'], [class*='city']").first()
      if (locationEl.length) {
        location = locationEl.text().trim()
        workMode = detectWorkMode(location)
      }

      // Extract time commitment
      let timeCommitment = ""
      const timeEl = $card.find(".time, [class*='time'], [class*='commitment']").first()
      if (timeEl.length) {
        timeCommitment = timeEl.text().trim()
      }

      // Extract skills
      const skillEls = $card.find(".skills [class*='tag'], .skill-tag, [class*='skill']")
      const rawSkills: string[] = []
      skillEls.each((_, el) => {
        const t = $(el).text().trim()
        if (t) rawSkills.push(t)
      })

      const allText = [title, organization, location, timeCommitment, ...rawSkills].join(" ")
      const skills = mapSkillTags(rawSkills.length > 0 ? rawSkills : allText.split(/[\s,;:]+/).filter(w => w.length > 3))
      const causes = mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))

      // Try to extract deadline
      let deadline: Date | undefined
      const deadlineEl = $card.find(".deadline, [class*='deadline'], [class*='due']").first()
      if (deadlineEl.length) {
        const deadlineStr = deadlineEl.text().trim()
        const parsed = tryParseDate(deadlineStr)
        if (parsed) deadline = parsed
      }

      // Build short description from visible text
      const shortDescription = $card.find(".description, .excerpt, [class*='desc'], p").first().text().trim().slice(0, 280)

      const opp: ScrapedOpportunity = {
        sourceplatform: "catchafire",
        sourceUrl: detailUrl,
        externalId: `catchafire_${href.replace(/[^a-z0-9]/gi, "_").replace(/^.*volunteer\//i, "").replace(/\/$/, "")}`,
        title,
        description: shortDescription || title,
        shortDescription: shortDescription.slice(0, 280),
        organization: organization || "Organization on Catchafire",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode,
        location: location || "Remote",
        timeCommitment: timeCommitment || undefined,
        projectType: "short-term",
        compensationType: "volunteer",
        deadline,
        postedDate: new Date(),
      }

      yield opp
      pageYielded++
    }

    console.log(`[Catchafire] Page ${page + 1}: yielded ${pageYielded} opportunities`)

    // If fewer results than expected, we've hit the last page
    if (pageYielded === 0) break

    await sleep(1000) // Be polite between pages
  }

  console.log(`[Catchafire] Done. Total unique opportunities: ${globalSeen.size}`)
}

// ============================================
// Detail page scraping (optional deep scrape)
// ===========================================
export async function scrapeCatchafireDetail(
  url: string
): Promise<ScrapedOpportunity | null> {
  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    const title =
      $("h1").first().text().trim() ||
      $("[class*='title']").first().text().trim() ||
      "Untitled"

    const description =
      $("[class*='description'], .job-description, .opp-description").first().text().trim().slice(0, 5000) ||
      $("main").text().slice(0, 3000)

    const organization =
      $("[class*='org-name'], [class*='organization-name'], .org").first().text().trim() ||
      "Organization on Catchafire"

    const allText = [title, description, organization].join(" ")
    const skills = mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))
    const causes = mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))

    return {
      sourceplatform: "catchafire",
      sourceUrl: url,
      externalId: `catchafire_${url.replace(/[^a-z0-9]/gi, "_").replace(/^.*volunteer\//i, "").replace(/\/$/, "")}`,
      title,
      description,
      shortDescription: description.slice(0, 280),
      organization,
      causes,
      skillsRequired: skills,
      experienceLevel: detectExperienceLevel(allText),
      workMode: detectWorkMode(allText),
      location: $("[class*='location']").first().text().trim() || "Remote",
      compensationType: "volunteer",
      projectType: "short-term",
      postedDate: new Date(),
    }
  } catch (err) {
    console.warn(`[Catchafire] Detail fetch failed for ${url}:`, err)
    return null
  }
}

// ============================================
// Helpers
// ===========================================
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function tryParseDate(str: string): Date | undefined {
  if (!str) return undefined
  // Remove common prefixes
  const cleaned = str.replace(/^(by|deadline|due|closes?|expires?)\s*:\s*/i, "").trim()
  const date = new Date(cleaned)
  return isNaN(date.getTime()) ? undefined : date
}
