// ============================================
// Impactpool Scraper — DOM-based extraction
// ============================================
// Scrapes from impactpool.org — jobs in UN, NGOs, and international development.
// Uses proper CSS selectors on structured DOM elements:
//   div[type="cardTitle"]         → Job title
//   div[type="bodyEmphasis"] #1C1B16 → Organization (full name)
//   div[type="bodyEmphasis"] #63625B → Location
//   div[type="bodyEmphasis"] #8A8881 → Level/grade
//   img[alt] inside card link     → Org logo + alt text as org name
// Detail page: h1[type="subHeading"], span[type="bodyEmphasis"], div.main-content

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
  const maxPages = parseInt(settings.maxPages || "5", 10)

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

    // Each job card is a div.job containing an <a> with structured child elements
    const jobCards = $("div.job")
    if (jobCards.length === 0) {
      console.log(`[Impactpool] No job cards on page ${page}, stopping`)
      break
    }

    const processedUrls = new Set<string>()
    let pageYielded = 0

    jobCards.each((_i, card) => {
      const $card = $(card)
      const $link = $card.find('a[href*="/jobs/"]').first()
      const href = $link.attr("href")
      if (!href || processedUrls.has(href)) return
      if (!/\/jobs\/\d+/.test(href)) return
      processedUrls.add(href)

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.match(/\/jobs\/(\d+)/)?.[1] || ""
      if (!externalId) return

      // ---- Extract structured fields from DOM elements ----

      // Title: div with type="cardTitle"
      const title = $link.find("[type='cardTitle']").first().text().trim()
      if (!title || title.length < 3) return

      // Organization: first div[type="bodyEmphasis"] with color #1C1B16 (NOT the cardTitle)
      // The org is the first bodyEmphasis element in the metadata layout
      let organization = ""
      let organizationLogo = ""

      // Method 1: img alt attribute (most reliable — always has full org name)
      const $img = $link.find("img").first()
      const imgAlt = $img.attr("alt") || ""
      const imgSrc = $img.attr("src") || ""
      // Skip separator/decoration images
      if (imgAlt && !imgAlt.includes("ellipse") && imgAlt.length > 2) {
        organization = imgAlt.trim()
        if (imgSrc && !imgSrc.includes("ellipse") && !imgSrc.includes("assets/")) {
          organizationLogo = imgSrc.startsWith("http") ? imgSrc : `${BASE_URL}${imgSrc}`
        }
      }

      // Method 2: First bodyEmphasis div with color #1C1B16 (not the title)
      if (!organization) {
        $link.find("[type='bodyEmphasis']").each((_j, el) => {
          const style = $(el).attr("style") || ""
          if (style.includes("#1C1B16") && !organization) {
            const text = $(el).clone().children().remove().end().text().trim()
            if (text.length > 2) organization = text
          }
        })
      }

      // Location: bodyEmphasis with color #63625B
      let location = ""
      $link.find("[type='bodyEmphasis']").each((_j, el) => {
        const style = $(el).attr("style") || ""
        if (style.includes("#63625B") && !location) {
          location = $(el).text().trim()
        }
      })

      // Level/grade: bodyEmphasis with color #8A8881
      let level = ""
      $link.find("[type='bodyEmphasis']").each((_j, el) => {
        const style = $(el).attr("style") || ""
        if (style.includes("#8A8881") && !level) {
          level = $(el).text().trim()
        }
      })

      // Skip non-remote (safety check)
      if (!location.toLowerCase().includes("remote") && !location.toLowerCase().includes("home")) {
        const fullText = [title, organization, location].join(" ")
        if (detectWorkMode(fullText) !== "remote") return
      }

      // Build description from structured parts
      const description = [title, organization, location, level].filter(Boolean).join("\n")

      // Detect compensation and project type from level text
      const isInternship = /intern/i.test(level + " " + title)
      const isConsultancy = /consult|CON\b/i.test(level + " " + title)
      const compensationType = isInternship ? "stipend" : "paid"
      const projectType = isConsultancy ? "consultation" : "long-term"

      // Extract salary if present
      let salary: string | undefined
      const salaryMatch = level.match(/((?:EUR|USD|GBP|CHF|\$|€|£)\s*[\d,]+[^,]*)/i)
      if (salaryMatch) salary = salaryMatch[1].trim()

      // Map skills and causes
      const allText = [title, organization, location, level].join(" ")
      const words = allText.split(/[\s,;:]+/).filter(w => w.length > 3)

      const result: ScrapedOpportunity = {
        sourceplatform: "impactpool",
        sourceUrl: fullUrl,
        externalId: `impactpool_${externalId}`,
        title,
        description,
        shortDescription: title,
        organization,
        organizationLogo: organizationLogo || undefined,
        causes: mapCauseTags(words),
        skillsRequired: mapSkillTags(words),
        experienceLevel: detectExperienceLevel(allText),
        workMode: "remote",
        location: location || "Remote",
        country: extractCountry(location),
        deadline: undefined,
        salary,
        postedDate: new Date(),
        compensationType,
        projectType,
      }

      // We need to yield from inside .each() — collect items instead
      ;(card as any).__result = result
    })

    // Yield collected results
    for (let i = 0; i < jobCards.length; i++) {
      const result = (jobCards[i] as any).__result as ScrapedOpportunity | undefined
      if (result) {
        yield result
        pageYielded++
      }
    }

    console.log(`[Impactpool] Page ${page}: ${jobCards.length} cards, yielded ${pageYielded}`)
    await sleep(3000)
  }
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  const parts = location.replace(/^Remote\s*\|?\s*/i, "").split("|").map(s => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts[0] : undefined
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
