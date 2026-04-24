// ============================================
// CharityJob Scraper — UK's largest charity job board
// ============================================
// Scrapes from charityjob.co.uk — thousands of charity/Enterprise jobs
// Note: The ?homeworking=1 filter is weak — still shows on-site and hybrid posts.
// We apply strong client-side filtering: only accept cards containing "(Remote)" in location.
// Uses the same platform key "devex" in the registry for backward compat.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.charityjob.co.uk"
// homeworking=1 is the best URL filter available, but weak
const SEARCH_URL = `${BASE_URL}/jobs?homeworking=1`

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
    const url = page === 1 ? SEARCH_URL : `${SEARCH_URL}&page=${page}`

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

    // CharityJob listings: look for job links with numeric IDs
    const jobLinks = $('a[href*="/jobs/"]').filter((_, el) => {
      const href = $(el).attr("href") || ""
      return /\/jobs\/[^/]+\/[^/]+\/\d+/.test(href) || /\/jobs?\/\d+/.test(href)
    })

    if (jobLinks.length === 0) {
      console.log(`[CharityJob] No job listings on page ${page}, stopping`)
      break
    }

    const processedUrls = new Set<string>()
    let pageYielded = 0
    let pageSkippedNotRemote = 0

    for (let i = 0; i < jobLinks.length; i++) {
      const $el = $(jobLinks[i])
      const href = $el.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      const title = $el.text().trim()
      if (!title || title.length < 5) continue

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.match(/\/(\d+)/)?.[1] || href.split("/").filter(Boolean).pop() || href

      // Get the containing card for metadata
      // CharityJob cards: <article class="job-card-wrapper"> > <div class="job-card">
      // Contains: .organisation (org + location), .job-summary-item (salary), .posted-item
      const $card = $el.closest('article, [class*="job-card"]').first()
      const cardText = $card.length ? $card.text() : ""

      // CRITICAL: Strong remote detection
      // CharityJob cards explicitly show "(Remote)" in the location line
      // Reject anything showing "(On-site)" or "(Hybrid)" or no Remote indicator
      const isRemote = /\(\s*Remote\s*\)/i.test(cardText) || /,\s*Remote\b/i.test(cardText)
      const isOnsite = /\(\s*On-?site\s*\)/i.test(cardText)
      const isHybrid = /\(\s*Hybrid\s*\)/i.test(cardText)

      if (!isRemote || isOnsite || isHybrid) {
        pageSkippedNotRemote++
        continue
      }

      // Extract organization
      // CharityJob uses <div class="organisation">OrgName, Remote</div>
      let org = $card.find('.organisation').first().text().trim()
      // Strip trailing location text like ", Remote" or ", London"
      org = org.replace(/,\s*(Remote|Hybrid|On-?site|Home|London|UK|United Kingdom).*$/i, "").trim()
      if (!org) {
        org = $card.find('[class*="company"], [class*="employer"], [class*="org"]').first().text().trim()
          .replace(/,\s*(Remote|Hybrid|On-?site).*$/i, "")
      }
      if (!org) org = extractOrgFromCardText(cardText, title)

      // Extract salary
      const salaryMatch = cardText.match(/(£\d[\d,.]+(?:\s*[-–]\s*£?\d[\d,.]+)?(?:\s*(?:per|pa|p\.a\.|FTE|\/)\s*(?:annum|year|month|hour|day)[^\n]*)?)/i)
      const salary = salaryMatch ? salaryMatch[1].trim() : undefined

      // Extract closing date
      const closingMatch = cardText.match(/(?:Closing\s+in\s+)(\d+)\s*(days?|weeks?)/i)
      let deadline: Date | undefined
      if (closingMatch) {
        const n = parseInt(closingMatch[1])
        const unit = closingMatch[2].toLowerCase().startsWith("week") ? 7 : 1
        deadline = new Date(Date.now() + n * unit * 86400000)
      }

      // Build rich text for analysis
      const allText = [title, org, cardText].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)

      const isVolunteer = /volunteer|voluntary|unpaid/i.test(title + " " + cardText)
      const compensationType = isVolunteer ? "volunteer" : salary ? "paid" : "paid"

      const isPartTime = /part[- ]?time/i.test(cardText)
      const isContract = /contract|temporary|fixed[- ]?term/i.test(cardText)
      const projectType = isContract ? "short-term" : "long-term"

      yield {
        sourceplatform: "devex",
        sourceUrl: fullUrl,
        externalId: `charityjob_${externalId}`,
        title,
        description: cardText.slice(0, 5000) || title,
        shortDescription: title,
        organization: org || "",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: "remote",
        location: "Remote, United Kingdom",
        country: "United Kingdom",
        deadline,
        salary,
        postedDate: new Date(),
        compensationType,
        projectType,
        timeCommitment: isPartTime ? "Part-time" : undefined,
      }
      pageYielded++
    }

    console.log(`[CharityJob] Page ${page}: yielded ${pageYielded}, skipped ${pageSkippedNotRemote} non-remote`)
    await sleep(2000)
  }
}

function extractOrgFromCardText(text: string, title: string): string {
  const cleaned = text.replace(title, "").trim()
  const lines = cleaned.split(/\n/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 100)
  // Org name is typically the first non-badge line before the title
  const BADGES = /^(new|featured|hot|promoted|urgent|closing|top|apply|posted)/i
  for (const line of lines) {
    if (!BADGES.test(line) && !/^£/.test(line) && !/^\d/.test(line)) return line
  }
  return ""
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
