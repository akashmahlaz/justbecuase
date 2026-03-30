// ============================================
// ReliefWeb API v2 Client
// ============================================
// Official API integration using approved appname.
// Docs: https://apidoc.reliefweb.int/
// POLICY: Only fetch REMOTE jobs that match our platform categories.

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
// Remote-detection keywords used at the API level
// ============================================
// Broad query sent to the API — returns ~80 results, then post-filtered locally.
const REMOTE_QUERY = [
  '"home-based"',
  '"home based"',
  '"telework"',
  '"work from home"',
  '"remote position"',
  '"remote work"',
  '"work remotely"',
  '"working remotely"',
  '"fully remote"',
  '"100% remote"',
  '"remote-based"',
  '"remotely based"',
  '"remote consultant"',
  '"remote consultancy"',
  '"this position is remote"',
  '"virtual position"',
].join(" OR ")

// Phrases that are FALSE POSITIVES — the word "remote" refers to physical remoteness, not work mode
const REMOTE_FALSE_POSITIVE_PATTERNS = [
  /\bremote\s+(area|region|village|communit|location|part|province|district|field|island)/i,
  /\b(hard[- ]to[- ]reach|difficult[- ]to[- ]access)\b.*\bremote\b/i,
]

// ============================================
// Category Mapping: ReliefWeb → JustBeCause platform
// ============================================
// Maps ReliefWeb career_categories.name → our skillCategories[].id
const CAREER_CATEGORY_TO_SKILL: Record<string, string> = {
  "Program/Project Management": "planning-support",
  "Administration/Finance": "finance",
  "Monitoring and Evaluation": "planning-support",
  "Donor Relations/Grants Management": "fundraising",
  "Logistics/Procurement": "planning-support",
  "Advocacy/Communications": "communication",
  "Human Resources": "planning-support",
  "Information Management": "data-technology",
  "Information and Communications Technology": "website",
}

// Maps ReliefWeb career_categories.name → specific subskill IDs on our platform
const CAREER_CATEGORY_TO_SUBSKILL: Record<string, string> = {
  "Program/Project Management": "project-management",
  "Administration/Finance": "financial-reporting",
  "Monitoring and Evaluation": "monitoring-evaluation",
  "Donor Relations/Grants Management": "grant-writing",
  "Logistics/Procurement": "logistics-management",
  "Advocacy/Communications": "donor-communications",
  "Human Resources": "hr-recruitment",
  "Information Management": "data-analysis",
  "Information and Communications Technology": "react-nextjs",
}

// Maps ReliefWeb theme.name → our causes[].id
const THEME_TO_CAUSE: Record<string, string> = {
  "Health": "healthcare",
  "Protection and Human Rights": "human-rights",
  "Food and Nutrition": "poverty-alleviation",
  "Climate Change and Environment": "environment",
  "Agriculture": "environment",
  "Water Sanitation Hygiene": "healthcare",
  "Education": "education",
  "Disaster Management": "disaster-relief",
  "Shelter and Non-Food Items": "disaster-relief",
  "Gender": "women-empowerment",
  "Recovery and Reconstruction": "disaster-relief",
  "Safety and Security": "human-rights",
  "Mine Action": "disaster-relief",
  "Peacekeeping and Peacebuilding": "human-rights",
  "Coordination": "poverty-alleviation",
  "Camp Coordination and Camp Management": "disaster-relief",
}

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
// Fetch REMOTE-ONLY published jobs from ReliefWeb API
// ============================================
// Uses keyword query to pre-filter at API level, then post-filters locally.
export async function fetchAllJobs(limit = 1000, offset = 0): Promise<{ jobs: RwApiItem[]; total: number }> {
  const payload = {
    preset: "latest",
    limit,
    offset,
    slim: "1",
    fields: { include: LIST_FIELDS },
    query: {
      value: REMOTE_QUERY,
      fields: ["title", "body"],
      operator: "OR",
    },
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

  // Post-filter: remove false positives where "remote" means geographical remoteness
  const filtered = data.data.filter((item) => isLikelyRemote(item.fields))

  return { jobs: filtered, total: filtered.length }
}

/**
 * Check if a job is genuinely remote vs. "remote areas" false positive.
 * Returns true if the job is likely a remote/home-based work position.
 */
function isLikelyRemote(f: RwJobFields): boolean {
  const title = (f.title || "").toLowerCase()
  const bodySnippet = (f.body || "").slice(0, 5000).toLowerCase()
  const text = `${title} ${bodySnippet}`

  // Strong positive signals in the TITLE → always accept
  if (/\b(remote|home[- ]based|telework|virtual)\b/i.test(f.title || "")) {
    return true
  }

  // Check for false-positive patterns in body
  for (const pattern of REMOTE_FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      // If the ONLY remote mention is a false-positive pattern, skip it
      // But if there are other clear remote indicators, keep it
      const hasStrongSignal = /\b(work\s+remotely|working\s+remotely|home[- ]based|telework|fully\s+remote|100%\s+remote)\b/i.test(text)
      if (!hasStrongSignal) return false
    }
  }

  return true
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

  // Map career_categories → platform causes (cause IDs) and skillsRequired
  const rwCategories = (f.career_categories || []).map((c) => c.name)
  const causes = mapCauses(rwCategories, f.theme || [])
  const { skillTags, skillsRequired } = mapSkills(rwCategories, f.theme || [])

  // Map type → projectType + compensationType
  const { projectType, compensationType } = mapJobType(type?.name)

  // Work mode — all jobs from this sync are pre-filtered as remote
  const workMode: "remote" | "onsite" | "hybrid" = "remote"

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
    skillsRequired,
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

/** Map ReliefWeb categories + themes → platform cause IDs */
function mapCauses(rwCategories: string[], rwThemes: { name: string }[]): string[] {
  const causeSet = new Set<string>()

  // Themes → causes (primary mapping)
  for (const theme of rwThemes) {
    const mapped = THEME_TO_CAUSE[theme.name]
    if (mapped) causeSet.add(mapped)
  }

  // If no themes, infer causes from career categories
  if (causeSet.size === 0) {
    for (const cat of rwCategories) {
      const skillCat = CAREER_CATEGORY_TO_SKILL[cat]
      // Some skill categories imply causes
      if (skillCat === "fundraising") causeSet.add("poverty-alleviation")
      if (skillCat === "communication") causeSet.add("human-rights")
    }
  }

  return Array.from(causeSet)
}

/** Map ReliefWeb categories + themes → platform skill tags and skillsRequired */
function mapSkills(rwCategories: string[], rwThemes: { name: string }[]): {
  skillTags: string[]
  skillsRequired: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[]
} {
  const skillTags: string[] = []
  const skillsRequired: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[] = []
  const seen = new Set<string>()

  // Map career categories → skill category + subskill
  for (const cat of rwCategories) {
    const categoryId = CAREER_CATEGORY_TO_SKILL[cat]
    const subskillId = CAREER_CATEGORY_TO_SUBSKILL[cat]
    if (categoryId && subskillId && !seen.has(subskillId)) {
      seen.add(subskillId)
      skillsRequired.push({ categoryId, subskillId, priority: "nice-to-have" })
      skillTags.push(cat) // Keep original name as tag for display
    }
  }

  // Add theme names as skill tags (for search + display)
  for (const theme of rwThemes) {
    if (!skillTags.includes(theme.name)) {
      skillTags.push(theme.name)
    }
  }

  return { skillTags, skillsRequired }
}

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
