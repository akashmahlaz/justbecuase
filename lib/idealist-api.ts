// ============================================
// Idealist Listings API Client
// ============================================
// Official API integration using approved API key from Bradley.
// Docs: https://api-sandbox.idealist.org/listings-api
// Auth: Basic HTTP (API key as username, empty password)
// POLICY: Only fetch REMOTE jobs and map to platform categories.

import type { ExternalOpportunity } from "@/lib/scraper/types"

const API_BASE = "https://www.idealist.org"
const API_KEY = process.env.IDEALIST_API_KEY || ""

function getHeaders() {
  return {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
  }
}

// ============================================
// Idealist functions → JBC skill categories
// ============================================
// These are the "functions" values from Idealist's API.
// Reference: https://api-sandbox.idealist.org/listings-api (job detail → functions[])
const FUNCTION_TO_SKILL: Record<string, string> = {
  ACCOUNTING: "finance",
  ADMIN: "planning-support",
  ADVOCACY: "communication",
  BOARD_MEMBER: "planning-support",
  COMMUNICATIONS: "communication",
  COMMUNITY_OUTREACH: "digital-marketing",
  COMPUTERS_TECHNOLOGY: "data-technology",
  COUNSELING: "communication",
  CURRICULUM_DESIGN: "content-creation",
  DATA_MANAGEMENT: "data-technology",
  DEVELOPMENT_FUNDRAISING: "fundraising",
  EDUCATION: "planning-support",
  ENGINEERING: "data-technology",
  ENVIRONMENTAL: "planning-support",
  EVENTS: "planning-support",
  FINANCE: "finance",
  GENERAL: "planning-support",
  GRANT_WRITING: "fundraising",
  GRAPHIC_DESIGN: "content-creation",
  HEALTH: "planning-support",
  HR: "planning-support",
  IT: "data-technology",
  LEGAL: "legal",
  MANAGEMENT: "planning-support",
  MARKETING: "digital-marketing",
  MEDIA: "content-creation",
  OTHER: "planning-support",
  PR: "communication",
  PROGRAM: "planning-support",
  PROJECT_MGMT: "planning-support",
  RESEARCH: "planning-support",
  SOCIAL_MEDIA: "digital-marketing",
  SOCIAL_WORK: "planning-support",
  TRANSLATION: "communication",
  VOLUNTEER_MGMT: "planning-support",
  WRITING_EDITING: "communication",
}

const FUNCTION_TO_SUBSKILL: Record<string, string> = {
  ACCOUNTING: "bookkeeping",
  ADMIN: "data-entry",
  ADVOCACY: "press-release",
  BOARD_MEMBER: "project-management",
  COMMUNICATIONS: "donor-communications",
  COMMUNITY_OUTREACH: "community-management",
  COMPUTERS_TECHNOLOGY: "it-support",
  COUNSELING: "public-speaking",
  CURRICULUM_DESIGN: "presentation-design",
  DATA_MANAGEMENT: "data-analysis",
  DEVELOPMENT_FUNDRAISING: "grant-writing",
  EDUCATION: "training-facilitation",
  ENGINEERING: "it-support",
  ENVIRONMENTAL: "research-surveys",
  EVENTS: "event-planning",
  FINANCE: "financial-reporting",
  GENERAL: "data-entry",
  GRANT_WRITING: "grant-writing",
  GRAPHIC_DESIGN: "graphic-design",
  HEALTH: "research-surveys",
  HR: "hr-recruitment",
  IT: "it-support",
  LEGAL: "legal-advisory",
  MANAGEMENT: "project-management",
  MARKETING: "social-media-strategy",
  MEDIA: "video-editing",
  OTHER: "data-entry",
  PR: "press-release",
  PROGRAM: "project-management",
  PROJECT_MGMT: "project-management",
  RESEARCH: "research-surveys",
  SOCIAL_MEDIA: "social-media-strategy",
  SOCIAL_WORK: "volunteer-recruitment",
  TRANSLATION: "translation-localization",
  VOLUNTEER_MGMT: "volunteer-recruitment",
  WRITING_EDITING: "blog-article-writing",
}

// ============================================
// Idealist areasOfFocus → JBC causes
// ============================================
const AREA_TO_CAUSE: Record<string, string> = {
  ANIMALS: "animal-welfare",
  ARTS: "arts-culture",
  CHILDREN_YOUTH: "child-welfare",
  COMMUNITY_DEVELOPMENT: "poverty-alleviation",
  CRISIS_SUPPORT: "disaster-relief",
  DISABILITY: "disability-support",
  EDUCATION: "education",
  ELDERLY: "senior-citizens",
  ENVIRONMENT: "environment",
  HEALTH_MEDICINE: "healthcare",
  HOUSING_HOMELESS: "poverty-alleviation",
  HUMAN_RIGHTS: "human-rights",
  HUNGER: "poverty-alleviation",
  IMMIGRANTS_REFUGEES: "human-rights",
  LGBTQ: "human-rights",
  MEDIA: "arts-culture",
  MICROFINANCE: "poverty-alleviation",
  PHILANTHROPY: "poverty-alleviation",
  POVERTY: "poverty-alleviation",
  RACE_ETHNICITY: "human-rights",
  RELIGION: "arts-culture",
  SCIENCE_TECHNOLOGY: "education",
  SPORTS_RECREATION: "arts-culture",
  VETERANS: "human-rights",
  WOMEN: "women-empowerment",
}

// Word-level fallback for areasOfFocus values not in the enum map
const AREA_WORD_TO_CAUSE: Record<string, string> = {
  animals: "animal-welfare",
  arts: "arts-culture",
  children: "child-welfare",
  youth: "child-welfare",
  crisis: "disaster-relief",
  disaster: "disaster-relief",
  humanitarian: "disaster-relief",
  refugees: "disaster-relief",
  education: "education",
  environment: "environment",
  climate: "environment",
  conservation: "environment",
  health: "healthcare",
  healthcare: "healthcare",
  medical: "healthcare",
  human: "human-rights",
  rights: "human-rights",
  poverty: "poverty-alleviation",
  hunger: "poverty-alleviation",
  housing: "poverty-alleviation",
  homelessness: "poverty-alleviation",
  women: "women-empowerment",
  gender: "women-empowerment",
  disability: "disability-support",
  senior: "senior-citizens",
  elderly: "senior-citizens",
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
    orgType?: string | null
  }
  address: {
    full?: string
    city?: string | null
    country?: string
  }
  locationType?: string // REMOTE | ONSITE | HYBRID
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
  applyEmail?: string | null
  applyOnIdealist?: boolean
  url: { en: string | null; es: string | null; pt: string | null }
}

// ============================================
// Fetch all remote jobs via paginated list + detail calls
// ============================================
// Idealist has no server-side remote filter — we must fetch all then filter.
// Uses cursor-based pagination (since=<updated timestamp>).
export async function fetchAllRemoteJobs(maxDetails = 500): Promise<IdealistJobDetail[]> {
  if (!API_KEY) {
    throw new Error("IDEALIST_API_KEY not set in environment")
  }

  const remoteJobs: IdealistJobDetail[] = []
  let since = ""
  let hasMore = true
  let pageCount = 0
  let detailsFetched = 0
  const maxPages = 300

  while (hasMore && pageCount < maxPages && detailsFetched < maxDetails) {
    pageCount++
    const url = since
      ? `${API_BASE}/api/v1/listings/jobs?since=${encodeURIComponent(since)}`
      : `${API_BASE}/api/v1/listings/jobs`

    const response = await fetch(url, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(30000),
    })

    if (response.status === 401) {
      throw new Error("Idealist API 401 — check API key")
    }
    if (response.status === 403) {
      throw new Error("Idealist API 403 — API key may not have production access")
    }
    if (!response.ok) {
      console.warn(`[Idealist API] HTTP ${response.status} on page ${pageCount}`)
      break
    }

    const data = (await response.json()) as { jobs: IdealistListItem[]; hasMore: boolean }
    const items = data.jobs || []
    hasMore = data.hasMore ?? false

    if (items.length === 0) break

    for (const item of items) {
      since = item.updated // cursor update

      if (item.isPublished === false) continue
      if (detailsFetched >= maxDetails) continue

      // Fetch detail
      await sleep(300) // Politeness — required by Idealist
      const detail = await fetchJobDetail(item.id)
      detailsFetched++

      if (!detail) continue

      // REMOTE ONLY
      if (detail.locationType !== "REMOTE") continue

      remoteJobs.push(detail)
    }

    await sleep(300)
  }

  console.log(`[Idealist API] Fetched ${detailsFetched} details across ${pageCount} pages → ${remoteJobs.length} remote jobs`)
  return remoteJobs
}

// ============================================
// Fetch ALL published nonprofit jobs (all location types)
// ============================================
// Idealist is exclusively a nonprofit job board — every listing is NGO-relevant.
// This fetches all published listings regardless of location type for maximum coverage.
export async function fetchAllNonprofitJobs(maxDetails = 5000): Promise<IdealistJobDetail[]> {
  if (!API_KEY) {
    throw new Error("IDEALIST_API_KEY not set in environment")
  }

  const allJobs: IdealistJobDetail[] = []
  let since = ""
  let hasMore = true
  let pageCount = 0
  let detailsFetched = 0
  let detailsFailed = 0
  const maxPages = 500

  while (hasMore && pageCount < maxPages && detailsFetched < maxDetails) {
    pageCount++
    const url = since
      ? `${API_BASE}/api/v1/listings/jobs?since=${encodeURIComponent(since)}`
      : `${API_BASE}/api/v1/listings/jobs`

    const response = await fetch(url, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(30000),
    })

    if (response.status === 401) {
      throw new Error("Idealist API 401 — check API key")
    }
    if (response.status === 403) {
      throw new Error("Idealist API 403 — API key may not have production access")
    }
    if (!response.ok) {
      console.warn(`[Idealist API] HTTP ${response.status} on page ${pageCount}`)
      break
    }

    const data = (await response.json()) as { jobs: IdealistListItem[]; hasMore: boolean }
    const items = data.jobs || []
    hasMore = data.hasMore ?? false

    if (items.length === 0) break

    for (const item of items) {
      since = item.updated // cursor update

      if (item.isPublished === false) continue
      if (detailsFetched >= maxDetails) continue

      await sleep(200) // Politeness — required by Idealist
      const detail = await fetchJobDetail(item.id)
      detailsFetched++

      if (!detail) {
        detailsFailed++
        continue
      }

      allJobs.push(detail)
    }

    if (pageCount % 5 === 0) {
      console.log(`[Idealist API] Progress: page ${pageCount}, ${detailsFetched} fetched, ${detailsFailed} failed, ${allJobs.length} stored`)
    }

    await sleep(200)
  }

  console.log(`[Idealist API] Done: ${detailsFetched} details across ${pageCount} pages → ${allJobs.length} stored, ${detailsFailed} failed`)
  return allJobs
}

// ============================================
// Fetch a single job detail
// ============================================
async function fetchJobDetail(id: string): Promise<IdealistJobDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/listings/jobs/${id}`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(20000),
    })

    if (response.status === 404) return null
    if (!response.ok) {
      console.warn(`[Idealist API] Detail fetch ${id} failed: HTTP ${response.status}`)
      return null
    }

    const data = (await response.json()) as { job: IdealistJobDetail }
    return data.job || null
  } catch {
    return null
  }
}

// ============================================
// Map Idealist job → ExternalOpportunity document
// ============================================
export function mapJobToOpportunity(d: IdealistJobDetail): Omit<ExternalOpportunity, "_id"> {
  const plainDescription = stripHtml(d.description || "")
  const sourceUrl = d.url?.en || `https://www.idealist.org/en/nonprofit-job/${d.id}`

  // Map functions → skills
  const { skillTags, skillsRequired } = mapSkills(d.functions || [], `${d.name || ""} ${plainDescription}`)

  // Map areasOfFocus → causes
  const causes = mapCauses(d.areasOfFocus || d.org?.areasOfFocus || [])

  // Build salary string
  let salary: string | undefined
  if (d.salaryMinimum || d.salaryMaximum) {
    const parts: string[] = []
    if (d.salaryMinimum) parts.push(d.salaryMinimum)
    if (d.salaryMaximum) parts.push(d.salaryMaximum)
    salary = parts.join(" - ")
    if (d.salaryCurrency) salary += ` ${d.salaryCurrency}`
    if (d.salaryPeriod) salary += `/${d.salaryPeriod.toLowerCase()}`
  }

  // Experience level
  const experienceLevel = mapExperienceLevel(d.professionalLevel)

  // Duration
  const duration = d.startDate && d.endDate ? `${d.startDate} to ${d.endDate}` : undefined

  // Project type
  let projectType = "long-term"
  if (d.isContract) projectType = "consultation"
  if (d.isTemporary) projectType = "short-term"

  // Detect work mode from Idealist locationType field
  const workMode: "remote" | "onsite" | "hybrid" =
    d.locationType === "REMOTE" ? "remote" :
    d.locationType === "HYBRID" ? "hybrid" : "onsite"

  return {
    sourceplatform: "idealist-api",
    externalId: `idealist_${d.id}`,
    sourceUrl,
    title: d.name,
    description: plainDescription,
    shortDescription: plainDescription.slice(0, 280),
    bodyHtml: d.description || undefined,
    organization: d.org?.name || "Organization on Idealist",
    organizationUrl: d.org?.url?.en || undefined,
    organizationLogo: d.org?.logo || undefined,
    causes,
    skillTags,
    skillsRequired,
    experienceLevel,
    workMode,
    location: d.address?.full || (workMode === "remote" ? "Remote" : undefined),
    city: d.address?.city || undefined,
    country: d.address?.country || undefined,
    timeCommitment: d.isFullTime ? "Full time" : "Part time",
    duration,
    projectType,
    deadline: d.applicationDeadline
      ? new Date(d.applicationDeadline)
      : d.expires
        ? new Date(d.expires)
        : undefined,
    postedDate: d.firstPublished ? new Date(d.firstPublished) : undefined,
    compensationType: "paid",
    salary,
    isActive: true,
    scrapedAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// Helpers
// ============================================

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
  const skillTags: string[] = []
  const skillsRequired: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[] = []
  const seen = new Set<string>()

  for (const fn of functions) {
    const inferredWebsiteSubskill = (fn === "ENGINEERING" || fn === "IT") ? inferWebsiteSubskill(text) : null
    const categoryId = inferredWebsiteSubskill ? "website" : FUNCTION_TO_SKILL[fn]
    const subskillId = inferredWebsiteSubskill || FUNCTION_TO_SUBSKILL[fn]
    if (categoryId && subskillId && !seen.has(subskillId)) {
      seen.add(subskillId)
      skillsRequired.push({ categoryId, subskillId, priority: "nice-to-have" })
    }
    // Human-readable tag
    const tag = fn.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    if (!skillTags.includes(tag)) skillTags.push(tag)
  }

  return { skillTags, skillsRequired }
}

function mapCauses(areasOfFocus: string[]): string[] {
  const causeSet = new Set<string>()

  for (const area of areasOfFocus) {
    // Try direct enum match first
    const direct = AREA_TO_CAUSE[area]
    if (direct) {
      causeSet.add(direct)
      continue
    }

    // Fallback: split into words and match
    const words = area.replace(/_/g, " ").toLowerCase().split(/\s+/)
    for (const word of words) {
      const mapped = AREA_WORD_TO_CAUSE[word]
      if (mapped) causeSet.add(mapped)
    }
  }

  return Array.from(causeSet)
}

function mapExperienceLevel(professionalLevel?: string | null): string | undefined {
  if (!professionalLevel) return undefined
  const lvl = professionalLevel.toUpperCase()
  if (lvl.includes("ENTRY") || lvl.includes("INTERN") || lvl.includes("ASSOCIATE")) return "beginner"
  if (lvl.includes("MID") || lvl.includes("PROFESSIONAL")) return "intermediate"
  if (lvl.includes("SENIOR") || lvl.includes("MANAGER") || lvl.includes("DIRECTOR")) return "advanced"
  if (lvl.includes("EXECUTIVE") || lvl.includes("VP") || lvl.includes("C-SUITE")) return "expert"
  return undefined
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
  return new Promise((resolve) => setTimeout(resolve, ms))
}
