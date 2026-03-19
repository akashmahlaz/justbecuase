// ============================================
// Devex Scraper — Development careers & consulting
// ============================================
// Scrapes from devex.com/jobs — major development sector job board
// Uses HTML scraping with deep content extraction per listing

import type { ScrapedOpportunity } from "../types"
import { fetchPage, extractListings, extractPageContent } from "../text-extractor"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.devex.com"
const SEARCH_URL = `${BASE_URL}/jobs/search`

export async function* scrapeDevex(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "3", 10)
  const deepScrape = settings.deepScrape !== "false" // default true
  const maxDetailPages = parseInt(settings.maxDetailPages || "30", 10)
  let detailCount = 0

  for (let page = 1; page <= maxPages; page++) {
    const url = `${SEARCH_URL}?page=${page}`

    let html: string
    try {
      html = await fetchPage(url)
    } catch (err) {
      console.error(`[Devex] Page ${page} fetch failed:`, err)
      break
    }

    const listings = extractListings(html, BASE_URL)
    if (listings.length === 0) break

    for (const listing of listings) {
      // Skip non-job URLs
      if (!listing.url.includes("/jobs/") && !listing.url.includes("/career")) continue

      let description = listing.snippet || ""
      let organization = listing.organization || ""
      let location = listing.location || ""
      let deadline: string | undefined
      let salary: string | undefined
      let tags = listing.tags

      // Deep scrape: fetch the detail page for full content
      if (deepScrape && detailCount < maxDetailPages) {
        try {
          const detailHtml = await fetchPage(listing.url)
          const content = extractPageContent(detailHtml, BASE_URL)
          description = content.description || description
          organization = content.organization || organization
          location = content.location || location
          deadline = content.deadline
          salary = content.salary
          tags = [...tags, ...content.tags]
          detailCount++
          await sleep(2000) // Respectful delay between detail pages
        } catch {
          // Detail fetch failed, use listing data only
        }
      }

      const externalId = listing.url.split("/").pop() || listing.url
      const allText = [listing.title, description, location, ...tags].join(" ")

      yield {
        sourceplatform: "devex",
        sourceUrl: listing.url,
        externalId: `devex_${externalId}`,
        title: listing.title,
        description: description.slice(0, 10000),
        shortDescription: description.slice(0, 280),
        organization: organization || "Organization on Devex",
        causes: mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3)),
        skillsRequired: mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3)),
        experienceLevel: detectExperienceLevel(allText),
        workMode: detectWorkMode(allText),
        location: location || undefined,
        country: extractCountry(location),
        deadline: deadline ? tryParseDate(deadline) : undefined,
        postedDate: listing.postedDate ? tryParseDate(listing.postedDate) : new Date(),
        compensationType: detectCompensation(allText),
        salary,
        projectType: "long-term",
      }
    }

    await sleep(3000) // Respectful delay between search pages
  }
}

function extractCountry(location: string): string | undefined {
  if (!location) return undefined
  const parts = location.split(",").map(s => s.trim())
  return parts.length > 1 ? parts[parts.length - 1] : undefined
}

function tryParseDate(str: string): Date | undefined {
  const d = new Date(str)
  return isNaN(d.getTime()) ? undefined : d
}

function detectCompensation(text: string): "paid" | "volunteer" | "stipend" {
  const lower = text.toLowerCase()
  if (/volunteer|unpaid/.test(lower)) return "volunteer"
  if (/stipend|allowance/.test(lower)) return "stipend"
  return "paid"
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
