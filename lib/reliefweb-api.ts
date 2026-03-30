// ============================================
// ReliefWeb API v2 Client
// ============================================
// Official API integration using approved appname.
// Docs: https://apidoc.reliefweb.int/

import type { ExternalOpportunity } from "@/lib/scraper/types"

const API_BASE = "https://api.reliefweb.int/v2"
const APP_NAME = "JBCN1235UKsOWVihHUJtRzg5huGfMm"

// Fields we request for list (card) sync — keeps payload small
const LIST_FIELDS = [
  "title",
  "body",
  "body-html",
  "how_to_apply",
  "how_to_apply-html",
  "source.name",
  "source.shortname",
  "source.longname",
  "source.homepage",
  "source.type.name",
  "country.name",
  "country.iso3",
  "city.name",
  "experience.name",
  "career_categories.name",
  "theme.name",
  "type.name",
  "date.closing",
  "date.created",
  "date.changed",
  "url",
  "url_alias",
  "status",
]

// ============================================
// Types for raw API response
// ============================================
interface RwApiResponse {
  totalCount: number
  count: number
  data: RwApiItem[]
}

interface RwApiItem {
  id: string
  fields: RwJobFields
}

interface RwJobFields {
  title: string
  body?: string
  "body-html"?: string
  how_to_apply?: string
  "how_to_apply-html"?: string
  status?: string
  city?: { name: string }[]
  country?: { name: string; iso3: string }[]
  source?: {
    name: string
    shortname: string
    longname?: string
    homepage?: string
    type?: { name: string }
  }[]
  type?: { name: string }[]
  experience?: { name: string }[]
  career_categories?: { name: string }[]
  theme?: { name: string }[]
  date?: {
    closing?: string
    created?: string
    changed?: string
  }
  url?: string
  url_alias?: string
}

// ============================================
// Fetch all published jobs (up to 1000 per call)
// ============================================
export async function fetchAllJobs(limit = 1000, offset = 0): Promise<{ jobs: RwApiItem[]; total: number }> {
  const payload = {
    preset: "latest",
    limit,
    offset,
    slim: 1,
    fields: { include: LIST_FIELDS },
  }

  const res = await fetch(`${API_BASE}/jobs?appname=${APP_NAME}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    next: { revalidate: 0 }, // no cache during sync
  })

  if (!res.ok) {
    throw new Error(`ReliefWeb API error: ${res.status} ${res.statusText}`)
  }

  const data: RwApiResponse = await res.json()
  return { jobs: data.data, total: data.totalCount }
}

// ============================================
// Fetch single job by ReliefWeb ID (for on-demand detail)
// ============================================
export async function fetchJobById(rwId: string): Promise<RwApiItem | null> {
  const url = `${API_BASE}/jobs/${rwId}?appname=${APP_NAME}&slim=1&fields[include][]=${LIST_FIELDS.join("&fields[include][]=")}`

  const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1h
  if (!res.ok) return null

  const data = await res.json()
  return data.data?.[0] ?? null
}

// ============================================
// Map API job → ExternalOpportunity document
// ============================================
export function mapApiJobToOpportunity(item: RwApiItem): Omit<ExternalOpportunity, "_id"> {
  const f = item.fields
  const source = f.source?.[0]
  const country = f.country?.[0]
  const city = f.city?.[0]
  const experience = f.experience?.[0]
  const type = f.type?.[0]

  // Build location string
  const locationParts = [city?.name, country?.name].filter(Boolean)
  const location = locationParts.join(", ") || undefined

  // Map career_categories → causes
  const causes = (f.career_categories || []).map((c) => c.name)

  // Map themes → skillTags
  const skillTags = (f.theme || []).map((t) => t.name)

  // Map type → projectType + compensationType
  const { projectType, compensationType } = mapJobType(type?.name)

  // Work mode heuristic: if the job has no country or location mentions "remote", it's remote
  const workMode = detectWorkMode(f.title, f.body, location)

  // Short description from body (strip markdown)
  const plainBody = f.body || ""
  const shortDescription = plainBody
    .replace(/\*\*[^*]+\*\*/g, "") // strip bold markers
    .replace(/[#*_\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300)

  return {
    sourceplatform: "reliefweb-api",
    externalId: String(item.id),
    sourceUrl: f.url_alias || f.url || `https://reliefweb.int/job/${item.id}`,
    title: f.title,
    description: plainBody,
    shortDescription,
    organization: source?.shortname || source?.name || "ReliefWeb",
    organizationUrl: source?.homepage || undefined,
    organizationLogo: undefined,
    causes,
    skillTags,
    skillsRequired: causes.map((c) => ({
      categoryId: c,
      subskillId: c,
      priority: "nice-to-have" as const,
    })),
    experienceLevel: experience?.name,
    workMode,
    location,
    city: city?.name,
    country: country?.name,
    timeCommitment: undefined,
    duration: undefined,
    projectType,
    deadline: f.date?.closing ? new Date(f.date.closing) : undefined,
    postedDate: f.date?.created ? new Date(f.date.created) : undefined,
    compensationType,
    salary: undefined,
    bodyHtml: f["body-html"],
    howToApplyHtml: f["how_to_apply-html"],
    isActive: true,
    scrapedAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// Helpers
// ============================================
function mapJobType(typeName?: string): { projectType: string; compensationType: string } {
  switch (typeName) {
    case "Consultancy":
      return { projectType: "consultation", compensationType: "paid" }
    case "Internship":
      return { projectType: "short-term", compensationType: "stipend" }
    case "Volunteer Opportunity":
      return { projectType: "volunteer", compensationType: "volunteer" }
    case "Job":
    default:
      return { projectType: "long-term", compensationType: "paid" }
  }
}

function detectWorkMode(title?: string, body?: string, location?: string): "remote" | "onsite" | "hybrid" {
  const text = [title, body?.slice(0, 2000), location].filter(Boolean).join(" ").toLowerCase()
  if (/\bremote\b/.test(text) && /\bon[- ]?site\b|\bin[- ]?office\b/.test(text)) return "hybrid"
  if (/\bremote\b|\bwork from home\b|\btelework\b/.test(text)) return "remote"
  return "onsite"
}
