import {
  getCreditBalance,
  searchJobs,
  type JobSearchParams,
  type TheirStackJob,
} from "@/lib/theirstack"
import { externalOpportunitiesDb } from "@/lib/scraper"
import type { ExternalOpportunity } from "@/lib/scraper/types"

const NGO_INDUSTRY_IDS = [70, 74, 78, 81, 84, 99, 101, 139, 141]

const NGO_PATTERNS = [
  "nonprofit organization",
  "non-profit organization",
  "nongovernmental",
  "non-governmental",
  "humanitarian aid",
  "humanitarian organization",
  "charitable organization",
  "international development",
  "social enterprise",
  "civil society organization",
]

const VOLUNTEER_DESC_KEYWORDS = [
  "volunteer",
  "volunteering",
  "volunteer management",
  "volunteer coordination",
  "volunteer program",
  "community outreach",
  "community engagement",
  "social impact",
  "humanitarian",
  "community development",
  "civil society",
]

const EXCLUDE_PATTERNS = [
  "research institute",
  "laboratory",
  "university",
  "college",
  "hospital",
  "government agency",
  "agency for science",
  "defense",
]

export interface TheirStackSyncOptions {
  preview?: boolean
  remoteOnly?: boolean
  onlyWithContacts?: boolean
  maxAgeDays?: number
  pageSize?: number
  maxPages?: number
  maxJobs?: number
}

export interface TheirStackSyncResult {
  jobs: TheirStackJob[]
  query: JobSearchParams
  stats: {
    preview: boolean
    pagesFetched: number
    fetched: number
    uniqueJobs: number
    inserted: number
    updated: number
    totalAvailable: number | null
    remainingCredits: number | null
    skippedReason?: string
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function resolveWorkMode(job: TheirStackJob): ExternalOpportunity["workMode"] {
  if (job.remote) return "remote"
  if (job.hybrid) return "hybrid"
  return "onsite"
}

export function buildTheirStackSyncQuery(options: TheirStackSyncOptions = {}): JobSearchParams {
  const {
    preview = false,
    remoteOnly = false,
    maxAgeDays = 30,
    pageSize = 25,
  } = options

  // Per Xoel (TheirStack co-founder, Apr 13 2026):
  // - Do NOT stack industry_id_or + company_description_pattern_or + job_description_contains_or
  //   — they AND together and return almost nothing.
  // - Use company_description_pattern_or alone (broadest NGO net).
  // - Removed property_exists_or: ["hiring_team"] — too restrictive, filters out most results.
  return {
    page: 0,
    limit: pageSize,
    posted_at_max_age_days: maxAgeDays,
    company_type: "direct_employer",
    company_description_pattern_or: NGO_PATTERNS,
    company_description_pattern_not: EXCLUDE_PATTERNS,
    include_total_results: true,
    blur_company_data: preview,
    ...(remoteOnly ? { remote: true } : {}),
  }
}

export function mapTheirStackToOpportunity(job: TheirStackJob): Omit<ExternalOpportunity, "_id"> {
  const salaryStr = job.salary_string ?? undefined
  const workMode = resolveWorkMode(job)
  const location = job.location ?? (workMode === "remote" ? "Remote" : undefined)

  const descriptionParts: string[] = []
  if (job.description) descriptionParts.push(stripMarkdown(job.description))
  if (salaryStr) descriptionParts.push(`Salary: ${salaryStr}`)
  if (job.technology_slugs?.length) {
    descriptionParts.push(`Technologies: ${job.technology_slugs.join(", ")}`)
  }
  const description = descriptionParts.join("\n\n") || job.job_title

  return {
    sourceplatform: "theirstack",
    externalId: String(job.id),
    sourceUrl: job.final_url || job.url || `https://theirstack.com/jobs/${job.id}`,
    title: job.job_title,
    description,
    shortDescription: description.slice(0, 300),
    organization: job.company,
    organizationUrl: job.company_domain ? `https://${job.company_domain}` : undefined,
    organizationLogo: undefined,
    causes: [],
    skillTags: job.technology_slugs?.slice(0, 10) ?? [],
    skillsRequired:
      job.technology_slugs?.slice(0, 5).map((tech) => ({
        categoryId: "data-technology",
        subskillId: tech,
        priority: "nice-to-have" as const,
      })) ?? [],
    experienceLevel: job.seniority ?? undefined,
    workMode,
    location,
    city: undefined,
    country: undefined,
    timeCommitment: job.employment_statuses?.includes("full-time")
      ? "40+ hours"
      : "25-40 hours",
    duration: undefined,
    projectType: "long-term",
    deadline: undefined,
    postedDate: job.date_posted ? new Date(job.date_posted) : new Date(),
    compensationType: "paid",
    salary: salaryStr,
    bodyHtml: undefined,
    howToApplyHtml: undefined,
    isActive: true,
    scrapedAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function runTheirStackSync(
  options: TheirStackSyncOptions = {}
): Promise<TheirStackSyncResult> {
  const {
    preview = false,
    pageSize = 25,
    maxPages = 20,
    maxJobs,
  } = options

  const query = buildTheirStackSyncQuery({ ...options, pageSize })
  let remainingCredits: number | null = null

  if (!preview) {
    const balance = await getCreditBalance()
    remainingCredits = Math.max(balance.api_credits - balance.used_api_credits, 0)
    if (remainingCredits <= 0) {
      return {
        jobs: [],
        query,
        stats: {
          preview,
          pagesFetched: 0,
          fetched: 0,
          uniqueJobs: 0,
          inserted: 0,
          updated: 0,
          totalAvailable: null,
          remainingCredits,
          skippedReason: "No TheirStack API credits remaining",
        },
      }
    }
  }

  const jobMap = new Map<number, TheirStackJob>()
  let fetched = 0
  let pagesFetched = 0
  let totalAvailable: number | null = null

  for (let page = 0; page < maxPages; page++) {
    const remainingJobBudget = maxJobs ? Math.max(maxJobs - jobMap.size, 0) : null
    if (remainingJobBudget === 0) break

    const perPageLimit = Math.min(
      pageSize,
      remainingJobBudget ?? pageSize,
      remainingCredits ?? pageSize
    )
    if (perPageLimit <= 0) break

    const result = await searchJobs({
      ...query,
      page,
      limit: perPageLimit,
      include_total_results: page === 0,
    })

    pagesFetched += 1
    const data = result.data ?? []
    fetched += data.length
    totalAvailable = totalAvailable ?? result.metadata?.total_results ?? null

    for (const job of data) {
      jobMap.set(job.id, job)
    }

    if (remainingCredits !== null) {
      remainingCredits = Math.max(remainingCredits - data.length, 0)
    }

    if (data.length < perPageLimit) break
  }

  const jobs = Array.from(jobMap.values())
  if (preview) {
    return {
      jobs,
      query,
      stats: {
        preview,
        pagesFetched,
        fetched,
        uniqueJobs: jobs.length,
        inserted: 0,
        updated: 0,
        totalAvailable,
        remainingCredits,
      },
    }
  }

  const opportunities = jobs.map(mapTheirStackToOpportunity)
  const { inserted, updated } = await externalOpportunitiesDb.bulkUpsert(opportunities)

  return {
    jobs,
    query,
    stats: {
      preview,
      pagesFetched,
      fetched,
      uniqueJobs: jobs.length,
      inserted,
      updated,
      totalAvailable,
      remainingCredits,
    },
  }
}