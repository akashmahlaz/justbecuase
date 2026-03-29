// ============================================
// Idealist Scraper — robust remote-only extraction
// ============================================
// Scrapes remote volunteer & job opportunities from idealist.org
// Card text is concatenated: "OrgNameRemoteAnywherePosted 3 days ago"
// We split on "Remote"/"On-site" to reliably extract org name.
// Also scrapes /jobs for remote paid positions.
// Deep scraping (via runner) enriches new items with full detail page content.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.idealist.org"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

// Badge/tag labels to strip from org name extraction
const BADGE_LABELS = /^(new|featured|hot|promoted|urgent|closing soon|top pick|done in a day|family friendly|good for groups|training provided|remote|on-site|hybrid)$/i
const POSTED_PATTERN = /Posted\s+\d+\s+(?:minute|hour|day|week|month)s?\s+ago/i
const LOCATION_TYPE_SPLIT = /(?:Remote|On-site|Hybrid)\s*/

// Both volunteer and job search URLs — remote only
const SEARCH_URLS = [
  { base: `${BASE_URL}/en/volunteer-opportunities`, type: "VOLOP", compensationType: "volunteer" as const },
  { base: `${BASE_URL}/en/jobs`, type: "JOB", compensationType: "paid" as const },
]

export async function* scrapeIdealist(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)

  for (const searchConfig of SEARCH_URLS) {
    for (let page = 1; page <= maxPages; page++) {
      // Filter for remote opportunities only
      const url = `${searchConfig.base}?page=${page}&q=&type=${searchConfig.type}&locationType=REMOTE`

      let html: string
      try {
        const response = await fetch(url, {
          headers: HEADERS,
          signal: AbortSignal.timeout(30000),
        })

        if (!response.ok) {
          if (response.status === 429) {
            console.warn("[Idealist] Rate limited at page", page)
            await sleep(10000)
            continue
          }
          console.warn(`[Idealist] HTTP ${response.status} at page ${page}`)
          break
        }
        html = await response.text()
      } catch (err) {
        console.warn(`[Idealist] Fetch failed page ${page}:`, err)
        break
      }

      const $ = cheerio.load(html)

      // Idealist uses /volunteer-opportunity/ or /job/ in listing links
      const linkPattern = searchConfig.type === "VOLOP"
        ? 'a[href*="/volunteer-opportunity/"]'
        : 'a[href*="/en/job/"]'
      const listings = $(linkPattern)
      if (listings.length === 0) {
        console.log(`[Idealist] No ${searchConfig.type} listings on page ${page}, stopping`)
        break
      }

      const processedUrls = new Set<string>()

      for (let i = 0; i < listings.length; i++) {
        const $el = $(listings[i])
        const href = $el.attr("href")
        if (!href || processedUrls.has(href)) continue
        processedUrls.add(href)

        // Title is inside an h3 within the link
        const title = $el.find("h3").first().text().trim()
          || $el.text().trim().split("\n")[0]?.trim()
        if (!title || title.length < 5) continue

        // ---- Smart org extraction ----
        // Card text is concatenated: "OrgNameRemoteAnywherePosted 3 days ago"
        const fullText = $el.text().trim()
        const textAfterTitle = fullText.replace(title, "").trim()

        // Split on "Remote"/"On-site"/"Hybrid" to separate org from rest
        const { orgName, location, timeCommitment, postedDate } = parseIdealistCardText(textAfterTitle)

        // Skip non-remote (safety filter — should be rare with locationType=REMOTE)
        const workMode = detectWorkMode(fullText)
        if (workMode !== "remote") continue

        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
        const externalId = href.split("/").filter(Boolean).pop() || href

        const allText = [title, orgName, location, textAfterTitle].join(" ")
        const words = allText.split(/[\s,;]+/).filter(w => w.length > 3)
        const causes = mapCauseTags(words)
        const skills = mapSkillTags(words)
        const experienceLevel = detectExperienceLevel(allText)

        yield {
          sourceplatform: "idealist",
          sourceUrl: fullUrl,
          externalId: `idealist_${externalId}`,
          title,
          description: textAfterTitle.slice(0, 5000) || title,
          shortDescription: title,
          organization: orgName || "Organization on Idealist",
          causes,
          skillsRequired: skills,
          experienceLevel,
          workMode: "remote",
          location: location || "Remote",
          country: extractCountry(location),
          timeCommitment: timeCommitment || undefined,
          postedDate,
          compensationType: searchConfig.compensationType,
          projectType: searchConfig.type === "JOB" ? "long-term" : "short-term",
        }
      }

      await sleep(2000)
    }
  }
}

/**
 * Parse the concatenated Idealist card text that appears after the title.
 * Text looks like: "MatchingDonors.comRemoteAnywherePosted 1 day ago"
 * or: "SNO-KING WATERSHED COUNCIL On-siteKenmore, WAPosted 3 hours ago"
 */
function parseIdealistCardText(text: string): {
  orgName: string
  location: string
  timeCommitment: string
  postedDate: Date
} {
  let orgName = ""
  let location = ""
  let timeCommitment = ""
  let postedDate = new Date()

  // Extract "Posted X ago" and remove it
  const postedMatch = text.match(/Posted\s+(\d+\s+(?:minute|hour|day|week|month)s?\s+ago)/i)
  if (postedMatch) {
    postedDate = parseRelativeDate(postedMatch[1])
    text = text.replace(postedMatch[0], "").trim()
  }

  // Remove known badge labels from the text
  const badges = ["Done in a Day", "Family Friendly", "Good for Groups", "Training Provided"]
  for (const badge of badges) {
    text = text.replace(new RegExp(badge, "gi"), "").trim()
  }

  // Remove "location-filled icon" artifacts
  text = text.replace(/location-filled\s*icon/gi, "").trim()
  // Remove "calendar icon" date strings
  text = text.replace(/calendar\s*icon\s*[\d/\s:APMapm-]+(?:\s*(?:EST|PST|PDT|CST|MST|MDT|EDT|CDT))?/gi, "").trim()

  // Split on "Remote" / "On-site" / "Hybrid" — org is BEFORE, location is AFTER
  const splitMatch = text.match(/^(.*?)(Remote|On-site|Hybrid)(.*?)$/i)
  if (splitMatch) {
    orgName = splitMatch[1].trim()
    const afterWorkMode = splitMatch[3].trim()
    // Location is next — could be "Anywhere", "Crystal Lake, IL", etc.
    location = afterWorkMode
      .replace(POSTED_PATTERN, "")
      .replace(/\s+/g, " ")
      .trim()
    if (location === "Anywhere" || !location) location = "Remote"
  } else {
    // Fallback: split by whitespace blocks or newlines
    const parts = text.split(/\s{2,}|\n/).map(s => s.trim()).filter(s => s.length > 1 && !BADGE_LABELS.test(s))
    orgName = parts[0] || ""
    location = extractLocationFromParts(parts)
  }

  // Clean org name — remove trailing/leading special chars
  orgName = orgName.replace(/^[\s,;|·]+|[\s,;|·]+$/g, "").trim()

  // Extract time commitment from original text
  const timeMatch = text.match(/(\d+\s*(?:hours?|hrs?)\s*(?:\/|per)\s*(?:week|month|day))/i)
  if (timeMatch) timeCommitment = timeMatch[1]

  return { orgName, location, timeCommitment, postedDate }
}

function extractLocationFromParts(parts: string[]): string {
  for (const part of parts) {
    if (/^remote$/i.test(part)) return "Remote"
    if (/[A-Z][a-z]+,\s*[A-Z]/.test(part)) return part
    if (/\b(united states|canada|uk|india|kenya|nigeria|germany|france|australia)\b/i.test(part)) return part
  }
  return ""
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  const parts = location.split(",").map(s => s.trim())
  return parts.length > 1 ? parts[parts.length - 1] : undefined
}

/** Parse relative date strings like "3 days ago", "2 weeks ago" */
function parseRelativeDate(text: string): Date {
  const now = new Date()
  const match = text.match(/(\d+)\s*(day|week|month|hour)s?\s*ago/i)
  if (!match) return now
  const num = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  if (unit === "hour") now.setHours(now.getHours() - num)
  else if (unit === "day") now.setDate(now.getDate() - num)
  else if (unit === "week") now.setDate(now.getDate() - num * 7)
  else if (unit === "month") now.setMonth(now.getMonth() - num)
  return now
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
