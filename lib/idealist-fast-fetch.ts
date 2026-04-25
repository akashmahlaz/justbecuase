// ============================================
// Fast Idealist fetcher — parallel detail fetching
// ============================================
// Fetches all Idealist listings first (fast, cursor pagination),
// then details in parallel batches with controlled concurrency.
// Result: 3000-5000 jobs with full details in ~5-8 minutes.

import type { ExternalOpportunity } from "@/lib/scraper/types"

const API_BASE = "https://www.idealist.org"
const API_KEY = process.env.IDEALIST_API_KEY || ""
const DEFAULT_MAX_PAGES = Number(process.env.IDEALIST_MAX_LISTING_PAGES || 800)
const DEFAULT_MAX_DETAILS = Number(process.env.IDEALIST_MAX_DETAIL_FETCH || 5000)
const DEFAULT_DETAIL_CONCURRENCY = Math.max(5, Math.min(50, Number(process.env.IDEALIST_DETAIL_CONCURRENCY || 40)))
const LIST_TIMEOUT_MS = Number(process.env.IDEALIST_LIST_TIMEOUT_MS || 60000)
const DETAIL_TIMEOUT_MS = Number(process.env.IDEALIST_DETAIL_TIMEOUT_MS || 30000)
const RETRIES = Number(process.env.IDEALIST_FETCH_RETRIES || 2)

function getHeaders() {
  return {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
  }
}

interface IdealistListItem {
  id: string
  firstPublished: string
  updated: string
  name: string
  url: { en: string | null }
  isPublished?: boolean
}

interface IdealistJobDetail {
  id: string
  firstPublished: string
  updated: string
  name: string
  description: string
  expires: string
  org: {
    id: string | null
    name: string | null
    url?: { en: string | null } | null
    logo?: string | null
    areasOfFocus?: string[] | null
  }
  address: { full?: string; city?: string | null; country?: string }
  locationType?: string
  remoteZone?: string | null
  remoteCountry?: string | null
  salaryMinimum?: string | null
  salaryMaximum?: string | null
  salaryCurrency?: string | null
  salaryPeriod?: string | null
  professionalLevel?: string | null
  applicationDeadline?: string | null
  startDate?: string | null
  endDate?: string | null
  isFullTime?: boolean
  isTemporary?: boolean
  isContract?: boolean
  functions?: string[]
  areasOfFocus?: string[]
  applyUrl?: string | null
  url: { en: string | null }
}

// ============================================
// Fetch ALL listings (IDs + basic info, fast)
// ============================================
export async function fetchAllIdealistListings(maxPages = DEFAULT_MAX_PAGES): Promise<IdealistListItem[]> {
  if (!API_KEY) throw new Error("IDEALIST_API_KEY not set")

  const listings: IdealistListItem[] = []
  let since = ""
  let hasMore = true
  let page = 0

  while (hasMore && page < maxPages) {
    page++
    const url = since
      ? `${API_BASE}/api/v1/listings/jobs?since=${encodeURIComponent(since)}`
      : `${API_BASE}/api/v1/listings/jobs`

    const res = await fetchWithRetry(url, { headers: getHeaders(), signal: AbortSignal.timeout(LIST_TIMEOUT_MS) }, RETRIES)

    if (!res.ok) {
      console.warn(`[Idealist List] HTTP ${res.status} at page ${page}`)
      break
    }

    const data = (await res.json()) as { jobs: IdealistListItem[]; hasMore: boolean }
    const items = data.jobs || []
    hasMore = data.hasMore ?? false

    if (items.length === 0) break

    for (const item of items) {
      if (item.isPublished === false) continue
      since = item.updated
      listings.push(item)
    }

    await sleep(150)
  }

  console.log(`[Idealist] Listed ${listings.length} jobs across ${page} pages`)
  return listings
}

// ============================================
// Fetch details for a batch of IDs in parallel
// ============================================
async function fetchDetailsBatch(
  ids: string[],
  concurrency = DEFAULT_DETAIL_CONCURRENCY
): Promise<(IdealistJobDetail | null)[]> {
  const results: (IdealistJobDetail | null)[] = []
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(id => fetchJobDetail(id)))
    results.push(...batchResults)
    if (i + concurrency < ids.length) await sleep(80)
  }
  return results
}

async function fetchJobDetail(id: string): Promise<IdealistJobDetail | null> {
  try {
    const res = await fetchWithRetry(
      `${API_BASE}/api/v1/listings/jobs/${id}`,
      { headers: getHeaders(), signal: AbortSignal.timeout(DETAIL_TIMEOUT_MS) },
      RETRIES
    )
    if (res.status === 404) return null
    if (!res.ok) return null
    const data = await res.json() as { job: IdealistJobDetail }
    return data.job || null
  } catch {
    return null
  }
}

// ============================================
// Map Idealist job → ExternalOpportunity
// ============================================
function mapJobToOpp(d: IdealistJobDetail | IdealistListItem, detail?: IdealistJobDetail): Omit<ExternalOpportunity, "_id"> {
  const isDetail = !!detail
  const name = isDetail ? detail.name : d.name
  const desc = isDetail ? stripHtml(detail.description || "") : d.name
  const org = isDetail ? detail.org?.name || "Organization on Idealist" : "Organization on Idealist"
  const locationType = isDetail ? detail.locationType : undefined
  const city = isDetail ? detail.address?.city : undefined
  const country = isDetail ? detail.address?.country : undefined
  const salary = isDetail && (detail.salaryMinimum || detail.salaryMaximum)
    ? `${detail.salaryMinimum || ""}${detail.salaryMaximum ? ` - ${detail.salaryMaximum}` : ""} ${detail.salaryCurrency || ""}`.trim()
    : undefined
  const functions = isDetail ? detail.functions || [] : []
  const areasOfFocus = isDetail ? (detail.areasOfFocus || detail.org?.areasOfFocus || []) : []
  const applicationDeadline = isDetail ? detail.applicationDeadline : undefined
  const startDate = isDetail ? detail.startDate : undefined
  const endDate = isDetail ? detail.endDate : undefined
  const professionalLevel = isDetail ? detail.professionalLevel : undefined

  const { skillTags, skillsRequired } = mapSkills(functions, `${name || ""} ${desc || ""}`)
  const causes = mapCauses(areasOfFocus)
  const workMode = mapLocationType(locationType)
  const experienceLevel = mapExperienceLevel(professionalLevel)

  return {
    sourceplatform: "idealist-api",
    externalId: `idealist_${d.id}`,
    sourceUrl: d.url?.en || `https://www.idealist.org/en/nonprofit-job/${d.id}`,
    title: name,
    description: desc,
    shortDescription: desc.slice(0, 280),
    organization: org,
    organizationUrl: isDetail ? detail?.org?.url?.en ?? undefined : undefined,
    organizationLogo: isDetail ? detail?.org?.logo ?? undefined : undefined,
    causes,
    skillTags,
    skillsRequired,
    experienceLevel,
    workMode,
    location: workMode === "remote" ? "Remote" : (isDetail ? detail.address?.full : undefined),
    city: city ?? undefined,
    country: country ?? undefined,
    timeCommitment: isDetail && detail.isFullTime ? "Full time" : undefined,
    duration: startDate && endDate ? `${startDate} to ${endDate}` : undefined,
    projectType: isDetail && detail.isContract ? "consultation" : isDetail && detail.isTemporary ? "short-term" : "long-term",
    deadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
    postedDate: new Date(d.firstPublished),
    compensationType: "paid",
    salary,
    isActive: true,
    scrapedAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// Main: fetch all listings, then details in parallel — REMOTE ONLY
// ============================================
export async function fetchAllIdealistJobs(
  maxDetails = DEFAULT_MAX_DETAILS,
  maxListingPages = DEFAULT_MAX_PAGES
): Promise<Omit<ExternalOpportunity, "_id">[]> {
  console.log("[Idealist] Phase 1: fetching all listing IDs...")
  const listings = await fetchAllIdealistListings(maxListingPages)
  console.log(`[Idealist] Got ${listings.length} listings`)

  // Sort by updated desc — fetch details for most recent first
  listings.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())

  const seenIds = new Set<string>()
  const detailsToFetch = listings.filter((listing) => {
    if (seenIds.has(listing.id)) return false
    seenIds.add(listing.id)
    return true
  }).slice(0, maxDetails)

  console.log(`[Idealist] Phase 2: fetching details for ${detailsToFetch.length} recent jobs (parallel, REMOTE only)...`)
  const startTime = Date.now()

  const detailResults = await fetchDetailsBatch(detailsToFetch.map(l => l.id))

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[Idealist] Details fetched in ${elapsed}s`)

  const opportunities: Omit<ExternalOpportunity, "_id">[] = []
  let remoteCount = 0

  // Only include jobs that are REMOTE
  for (let i = 0; i < detailsToFetch.length; i++) {
    const detail = detailResults[i]
    if (detail) {
      if (isRemoteIdealistJob(detail)) {
        opportunities.push(mapJobToOpp(detailsToFetch[i], detail))
        remoteCount++
      }
    }
  }

  console.log(`[Idealist] Total remote opportunities: ${remoteCount} (${detailsToFetch.length - (detailResults.filter(Boolean).length)} detail fetches failed)`)
  return opportunities
}

// ============================================
// Helpers
// ============================================
function mapLocationType(lt?: string): "remote" | "onsite" | "hybrid" {
  switch (lt) {
    case "REMOTE": return "remote"
    case "ONSITE": return "onsite"
    case "HYBRID": return "hybrid"
    default: return "remote"
  }
}

function isRemoteIdealistJob(detail: IdealistJobDetail): boolean {
  const locationType = detail.locationType?.toUpperCase()
  if (locationType === "REMOTE") return true
  if (locationType === "ONSITE" || locationType === "HYBRID") return false

  const text = [
    detail.name,
    detail.description,
    detail.address?.full,
    detail.remoteZone,
    detail.remoteCountry,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return /\b(remote|home[- ]based|home based|work from home|telecommut|telework|virtual)\b/i.test(text)
}

function mapExperienceLevel(pl?: string | null): string | undefined {
  if (!pl) return undefined
  const u = pl.toUpperCase()
  if (u.includes("ENTRY") || u.includes("INTERN") || u.includes("ASSOCIATE")) return "beginner"
  if (u.includes("MID") || u.includes("PROFESSIONAL")) return "intermediate"
  if (u.includes("SENIOR") || u.includes("MANAGER") || u.includes("DIRECTOR")) return "advanced"
  if (u.includes("EXECUTIVE") || u.includes("VP")) return "expert"
  return undefined
}

function inferWebsiteSubskill(text: string): string | null {
  const lower = text.toLowerCase()
  if (/\bwordpress\b/.test(lower)) return "wordpress-development"
  if (/\b(react|next\.?js)\b/.test(lower)) return "react-nextjs"
  if (/\bnode\.?js\b/.test(lower)) return "nodejs-backend"
  if (/\b(shopify|e-?commerce)\b/.test(lower)) return "shopify-ecommerce"
  if (/\bwebflow\b/.test(lower)) return "webflow-nocode"
  if (/\bmobile\s+app\b|\bapp\s+(developer|development)\b/.test(lower)) return "mobile-app-development"
  if (/\bux\b|\bui\b/.test(lower)) return "ux-ui"
  if (/\bhtml\b|\bcss\b/.test(lower)) return "html-css"
  if (/\b(web\s*(developer|development|application|app|platform|portal|site|design)|website|front\s*-?\s*end|back\s*-?\s*end|full\s*-?\s*stack)\b/.test(lower)) return "react-nextjs"
  return null
}

function mapSkills(functions: string[], text = ""): {
  skillTags: string[]
  skillsRequired: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[]
} {
  const FUNCTION_TO_SKILL: Record<string, string> = {
    ACCOUNTING: "finance", ADMIN: "planning-support", ADVOCACY: "communication",
    BOARD_MEMBER: "planning-support", COMMUNICATIONS: "communication",
    COMMUNITY_OUTREACH: "digital-marketing",
    COMPUTERS_TECHNOLOGY: "data-technology", COUNSELING: "communication",
    CURRICULUM_DESIGN: "content-creation", DATA_MANAGEMENT: "data-technology",
    DEVELOPMENT_FUNDRAISING: "fundraising", EDUCATION: "planning-support",
    ENGINEERING: "data-technology", ENVIRONMENTAL: "planning-support",
    EVENTS: "planning-support", FINANCE: "finance",
    GENERAL: "planning-support", GRANT_WRITING: "fundraising",
    GRAPHIC_DESIGN: "content-creation", HEALTH: "planning-support",
    HR: "planning-support", IT: "data-technology", LEGAL: "legal",
    MANAGEMENT: "planning-support", MARKETING: "digital-marketing",
    MEDIA: "content-creation", OTHER: "planning-support", PR: "communication",
    PROGRAM: "planning-support", PROJECT_MGMT: "planning-support",
    RESEARCH: "planning-support", SOCIAL_MEDIA: "digital-marketing",
    SOCIAL_WORK: "planning-support", TRANSLATION: "communication",
    VOLUNTEER_MGMT: "planning-support", WRITING_EDITING: "communication",
  }
  const FUNCTION_TO_SUBSKILL: Record<string, string> = {
    ACCOUNTING: "bookkeeping", ADMIN: "data-entry", ADVOCACY: "press-release",
    BOARD_MEMBER: "project-management", COMMUNICATIONS: "donor-communications",
    COMMUNITY_OUTREACH: "community-management",
    COMPUTERS_TECHNOLOGY: "it-support", COUNSELING: "public-speaking",
    CURRICULUM_DESIGN: "presentation-design", DATA_MANAGEMENT: "data-analysis",
    DEVELOPMENT_FUNDRAISING: "grant-writing", EDUCATION: "training-facilitation",
    ENGINEERING: "it-support", EVENTS: "event-planning", FINANCE: "financial-reporting",
    GENERAL: "data-entry", GRANT_WRITING: "grant-writing",
    GRAPHIC_DESIGN: "graphic-design", HEALTH: "research-surveys", HR: "hr-recruitment",
    IT: "it-support", LEGAL: "legal-advisory", MANAGEMENT: "project-management",
    MARKETING: "social-media-strategy", MEDIA: "video-editing", OTHER: "data-entry",
    PR: "press-release", PROGRAM: "project-management", PROJECT_MGMT: "project-management",
    RESEARCH: "research-surveys", SOCIAL_MEDIA: "social-media-strategy",
    SOCIAL_WORK: "volunteer-recruitment", TRANSLATION: "translation-localization",
    VOLUNTEER_MGMT: "volunteer-recruitment", WRITING_EDITING: "blog-article-writing",
  }
  const seen = new Set<string>()
  const skillsRequired: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[] = []
  const skillTags: string[] = []
  for (const fn of functions) {
    const inferredWebsiteSubskill = (fn === "ENGINEERING" || fn === "IT") ? inferWebsiteSubskill(text) : null
    const cat = inferredWebsiteSubskill ? "website" : FUNCTION_TO_SKILL[fn]
    const sub = inferredWebsiteSubskill || FUNCTION_TO_SUBSKILL[fn]
    if (cat && sub && !seen.has(sub)) {
      seen.add(sub)
      skillsRequired.push({ categoryId: cat, subskillId: sub, priority: "nice-to-have" })
    }
    const tag = fn.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    if (!skillTags.includes(tag)) skillTags.push(tag)
  }
  return { skillTags, skillsRequired }
}

function mapCauses(areas: string[]): string[] {
  const AREA_TO_CAUSE: Record<string, string> = {
    ANIMALS: "animal-welfare", ARTS: "arts-culture", CHILDREN_YOUTH: "child-welfare",
    COMMUNITY_DEVELOPMENT: "poverty-alleviation", CRISIS_SUPPORT: "disaster-relief",
    DISABILITY: "disability-support", EDUCATION: "education", ELDERLY: "senior-citizens",
    ENVIRONMENT: "environment", HEALTH_MEDICINE: "healthcare",
    HOUSING_HOMELESS: "poverty-alleviation", HUMAN_RIGHTS: "human-rights",
    HUNGER: "poverty-alleviation", IMMIGRANTS_REFUGEES: "human-rights",
    LGBTQ: "human-rights", MEDIA: "arts-culture", MICROFINANCE: "poverty-alleviation",
    PHILANTHROPY: "poverty-alleviation", POVERTY: "poverty-alleviation",
    RACE_ETHNICITY: "human-rights", RELIGION: "arts-culture",
    SCIENCE_TECHNOLOGY: "education", SPORTS_RECREATION: "arts-culture",
    VETERANS: "human-rights", WOMEN: "women-empowerment",
  }
  const causeSet = new Set<string>()
  for (const area of areas) {
    const mapped = AREA_TO_CAUSE[area]
    if (mapped) causeSet.add(mapped)
  }
  return Array.from(causeSet)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, init: RequestInit, retries: number): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init)
      if (response.ok || response.status === 404 || attempt === retries) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
      if (attempt === retries) throw error
    }

    await sleep(500 * (attempt + 1))
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
