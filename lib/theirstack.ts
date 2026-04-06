// ============================================
// TheirStack API Client
// ============================================
// API Docs: https://theirstack.com/en/docs/api-reference
// Auth: Bearer token (JWT)
// Credit costs: 1 per job returned, 3 per company returned
// Free tier: 200 API credits total

const API_BASE = "https://api.theirstack.com"

function getToken(): string {
  const token = process.env.THEIRSTACK_API_KEY
  if (!token) throw new Error("THEIRSTACK_API_KEY not set")
  return token
}

function headers() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  }
}

// ============================================
// Types
// ============================================

export interface TheirStackCompany {
  id: string
  name: string
  domain: string | null
  industry: string | null
  industry_id: number | null
  country: string | null
  country_code: string | null
  city: string | null
  employee_count: number | null
  employee_count_range: string | null
  logo: string | null
  linkedin_url: string | null
  long_description: string | null
  annual_revenue_usd: number | null
  annual_revenue_usd_readable: string | null
  total_funding_usd: number | null
  founded_year: number | null
  funding_stage: string | null
  num_jobs: number
  num_jobs_last_30_days: number
  num_jobs_found: number
  is_recruiting_agency: boolean
  has_blurred_data: boolean
  keyword_slugs: string[]
  technology_slugs: string[]
  technology_names: string[]
  jobs_found: TheirStackJob[]
}

export interface TheirStackJob {
  id: number
  job_title: string
  url: string | null
  final_url: string | null
  date_posted: string | null
  company: string
  company_domain: string | null
  location: string | null
  remote: boolean
  hybrid: boolean
  salary_string: string | null
  min_annual_salary_usd: number | null
  max_annual_salary_usd: number | null
  seniority: string | null
  employment_statuses: string[]
  description: string | null
  technology_slugs: string[]
  keyword_slugs: string[]
  hiring_team: Array<{
    full_name: string
    role: string | null
    linkedin_url: string | null
  }>
  company_object?: TheirStackCompany
  discovered_at: string | null
  has_blurred_data: boolean
}

export interface SearchMetadata {
  total_results: number | null
  total_companies: number | null
  truncated_results: number
  truncated_companies: number
}

export interface CreditBalance {
  ui_credits: number
  used_ui_credits: number
  api_credits: number
  used_api_credits: number
}

// ============================================
// Job Search
// ============================================

export interface JobSearchParams {
  page?: number
  limit?: number
  // Job filters
  job_title_or?: string[]
  job_title_not?: string[]
  job_title_pattern_or?: string[]
  job_description_contains_or?: string[]
  job_description_contains_not?: string[]
  job_description_pattern_or?: string[]
  job_country_code_or?: string[]
  job_country_code_not?: string[]
  job_location_pattern_or?: string[]
  remote?: boolean | null
  posted_at_max_age_days?: number
  posted_at_gte?: string
  employment_statuses_or?: string[]
  min_salary_usd?: number
  max_salary_usd?: number
  job_seniority_or?: string[]
  // Company filters
  company_description_pattern_or?: string[]
  company_description_pattern_not?: string[]
  company_name_partial_match_or?: string[]
  company_type?: "recruiting_agency" | "direct_employer" | "all"
  industry_id_or?: number[]
  min_employee_count?: number
  max_employee_count?: number
  company_country_code_or?: string[]
  company_tags_or?: string[]
  // Existence filters (ensures fields are populated)
  property_exists_or?: string[]
  property_exists_and?: string[]
  // Control
  include_total_results?: boolean
  blur_company_data?: boolean
}

export async function searchJobs(
  params: JobSearchParams
): Promise<{ data: TheirStackJob[]; metadata: SearchMetadata }> {
  const body: Record<string, unknown> = { ...params }
  // Defaults
  if (body.page === undefined) body.page = 0
  if (body.limit === undefined) body.limit = 25

  const res = await fetch(`${API_BASE}/v1/jobs/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      `TheirStack Job Search failed (${res.status}): ${JSON.stringify(err)}`
    )
  }

  return res.json()
}

// ============================================
// Company Search
// ============================================

export interface CompanySearchParams {
  page?: number
  limit?: number
  company_description_pattern_or?: string[]
  company_description_pattern_not?: string[]
  company_name_partial_match_or?: string[]
  company_domain_or?: string[]
  company_country_code_or?: string[]
  company_type?: "recruiting_agency" | "direct_employer" | "all"
  industry_id_or?: number[]
  industry_id_not?: number[]
  min_employee_count?: number
  max_employee_count?: number
  min_revenue_usd?: number
  max_revenue_usd?: number
  company_tags_or?: string[]
  include_total_results?: boolean
  blur_company_data?: boolean
  job_filters?: {
    job_title_or?: string[]
    remote?: boolean
    posted_at_max_age_days?: number
    employment_statuses_or?: string[]
  }
}

export async function searchCompanies(
  params: CompanySearchParams
): Promise<{ data: TheirStackCompany[]; metadata: SearchMetadata }> {
  const body: Record<string, unknown> = { ...params }
  if (body.page === undefined) body.page = 0
  if (body.limit === undefined) body.limit = 25

  const res = await fetch(`${API_BASE}/v1/companies/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      `TheirStack Company Search failed (${res.status}): ${JSON.stringify(err)}`
    )
  }

  return res.json()
}

// ============================================
// Credit Balance
// ============================================

export async function getCreditBalance(): Promise<CreditBalance> {
  const res = await fetch(`${API_BASE}/v0/billing/credit-balance`, {
    headers: headers(),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`TheirStack credit balance failed (${res.status})`)
  }

  return res.json()
}

// ============================================
// Credit cost estimator (client-side helper)
// ============================================

export function estimateCredits(type: "jobs" | "companies", limit: number): number {
  return type === "jobs" ? limit : limit * 3
}
