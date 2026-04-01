// ============================================
// Idealist Scraper — Official Listings API Integration
// ============================================
// Uses the Idealist Listings API (v1) to fetch volunteer opportunities,
// jobs, and internships. Replaces the old HTML scraping approach.
//
// API Docs: https://api-sandbox.idealist.org/listings-api
// Auth: Basic HTTP (API key as username, empty password)
// Rate limit: Be polite — 300ms between requests, no parallel requests.

import type { ScrapedOpportunity } from "../types"
import { mapSkillTags, mapCauseTags, detectExperienceLevel } from "../skill-mapper"

const API_BASE = "https://www.idealist.org"
const API_KEY = process.env.IDEALIST_API_KEY || ""

const HEADERS = {
  Accept: "application/json",
  Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
}

// ============================================
// Types for Idealist API responses
// ============================================
interface IdealistListItem {
  id: string
  firstPublished: string
  updated: string
  name: string
  url: { en: string | null; es: string | null; pt: string | null }
  isPublished?: boolean
}

interface IdealistOrg {
  id: string | null
  name: string | null
  url?: { en: string | null; es: string | null; pt: string | null } | null
  logo?: string | null
  areasOfFocus?: string[] | null
  orgType?: string | null
  address?: IdealistAddress | null
}

interface IdealistAddress {
  full?: string
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  stateCode?: string | null
  zipcode?: string | null
  country?: string
  latitude?: number
  longitude?: number
  cityOnly?: boolean
}

interface IdealistJobDetail {
  id: string
  firstPublished: string
  updated: string
  name: string
  description: string
  expires: string
  org: IdealistOrg
  address: IdealistAddress
  applyEmail?: string | null
  applyUrl?: string | null
  applyText?: string | null
  applyOnIdealist?: boolean
  salaryMinimum?: string | null
  salaryMaximum?: string | null
  salaryCurrency?: string | null
  salaryPeriod?: string | null
  salaryDetails?: string | null
  professionalLevel?: string | null
  education?: string | null
  applicationDeadline?: string | null
  startDate?: string | null
  endDate?: string | null
  isFullTime?: boolean
  isTemporary?: boolean
  isContract?: boolean
  locationType?: string // REMOTE | ONSITE | HYBRID
  remoteZone?: string | null
  remoteCountry?: string | null
  functions?: string[]
  areasOfFocus?: string[]
  url: { en: string | null; es: string | null; pt: string | null }
}

interface IdealistVolopDetail {
  id: string
  firstPublished: string
  updated: string
  name: string
  description: string
  expires: string
  org: IdealistOrg
  address: IdealistAddress
  applyEmail?: string | null
  applyUrl?: string | null
  applyText?: string | null
  applyOnIdealist?: boolean
  locationType?: string
  remoteZone?: string | null
  remoteCountry?: string | null
  startDate?: string | null
  endDate?: string | null
  expectedTime?: string | null
  timesOfDay?: string[]
  numVolunteersNeeded?: number | null
  ageRequirement?: number | null
  otherRequirements?: string | null
  functions?: string[]
  areasOfFocus?: string[]
  image?: { original?: string; medium?: string; thumbnail?: string } | null
  url: { en: string | null; es: string | null; pt: string | null }
}

interface IdealistInternshipDetail {
  id: string
  firstPublished: string
  updated: string
  name: string
  description: string
  expires: string
  org: IdealistOrg
  address: IdealistAddress
  applyEmail?: string | null
  applyUrl?: string | null
  applyText?: string | null
  applyOnIdealist?: boolean
  paid?: boolean
  wage?: string | null
  locationType?: string
  remoteZone?: string | null
  remoteCountry?: string | null
  hoursPerWeek?: string | null
  applicationDeadline?: string | null
  startDate?: string | null
  endDate?: string | null
  functions?: string[]
  areasOfFocus?: string[]
  url: { en: string | null; es: string | null; pt: string | null }
}

// ============================================
// Listing types to fetch
// ============================================
type ListingType = "volops" | "jobs" | "internships"

const LISTING_CONFIGS: {
  type: ListingType
  listKey: string
  detailKey: string
  compensationType: "volunteer" | "paid" | "stipend"
  projectType: "short-term" | "long-term" | "consultation" | "ongoing"
}[] = [
  { type: "volops", listKey: "volops", detailKey: "volop", compensationType: "volunteer", projectType: "short-term" },
  { type: "jobs", listKey: "jobs", detailKey: "job", compensationType: "paid", projectType: "long-term" },
  { type: "internships", listKey: "internships", detailKey: "internship", compensationType: "stipend", projectType: "short-term" },
]

// ============================================
// Main scraper function
// ============================================
export async function* scrapeIdealist(
  settings: Record<string, string>
): AsyncGenerator<ScrapedOpportunity> {
  if (!API_KEY) {
    console.error("[Idealist API] No IDEALIST_API_KEY set in environment — skipping")
    return
  }

  const maxPages = parseInt(settings.maxPages || "200", 10)
  const maxDetailFetches = parseInt(settings.maxDetailPages || "500", 10)
  let totalDetailFetches = 0

  for (const config of LISTING_CONFIGS) {
    console.log(`[Idealist API] Fetching ${config.type}...`)

    // Use stored cursor for incremental sync if available
    const sinceKey = `lastSince_${config.type}`
    let since = settings[sinceKey] || ""
    let pageCount = 0
    let hasMore = true
    let itemCount = 0

    while (hasMore && pageCount < maxPages) {
      pageCount++
      const url = since
        ? `${API_BASE}/api/v1/listings/${config.type}?since=${encodeURIComponent(since)}`
        : `${API_BASE}/api/v1/listings/${config.type}`

      console.log(`[Idealist API] ${config.type} page ${pageCount}: ${url}`)

      let data: Record<string, unknown>
      try {
        const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) })

        if (response.status === 401) {
          console.error("[Idealist API] 401 Unauthorized — check API key")
          return
        }
        if (response.status === 403) {
          console.error("[Idealist API] 403 Forbidden — API key may not have access to production endpoint")
          return
        }
        if (!response.ok) {
          console.warn(`[Idealist API] HTTP ${response.status} for ${config.type} page ${pageCount}`)
          break
        }

        data = (await response.json()) as Record<string, unknown>
      } catch (err) {
        console.warn(`[Idealist API] Fetch failed for ${config.type} page ${pageCount}:`, err)
        break
      }

      const items = (data[config.listKey] as IdealistListItem[]) || []
      hasMore = (data.hasMore as boolean) ?? false

      if (items.length === 0) {
        console.log(`[Idealist API] No more ${config.type} items`)
        break
      }

      for (const item of items) {
        if (!item.isPublished && item.isPublished !== undefined) continue

        // Update since cursor
        since = item.updated

        // Fetch detail if under limit
        if (totalDetailFetches >= maxDetailFetches) {
          // Yield a basic listing without details
          yield makeBasicOpportunity(item, config.type, config.compensationType, config.projectType)
          itemCount++
          continue
        }

        await sleep(300) // Politeness

        const detail = await fetchDetail(config.type, config.detailKey, item.id)
        totalDetailFetches++

        if (!detail) {
          // Item may have been unpublished — skip
          continue
        }

        // Filter: REMOTE only
        const locationType = (detail as Record<string, unknown>).locationType as string | undefined
        if (locationType && locationType !== "REMOTE") continue

        const opp = mapDetailToOpportunity(detail, config.type, config.compensationType, config.projectType)
        if (opp) {
          yield opp
          itemCount++
        }
      }

      // Store the since cursor in settings for next run
      // (The runner passes settings by reference from config, but we'll rely on
      //  the cron/admin endpoint to persist this. Log it for now.)
      if (since) {
        settings[sinceKey] = since
        console.log(`[Idealist API] ${config.type} cursor updated: ${since}`)
      }

      await sleep(300) // Politeness between pages
    }

    console.log(`[Idealist API] ${config.type}: ${itemCount} remote items fetched across ${pageCount} pages`)
  }
}

// ============================================
// Fetch detail for a single listing
// ============================================
async function fetchDetail(
  type: ListingType,
  detailKey: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const url = `${API_BASE}/api/v1/listings/${type}/${id}`

  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) })

    if (response.status === 404) return null // Unpublished or expired
    if (!response.ok) {
      console.warn(`[Idealist API] HTTP ${response.status} fetching ${type}/${id}`)
      return null
    }

    const data = (await response.json()) as Record<string, unknown>
    return (data[detailKey] as Record<string, unknown>) || null
  } catch (err) {
    console.warn(`[Idealist API] Failed fetching detail ${type}/${id}:`, err)
    return null
  }
}

// ============================================
// Map API detail to ScrapedOpportunity
// ============================================
function mapDetailToOpportunity(
  detail: Record<string, unknown>,
  type: ListingType,
  compensationType: "volunteer" | "paid" | "stipend",
  projectType: string
): ScrapedOpportunity | null {
  const d = detail as unknown as (IdealistJobDetail & IdealistVolopDetail & IdealistInternshipDetail)

  if (!d.name) return null

  const sourceUrl = d.url?.en || `https://www.idealist.org/en/${type === "volops" ? "volunteer-opportunity" : type === "jobs" ? "nonprofit-job" : "nonprofit-internship"}/${d.id}`
  const description = stripHtml(d.description || "")
  const allText = [d.name, description, d.org?.name || ""].join(" ")

  // Build salary string for jobs
  let salary: string | undefined
  if (d.salaryMinimum || d.salaryMaximum) {
    const parts: string[] = []
    if (d.salaryMinimum) parts.push(d.salaryMinimum)
    if (d.salaryMaximum) parts.push(d.salaryMaximum)
    salary = parts.join(" - ")
    if (d.salaryCurrency) salary += ` ${d.salaryCurrency}`
    if (d.salaryPeriod) salary += `/${d.salaryPeriod.toLowerCase()}`
  }

  // Map expected time for volops
  const expectedTimeMap: Record<string, string> = {
    FEW_HOURS_MONTH: "A few hours/month",
    FEW_HOURS_WEEK: "A few hours/week",
    FULL_TIME: "Full time",
    FLEXIBLE: "Flexible",
    TRANSLATORS: "Translation work",
  }

  // Determine compensation for internships
  let finalCompensationType = compensationType
  if (type === "internships" && d.paid === true) finalCompensationType = "paid"
  if (type === "internships" && d.paid === false) finalCompensationType = "volunteer"

  // Map areas of focus to our cause format
  const areasOfFocus = d.areasOfFocus || d.org?.areasOfFocus || []
  const causes = areasOfFocus.length > 0
    ? areasOfFocus.map(a => a.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))
    : mapCauseTags(allText.split(/[\s,;:]+/).filter(w => w.length > 3))

  const skills = mapSkillTags(
    [...(d.functions || []), ...allText.split(/[\s,;:]+/)].filter(w => w.length > 3)
  )

  return {
    sourceplatform: "idealist",
    sourceUrl,
    externalId: `idealist_${d.id}`,
    title: d.name,
    description: d.description || d.name, // Keep HTML for bodyHtml
    shortDescription: description.slice(0, 280),
    organization: d.org?.name || "Organization on Idealist",
    organizationUrl: d.org?.url?.en || undefined,
    organizationLogo: d.org?.logo || undefined,
    causes,
    skillsRequired: skills,
    experienceLevel: detectExperienceLevel(allText),
    workMode: mapLocationType(d.locationType),
    location: d.address?.full || (d.locationType === "REMOTE" ? "Remote" : undefined),
    city: d.address?.city || undefined,
    country: d.address?.country || undefined,
    timeCommitment: d.expectedTime ? expectedTimeMap[d.expectedTime] || d.expectedTime : d.hoursPerWeek ? `${d.hoursPerWeek} hrs/week` : undefined,
    duration: d.startDate && d.endDate ? `${d.startDate} to ${d.endDate}` : undefined,
    projectType: projectType as ScrapedOpportunity["projectType"],
    deadline: d.applicationDeadline ? new Date(d.applicationDeadline) : d.expires ? new Date(d.expires) : undefined,
    postedDate: d.firstPublished ? new Date(d.firstPublished) : undefined,
    startDate: d.startDate ? new Date(d.startDate) : undefined,
    compensationType: finalCompensationType,
    salary,
    rawData: {
      locationType: d.locationType,
      remoteZone: d.remoteZone,
      remoteCountry: d.remoteCountry,
      functions: d.functions,
      areasOfFocus,
      applyUrl: d.applyUrl,
      applyEmail: d.applyEmail,
      applyOnIdealist: d.applyOnIdealist,
    },
  }
}

// ============================================
// Make a basic opportunity from list item (no detail fetch)
// ============================================
function makeBasicOpportunity(
  item: IdealistListItem,
  type: ListingType,
  compensationType: "volunteer" | "paid" | "stipend",
  projectType: string
): ScrapedOpportunity {
  const sourceUrl = item.url?.en || `https://www.idealist.org/en/${type === "volops" ? "volunteer-opportunity" : type === "jobs" ? "nonprofit-job" : "nonprofit-internship"}/${item.id}`

  return {
    sourceplatform: "idealist",
    sourceUrl,
    externalId: `idealist_${item.id}`,
    title: item.name || "Untitled Opportunity",
    description: item.name || "",
    organization: "Organization on Idealist",
    causes: [],
    skillsRequired: [],
    workMode: "remote",
    location: "Remote",
    compensationType,
    projectType: projectType as ScrapedOpportunity["projectType"],
    postedDate: item.firstPublished ? new Date(item.firstPublished) : undefined,
  }
}

// ============================================
// Helpers
// ============================================
function mapLocationType(locationType?: string): "remote" | "onsite" | "hybrid" {
  switch (locationType) {
    case "REMOTE": return "remote"
    case "ONSITE": return "onsite"
    case "HYBRID": return "hybrid"
    default: return "remote" // Default to remote for our use case
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
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
