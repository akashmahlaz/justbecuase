// ============================================
// Impactpool Scraper — improved data extraction
// ============================================
// Scrapes from impactpool.org — jobs in UN, NGOs, and international development
// The ?remote=true filter works (557+ results).
// Card text is concatenated: "OrgAbbrev - Full Name Title OrgAbbrev - Full Name Remote | Location Level"
// Deep scraping (via runner) enriches new items with detail page content.

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.impactpool.org"
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

    // Find all job links
    const jobLinks = $('a[href*="/jobs/"]')
    if (jobLinks.length === 0) {
      console.log(`[Impactpool] No job links on page ${page}, stopping`)
      break
    }

    const processedUrls = new Set<string>()
    let pageYielded = 0

    for (let i = 0; i < jobLinks.length; i++) {
      const $link = $(jobLinks[i])
      const href = $link.attr("href")
      if (!href || processedUrls.has(href)) continue
      // Only process actual job detail links (numeric ID)
      if (!/\/jobs\/\d+/.test(href)) continue
      processedUrls.add(href)

      const linkText = $link.text().trim()
      if (!linkText || linkText.length < 10) continue

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.match(/\/jobs\/(\d+)/)?.[1] || href.split("/").filter(Boolean).pop() || href

      // Parse the concatenated link text
      // Format: "OrgAbbrev - Full Name Title OrgAbbrev - Full Name Remote | Location Level"
      // Or: "Title OrgName Remote | Location Level" (for non-abbreviated orgs)
      const parsed = parseImpactpoolCard(linkText)

      // Skip non-remote (safety — the filter should handle it but just in case)
      if (!parsed.location.toLowerCase().includes("remote") && !parsed.location.toLowerCase().includes("home")) {
        const wm = detectWorkMode(linkText)
        if (wm !== "remote") continue
      }

      const allText = [parsed.title, parsed.org, parsed.location, linkText].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)
      const causes = mapCauseTags(words)
      const skills = mapSkillTags(words)

      // Detect from card type info
      const isInternship = /intern/i.test(parsed.level + " " + parsed.title)
      const isConsultancy = /consult|CON\b/i.test(parsed.level + " " + parsed.title)
      const compensationType = isInternship ? "stipend" : "paid"
      const projectType = isConsultancy ? "consultation" : "long-term"

      yield {
        sourceplatform: "impactpool",
        sourceUrl: fullUrl,
        externalId: `impactpool_${externalId}`,
        title: parsed.title,
        description: linkText.slice(0, 5000),
        shortDescription: parsed.title,
        organization: parsed.org || "International Organization",
        causes,
        skillsRequired: skills,
        experienceLevel: detectExperienceLevel(allText),
        workMode: "remote",
        location: parsed.location || "Remote",
        country: extractCountry(parsed.location),
        deadline: undefined,
        salary: parsed.salary,
        postedDate: new Date(),
        compensationType,
        projectType,
      }
      pageYielded++
    }

    console.log(`[Impactpool] Page ${page}: found ${jobLinks.length} links, yielded ${pageYielded}`)
    await sleep(3000)
  }
}

/**
 * Parse Impactpool card text. The text is fully concatenated:
 * "UNEP - United Nations Environment Programme Private Sector Value Chains Specialist 
 *  UNEP - United Nations Environment Programme Remote | Geneva CON"
 * 
 * Strategy: Find "Remote" keyword to split location section, then use org pattern duplication.
 */
function parseImpactpoolCard(text: string): {
  title: string
  org: string
  location: string
  level: string
  salary: string | undefined
} {
  let cleanText = text.replace(/^(New|Featured)\s*/i, "").trim()

  // Find location: "Remote | City" or "Remote" appears after org duplication
  const remoteIdx = cleanText.search(/\bRemote\b/i)
  let location = ""
  let afterRemote = ""

  if (remoteIdx >= 0) {
    // Location starts at "Remote" and goes to end of that section
    const locationPart = cleanText.slice(remoteIdx)
    // Location is "Remote | City | City2" or "Remote"
    const locationMatch = locationPart.match(/^(Remote(?:\s*\|[^|]+)*(?:\s*-\s*[^|]+)?)/i)
    location = locationMatch ? locationMatch[1].trim() : "Remote"
    afterRemote = locationPart.slice(location.length).trim()
  }

  // Extract salary (rare, but appears like "EUR 91,754... NET annual..." or "$XX,XXX")
  let salary: string | undefined
  const salaryMatch = text.match(/((?:EUR|USD|GBP|CHF|\$|€|£)\s*[\d,]+(?:\s*[-–(].+?(?:\)|NET[^|]*))?)/i)
  if (salaryMatch) salary = salaryMatch[1].trim()

  // Extract level/grade from after the location
  // Common patterns: "CON", "Internship - Internship", "PAL7 - Mid level", "ICS 11", "ICSC-10 - Mid level"
  const level = afterRemote
    .replace(salary || "", "")
    .replace(/\s+/g, " ")
    .trim()

  // Now extract org and title from the text BEFORE "Remote"
  const beforeRemote = remoteIdx >= 0 ? cleanText.slice(0, remoteIdx).trim() : cleanText

  // Org appears as "ABBREV - Full Name" pattern, often duplicated
  // Strategy: find the org pattern and see if it appears twice
  const orgPattern = /\b([A-Z][A-Z0-9]{1,15}\s*-\s*[A-Z][A-Za-z\s&.'(),]+?)(?=\s{2,}|\n|[A-Z][a-z]{2})/
  const orgMatch = beforeRemote.match(orgPattern)

  let org = ""
  let title = beforeRemote

  if (orgMatch) {
    const orgName = orgMatch[1].trim().replace(/\s+/g, " ")
    // Check if org appears twice (common Impactpool pattern)
    const firstIdx = beforeRemote.indexOf(orgName)
    const secondIdx = beforeRemote.indexOf(orgName, firstIdx + orgName.length)

    if (secondIdx > firstIdx) {
      // Org appears twice: text between the two occurrences is the title
      org = orgName
      title = beforeRemote.slice(firstIdx + orgName.length, secondIdx).trim()
    } else {
      // Org appears once: it's either before or after the title
      // Usually org is before the title text on Impactpool
      org = orgName
      title = beforeRemote.replace(orgName, "").trim()
    }
  } else {
    // Try non-abbreviated org: just a name like "GiveDirectly"
    // Find known orgs
    const knownOrg = beforeRemote.match(/\b(GiveDirectly|Total Values|Ekō|Ektimisi\s+Research\s+and\s+Development|Smarter Good|Nordiska rådet[^\n]*ministerrådet)\b/i)
    if (knownOrg) {
      org = knownOrg[1]
      // Check if org appears twice
      const first = beforeRemote.indexOf(org)
      const second = beforeRemote.indexOf(org, first + org.length)
      if (second > first) {
        title = beforeRemote.slice(first + org.length, second).trim()
      } else {
        title = beforeRemote.replace(org, "").trim()
      }
    }
  }

  // Clean up title
  title = title.replace(/^(New|Featured)\s*/i, "").trim()
  if (title.length < 3 && beforeRemote.length > 3) title = beforeRemote

  return { title, org, location, level, salary }
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  // "Remote | Geneva" → country from city
  const parts = location.replace(/^Remote\s*\|?\s*/i, "").split("|").map(s => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts[0] : undefined
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
