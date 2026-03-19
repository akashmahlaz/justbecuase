// ============================================
// Impactpool Scraper — Impact career platform
// ============================================
// Scrapes from impactpool.org — jobs in UN, NGOs, and international development
// Uses div.job containers with cheerio

import * as cheerio from "cheerio"
import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.impactpool.org"
const SEARCH_URL = `${BASE_URL}/jobs`

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; JustBeCauseBot/1.0; +https://justbecausenetwork.com)",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function* scrapeImpactpool(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "3", 10)

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? SEARCH_URL : `${SEARCH_URL}?page=${page}`

    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("[Impactpool] Rate limited, stopping")
        return
      }
      throw new Error(`Impactpool fetch error: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Impactpool uses div.job containers for each job card
    const jobCards = $("div.job")
    if (jobCards.length === 0) break

    const processedUrls = new Set<string>()

    for (let i = 0; i < jobCards.length; i++) {
      const $card = $(jobCards[i])

      // Job link inside the card - href like /jobs/{ID}
      const $link = $card.find('a[href*="/jobs/"]').first()
      const href = $link.attr("href")
      if (!href || processedUrls.has(href)) continue
      processedUrls.add(href)

      // Title is the link text
      const title = $link.text().trim()
      if (!title || title.length < 5) continue

      // Full card text contains: "Title + OrgName + Location + Level"
      const cardText = $card.text().trim()
      const textAfterTitle = cardText.replace(title, "").trim()

      // Parse the remaining text for org, location, etc.
      const lines = textAfterTitle.split(/\n/).map(s => s.trim()).filter(Boolean)
      const org = lines[0] || ""
      const location = lines.find(l => /remote|home based|office|city|country/i.test(l) || l.includes(",") || l.includes("|"))
        || lines[1] || ""

      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`
      const externalId = href.split("/").filter(Boolean).pop() || href

      const allText = [title, org, location, cardText].join(" ")
      const causes = mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))
      const skills = mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))

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
        postedDate: new Date(),
        compensationType: "paid",
        projectType: "long-term",
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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
