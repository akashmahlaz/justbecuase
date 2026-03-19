// ============================================
// ReliefWeb Scraper — Uses official REST API
// ============================================
// Docs: https://apidoc.reliefweb.int/
// Endpoint: https://api.reliefweb.int/v1/jobs
// Rate limit: 1000 calls/day, 1000 items/call
// No API key needed — just pass appname param

import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectWorkMode, detectExperienceLevel } from "../skill-mapper"

const API_BASE = "https://api.reliefweb.int/v1"
const APP_NAME = "justbecausenetwork"

interface ReliefWebJob {
  id: number
  fields: {
    title: string
    body?: string
    "body-html"?: string
    url: string
    url_alias?: string
    source?: { name: string; homepage?: string; shortname?: string }[]
    date?: { created: string; closing?: string }
    country?: { name: string; iso3?: string }[]
    city?: { name: string }[]
    theme?: { name: string }[]
    type?: { name: string }[]
    career_categories?: { name: string }[]
    experience?: { name: string }[]
    status?: string
  }
}

/**
 * Scrape ReliefWeb jobs via their public API.
 * Yields one ScrapedOpportunity at a time.
 */
export async function* scrapeReliefWeb(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  const maxPages = parseInt(settings.maxPages || "5", 10)
  const limit = 50 // Max per page recommended by ReliefWeb

  for (let page = 0; page < maxPages; page++) {
    const offset = page * limit

    const url = new URL(`${API_BASE}/jobs`)
    url.searchParams.set("appname", APP_NAME)
    url.searchParams.set("limit", String(limit))
    url.searchParams.set("offset", String(offset))
    url.searchParams.set("preset", "latest")
    url.searchParams.set(
      "fields[include][]",
      [
        "title", "body", "url", "url_alias", "source",
        "date", "country", "city", "theme", "type",
        "career_categories", "experience", "status",
      ].join(",")
    )
    // Only active jobs
    url.searchParams.set("filter[field]", "status")
    url.searchParams.set("filter[value]", "open")

    const response = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`ReliefWeb API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const jobs: ReliefWebJob[] = data.data || []

    if (jobs.length === 0) break

    for (const job of jobs) {
      const f = job.fields
      if (!f.title) continue

      const description = stripHtml(f["body-html"] || f.body || "")
      const countries = (f.country || []).map(c => c.name)
      const cities = (f.city || []).map(c => c.name)
      const themes = (f.theme || []).map(t => t.name)
      const categories = (f.career_categories || []).map(c => c.name)
      const source = f.source?.[0]

      // Map themes + categories to our skill/cause taxonomy
      const allTags = [...themes, ...categories]
      const skillsRequired = mapSkillTags(categories)
      const causes = mapCauseTags(themes)

      // Detect work mode from title/body
      const fullText = [f.title, description, ...countries, ...cities].join(" ")
      const workMode = detectWorkMode(fullText)

      yield {
        sourceplatform: "reliefweb",
        sourceUrl: f.url || f.url_alias || `https://reliefweb.int/job/${job.id}`,
        externalId: String(job.id),
        title: f.title,
        description: description.slice(0, 10000),
        shortDescription: description.slice(0, 280),
        organization: source?.name || "Unknown Organization",
        organizationUrl: source?.homepage || undefined,
        causes,
        skillsRequired,
        experienceLevel: mapExperience(f.experience),
        workMode,
        location: [...cities, ...countries].filter(Boolean).join(", ") || undefined,
        city: cities[0] || undefined,
        country: countries[0] || undefined,
        deadline: f.date?.closing ? new Date(f.date.closing) : undefined,
        postedDate: f.date?.created ? new Date(f.date.created) : undefined,
        compensationType: detectCompensationType(f.type),
        projectType: "short-term",
      }
    }

    // Respect rate limits — small delay between pages
    await sleep(500)
  }
}

function mapExperience(
  exp?: { name: string }[]
): "beginner" | "intermediate" | "advanced" | "expert" | undefined {
  if (!exp || exp.length === 0) return undefined
  const name = exp[0].name.toLowerCase()
  if (name.includes("0") || name.includes("entry") || name.includes("intern")) return "beginner"
  if (name.includes("5") || name.includes("mid")) return "intermediate"
  if (name.includes("10") || name.includes("senior")) return "advanced"
  if (name.includes("15") || name.includes("expert") || name.includes("director")) return "expert"
  return "intermediate"
}

function detectCompensationType(
  types?: { name: string }[]
): "volunteer" | "paid" | "stipend" | undefined {
  if (!types) return undefined
  const names = types.map(t => t.name.toLowerCase()).join(" ")
  if (names.includes("volunteer")) return "volunteer"
  if (names.includes("intern")) return "stipend"
  return "paid"
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
