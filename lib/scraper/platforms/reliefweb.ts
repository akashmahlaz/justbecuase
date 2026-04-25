// ============================================
// ReliefWeb Scraper — HTML scraping from /jobs endpoint
// ============================================
// Scrapes job listings from reliefweb.int/jobs (NOT /updates which shows reports)
// Uses the dedicated "Remote / Roster / Roving" list for targeted remote jobs
// plus keyword search "remote" for broader coverage.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://reliefweb.int"

// Two search strategies for maximum coverage:
// 1. Dedicated remote/roving list (curated by ReliefWeb, ~100 jobs)
// 2. Keyword search for "remote" across all jobs (~189 jobs)
const SEARCH_URLS = [
  `${BASE_URL}/jobs?list=Remote%20/%20Roster%20/%20Roving&view=unspecified-location`,
  `${BASE_URL}/jobs?search=remote`,
]

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeReliefWeb(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)
  const globalSeen = new Set<string>()

  for (const baseSearchUrl of SEARCH_URLS) {
    console.log(`[ReliefWeb] Scraping: ${baseSearchUrl}`)

    for (let page = 0; page < maxPages; page++) {
      const url = page === 0 ? baseSearchUrl : `${baseSearchUrl}&page=${page}`

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

      // ReliefWeb jobs page uses a[href*="/job/"] — NOT "/report/"
      const jobLinks = $('a[href*="/job/"]')
      if (jobLinks.length === 0) {
        console.log(`[ReliefWeb] No job links on page ${page}, stopping this URL`)
        break
      }

      let pageYielded = 0

      for (let i = 0; i < jobLinks.length; i++) {
        const $link = $(jobLinks[i])
        const href = $link.attr("href")
        if (!href || globalSeen.has(href)) continue
        globalSeen.add(href)

        const title = $link.text().trim()
        if (!title || title.length < 5) continue

        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
        // Extract job ID from URL like /job/4204802/title-slug
        const idMatch = href.match(/\/job\/(\d+)/)
        const externalId = idMatch ? idMatch[1] : href.split("/").filter(Boolean).pop() || href

        // Walk up the DOM to find the containing article card
        const $container = $link.closest("article")
        if (!$container.length) continue
        const containerText = $container.text() || ""

        // Extract structured fields directly from DOM selectors (more reliable than regex)
        const parsed = parseReliefWebCardDOM($, $container, containerText, title)

        // Build rich text for analysis
        const allText = [title, parsed.org, parsed.country, containerText].join(" ")
        const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
        const causes = mapCauseTags(words)
        const skills = mapSkillTags(words)

        const workMode = detectWorkMode(allText)
        const experienceLevel = detectExperienceLevel(allText)

        // Determine compensation type
        const isInternship = /intern/i.test(title)
        const isVolunteer = /volunteer|unpaid/i.test(title)
        const compensationType = isVolunteer ? "volunteer" : isInternship ? "stipend" : "paid"

        // Determine project type
        const isConsultancy = /consult/i.test(title)
        const isShortTerm = /short[- ]?term|temporary/i.test(title + " " + containerText)
        const projectType = isConsultancy ? "consultation" : isShortTerm ? "short-term" : "long-term"

        // For the dedicated remote list, accept all (they're curated remote)
        // For keyword search, apply safety filter
        const isRemoteList = baseSearchUrl.includes("unspecified-location")
        if (!isRemoteList && workMode !== "remote") continue

        yield {
          sourceplatform: "reliefweb",
          sourceUrl: fullUrl,
          externalId: `rw_${externalId}`,
          title,
          description: containerText.trim().slice(0, 5000) || title,
          shortDescription: title,
          organization: parsed.org || "",
          causes,
          skillsRequired: skills,
          experienceLevel,
          workMode: "remote",
          location: parsed.country ? `Remote | ${parsed.country}` : "Remote",
          country: parsed.country || undefined,
          postedDate: parsed.posted || new Date(),
          deadline: parsed.closing,
          compensationType,
          projectType,
        }
        pageYielded++
      }

      console.log(`[ReliefWeb] Page ${page}: found ${jobLinks.length} links, yielded ${pageYielded}`)
      await sleep(1500)
    }

    await sleep(2000)
  }
}

/**
 * Extract structured fields from a ReliefWeb job card using DOM selectors.
 * The HTML uses <dl> with semantic classes:
 *   <dt class="rw-entity-meta__tag-label--source">Organization</dt>
 *   <dd class="rw-entity-meta__tag-value--source"><a>OrgName</a></dd>
 *   <dd class="rw-entity-meta__tag-value--posted"><time datetime="...">Date</time></dd>
 *   <dd class="rw-entity-meta__tag-value--closing-date"><time datetime="...">Date</time></dd>
 *   <a class="rw-entity-country-slug__link">Country</a>
 */
function parseReliefWebCardDOM(
  $: cheerio.CheerioAPI,
  $container: cheerio.Cheerio<any>,
  text: string,
  title: string
): {
  org: string
  posted: Date | undefined
  closing: Date | undefined
  country: string
} {
  // Organization: from the source meta tag or link
  const orgEl = $container.find('.rw-entity-meta__tag-value--source a, dd[class*="source"] a').first()
  let org = orgEl.length ? orgEl.text().trim() : ""

  // Fallback: try regex on text (colon may or may not be present)
  if (!org) {
    const orgMatch = text.match(/(?:Organization|Source)\s*:?\s*\n?\s*([^\n]+)/i)
    org = orgMatch ? orgMatch[1].trim().replace(/\s+/g, " ") : ""
  }

  // Posted date: prefer datetime attribute from <time> element
  const postedTimeEl = $container.find('.rw-entity-meta__tag-value--posted time, dd[class*="posted"] time').first()
  let posted: Date | undefined
  if (postedTimeEl.length) {
    const dt = postedTimeEl.attr("datetime")
    posted = dt ? tryParseDate(dt) : tryParseDate(postedTimeEl.text().trim())
  }
  if (!posted) {
    const postedMatch = text.match(/Posted\s*:?\s*\n?\s*(\d{1,2}\s+\w{3}\s+\d{4})/i)
    posted = postedMatch ? tryParseDate(postedMatch[1]) : undefined
  }

  // Closing date: prefer datetime attribute from <time> element
  const closingTimeEl = $container.find('.rw-entity-meta__tag-value--closing-date time, dd[class*="closing"] time').first()
  let closing: Date | undefined
  if (closingTimeEl.length) {
    const dt = closingTimeEl.attr("datetime")
    closing = dt ? tryParseDate(dt) : tryParseDate(closingTimeEl.text().trim())
  }
  if (!closing) {
    const closingMatch = text.match(/Closing\s*(?:date)?\s*:?\s*\n?\s*(\d{1,2}\s+\w{3}\s+\d{4})/i)
    closing = closingMatch ? tryParseDate(closingMatch[1]) : undefined
  }

  // Country: from the country slug link
  const countryEl = $container.find('.rw-entity-country-slug__link, a[class*="country-slug"]').first()
  let country = countryEl.length ? countryEl.text().trim() : ""

  // Fallback: regex for country
  if (!country) {
    let remaining = text
      .replace(title, "")
      .replace(org, "")
      .replace(/(?:Organization|Source)\s*:?[^\n]*/gi, "")
      .replace(/Posted\s*:?[^\n]*/gi, "")
      .replace(/Closing\s*(?:date)?\s*:?[^\n]*/gi, "")
      .replace(/Format\s*:?[^\n]*/gi, "")
      .trim()
    const countryMatch = remaining.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s*$/m)
    country = countryMatch ? countryMatch[1].trim() : ""
  }

  return { org, posted, closing, country }
}

function tryParseDate(str: string): Date | undefined {
  if (!str) return undefined
  let d = new Date(str)
  if (!isNaN(d.getTime())) return d
  const cleaned = str.replace(/\s+/g, " ").trim()
  d = new Date(cleaned)
  return isNaN(d.getTime()) ? undefined : d
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
