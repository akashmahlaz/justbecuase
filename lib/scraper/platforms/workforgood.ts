// ============================================
// WorkForGood Scraper — UK nonprofit jobs
// ============================================
// Scrapes from workforgood.co.uk — charity & nonprofit job board
// Uses text extractor for deep content extraction

import type { ScrapedOpportunity } from "../types"
import { fetchPage, extractListings, extractPageContent } from "../text-extractor"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const BASE_URL = "https://www.workforgood.co.uk"
const SEARCH_URL = `${BASE_URL}/jobs`

export async function* scrapeWorkForGood(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "3", 10)
  const deepScrape = settings.deepScrape !== "false"
  const maxDetailPages = parseInt(settings.maxDetailPages || "25", 10)
  let detailCount = 0

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? SEARCH_URL : `${SEARCH_URL}?page=${page}`

    let html: string
    try {
      html = await fetchPage(url)
    } catch (err) {
      console.error(`[WorkForGood] Page ${page} fetch failed:`, err)
      break
    }

    const listings = extractListings(html, BASE_URL)
    if (listings.length === 0) break

    for (const listing of listings) {
      let description = listing.snippet || ""
      let organization = listing.organization || ""
      let location = listing.location || ""
      let deadline: string | undefined
      let salary: string | undefined
      let tags = listing.tags

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
          await sleep(2000)
        } catch {
          // Use listing-level data
        }
      }

      const externalId = listing.url.split("/").filter(Boolean).pop() || listing.url
      const allText = [listing.title, description, location, ...tags].join(" ")

      yield {
        sourceplatform: "workforgood",
        sourceUrl: listing.url,
        externalId: `wfg_${externalId}`,
        title: listing.title,
        description: description.slice(0, 10000),
        shortDescription: description.slice(0, 280),
        organization: organization || "Organization on WorkForGood",
        causes: mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3)),
        skillsRequired: mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3)),
        experienceLevel: detectExperienceLevel(allText),
        workMode: detectWorkMode(allText),
        location: location || undefined,
        country: location ? "United Kingdom" : undefined,
        deadline: deadline ? tryParseDate(deadline) : undefined,
        postedDate: listing.postedDate ? tryParseDate(listing.postedDate) : new Date(),
        compensationType: detectCompensation(allText),
        salary,
        projectType: "long-term",
      }
    }

    await sleep(3000)
  }
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
