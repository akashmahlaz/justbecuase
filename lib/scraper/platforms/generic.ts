// ============================================
// Generic URL Scraper — scrape any URL on demand
// ============================================
// Provides a flexible API for admins to scrape arbitrary URLs.
// Uses the text extractor for deep content extraction.
// Can be used for one-off imports or testing new platforms.

import type { ScrapedOpportunity, ScraperPlatform } from "../types"
import { fetchPage, extractPageContent, extractListings } from "../text-extractor"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

export interface GenericScrapeOptions {
  url: string
  mode: "single" | "listing"
  platform?: ScraperPlatform
  selectors?: {
    container?: string
    item?: string
    title?: string
    link?: string
    org?: string
    location?: string
    date?: string
  }
  deepScrape?: boolean
  maxDetailPages?: number
}

/**
 * Scrape a single page and extract one opportunity.
 */
export async function scrapeSingleUrl(
  url: string,
  platform: ScraperPlatform = "devex"
): Promise<ScrapedOpportunity> {
  const html = await fetchPage(url)
  const content = extractPageContent(html, new URL(url).origin)

  const allText = [content.title, content.description, content.location || "", ...content.tags].join(" ")

  return {
    sourceplatform: platform,
    sourceUrl: url,
    externalId: `generic_${hashUrl(url)}`,
    title: content.title || "Untitled Opportunity",
    description: content.description.slice(0, 10000),
    shortDescription: content.description.slice(0, 280),
    organization: content.organization || "Unknown Organization",
    organizationUrl: content.organizationUrl,
    causes: mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3)),
    skillsRequired: mapSkillTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3)),
    experienceLevel: detectExperienceLevel(allText),
    workMode: detectWorkMode(allText),
    location: content.location || undefined,
    country: extractCountry(content.location || ""),
    deadline: content.deadline ? tryParseDate(content.deadline) : undefined,
    postedDate: content.postedDate ? tryParseDate(content.postedDate) : new Date(),
    compensationType: detectCompensation(allText),
    salary: content.salary,
    projectType: detectProjectType(allText),
  }
}

/**
 * Scrape a listing page and extract multiple opportunities.
 * Optionally deep-scrapes each link for full content.
 */
export async function* scrapeListingUrl(
  options: GenericScrapeOptions
): AsyncGenerator<ScrapedOpportunity> {
  const { url, platform = "devex", selectors, deepScrape = false, maxDetailPages = 20 } = options
  const baseUrl = new URL(url).origin

  const html = await fetchPage(url)
  const listings = extractListings(html, baseUrl, selectors)

  let detailCount = 0

  for (const listing of listings) {
    let description = listing.snippet || ""
    let organization = listing.organization || ""
    let location = listing.location || ""
    let deadline: string | undefined
    let salary: string | undefined
    let tags = listing.tags

    // Deep scrape detail pages
    if (deepScrape && detailCount < maxDetailPages) {
      try {
        const detailHtml = await fetchPage(listing.url)
        const content = extractPageContent(detailHtml, baseUrl)
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

    const allText = [listing.title, description, location, ...tags].join(" ")

    yield {
      sourceplatform: platform,
      sourceUrl: listing.url,
      externalId: `generic_${hashUrl(listing.url)}`,
      title: listing.title,
      description: description.slice(0, 10000),
      shortDescription: description.slice(0, 280),
      organization: organization || "Unknown Organization",
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
      projectType: detectProjectType(allText),
    }
  }
}

function hashUrl(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(36)
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

function detectProjectType(text: string): "short-term" | "long-term" | "consultation" | "ongoing" {
  const lower = text.toLowerCase()
  if (/consultant|consultancy|advisory/.test(lower)) return "consultation"
  if (/short[- ]term|temporary|6 months|3 months/.test(lower)) return "short-term"
  if (/ongoing|continuous|permanent/.test(lower)) return "ongoing"
  return "long-term"
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
