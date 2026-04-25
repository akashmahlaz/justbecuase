import { NextRequest, NextResponse } from "next/server"
import { browseProjects } from "@/lib/actions"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { deriveLogoUrl } from "@/lib/logo-resolver"

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function splitParam(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

const SKILL_QUERY_ALIASES: Array<{ ids: string[]; patterns: RegExp[] }> = [
  {
    ids: [
      "website",
      "wordpress-development",
      "html-css",
      "website-security",
      "cms-maintenance",
      "website-redesign",
      "landing-page-optimization",
      "react-nextjs",
      "nodejs-backend",
      "shopify-ecommerce",
      "webflow-nocode",
      "mobile-app-development",
      "api-integration",
      "database-management",
      "devops-hosting",
      "python-scripting",
    ],
    patterns: [
      /\bweb\s*(dev|development|developer|programming)?\b/i,
      /\bwebsite\b/i,
      /\bapp\s*development\b/i,
      /\bfrontend\b/i,
      /\bfront\s*end\b/i,
      /\bbackend\b/i,
      /\bback\s*end\b/i,
      /\bwordpress\b/i,
      /\breact\b/i,
      /\bnext\.?js\b/i,
      /\bnode\.?js\b/i,
      /\bwebflow\b/i,
      /\bshopify\b/i,
      /\bapi\b/i,
      /\bdatabase\b/i,
      /\bdevops\b/i,
    ],
  },
  {
    ids: ["digital-marketing"],
    patterns: [/\bdigital\s*marketing\b/i, /\bseo\b/i, /\bgoogle\s*ads\b/i, /\bsocial\s*media\b/i],
  },
  {
    ids: ["fundraising"],
    patterns: [/\bfundraising\b/i, /\bgrant\s*(writing|research)?\b/i, /\bcrowdfunding\b/i, /\bdonor\b/i],
  },
  {
    ids: ["finance"],
    patterns: [/\bfinance\b/i, /\baccounting\b/i, /\bbookkeeping\b/i, /\bpayroll\b/i, /\btax\b/i],
  },
  {
    ids: ["content-creation"],
    patterns: [/\bcontent\b/i, /\bdesign\b/i, /\bgraphic\s*design\b/i, /\bvideo\b/i, /\bphotography\b/i, /\bbranding\b/i],
  },
  {
    ids: ["communication"],
    patterns: [/\bwriting\b/i, /\bcopywriting\b/i, /\bcommunications?\b/i, /\bnewsletter\b/i, /\btranslation\b/i],
  },
  {
    ids: ["planning-support"],
    patterns: [/\boperations?\b/i, /\bproject\s*management\b/i, /\bevent\s*planning\b/i, /\blogistics\b/i, /\bdata\s*entry\b/i],
  },
  {
    ids: ["legal"],
    patterns: [/\blegal\b/i, /\bcompliance\b/i, /\bcontract\b/i, /\bpolicy\b/i, /\btrademark\b/i],
  },
  {
    ids: ["data-technology"],
    patterns: [/\bdata\b/i, /\banalytics?\b/i, /\bmachine\s*learning\b/i, /\bai\b/i, /\bchatbot\b/i, /\bcybersecurity\b/i],
  },
]

const SKILL_FILTER_EXPANSIONS: Record<string, string[]> = {
  "digital-marketing": [
    "digital-marketing",
    "community-management",
    "email-marketing",
    "social-media-ads",
    "ppc-google-ads",
    "seo-content",
    "social-media-strategy",
    "whatsapp-marketing",
    "influencer-marketing",
    "analytics-reporting",
    "content-marketing",
    "crm-management",
  ],
  fundraising: [
    "fundraising",
    "grant-writing",
    "grant-research",
    "corporate-sponsorship",
    "major-gift-strategy",
    "peer-to-peer-campaigns",
    "fundraising-pitch-deck",
    "crowdfunding",
    "csr-partnerships",
    "donor-management",
  ],
  website: [
    "website",
    "wordpress-development",
    "ux-ui",
    "html-css",
    "website-security",
    "cms-maintenance",
    "website-redesign",
    "landing-page-optimization",
    "react-nextjs",
    "nodejs-backend",
    "shopify-ecommerce",
    "webflow-nocode",
    "mobile-app-development",
    "api-integration",
    "database-management",
    "devops-hosting",
    "python-scripting",
  ],
  finance: [
    "finance",
    "bookkeeping",
    "budgeting-forecasting",
    "payroll-processing",
    "financial-reporting",
    "accounting-software",
    "tax-compliance",
    "audit-support",
    "financial-modelling",
  ],
  "content-creation": [
    "content-creation",
    "photography",
    "videography",
    "video-editing",
    "photo-editing",
    "motion-graphics",
    "graphic-design",
    "social-media-content",
    "podcast-production",
    "illustration",
    "branding-identity",
    "ai-content-tools",
    "presentation-design",
  ],
  communication: [
    "communication",
    "donor-communications",
    "email-copywriting",
    "press-release",
    "impact-story-writing",
    "annual-report-writing",
    "blog-article-writing",
    "social-media-copywriting",
    "proposal-writing",
    "newsletter-creation",
    "translation-localization",
    "public-speaking",
  ],
  "planning-support": [
    "planning-support",
    "volunteer-recruitment",
    "event-planning",
    "event-onground-support",
    "telecalling",
    "customer-support",
    "logistics-management",
    "project-management",
    "data-entry",
    "research-surveys",
    "monitoring-evaluation",
    "hr-recruitment",
    "training-facilitation",
  ],
  legal: [
    "legal",
    "legal-advisory",
    "ngo-registration",
    "fcra-compliance",
    "contract-drafting",
    "policy-drafting",
    "ip-trademark",
    "rti-advocacy",
  ],
  "data-technology": [
    "data-technology",
    "data-analysis",
    "data-visualization",
    "ai-ml",
    "chatbot-development",
    "it-support",
    "cybersecurity",
    "google-workspace",
    "automation-zapier",
  ],
}

function expandSkillIds(skills: string[]): string[] {
  const expanded = new Set<string>()
  for (const skill of skills) {
    const ids = SKILL_FILTER_EXPANSIONS[skill] || [skill]
    ids.forEach((id) => expanded.add(id))
  }
  return [...expanded]
}

function skillIdsFromQuery(query: string): string[] {
  if (!query.trim()) return []
  const ids = new Set<string>()
  for (const alias of SKILL_QUERY_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(query))) {
      alias.ids.forEach((id) => ids.add(id))
    }
  }
  return expandSkillIds([...ids])
}

function parseRange(value: string): [number, number] | null {
  const plus = value.match(/(\d+)\s*\+/)
  if (plus) return [Number.parseInt(plus[1], 10), Number.POSITIVE_INFINITY]

  const range = value.match(/(\d+)\s*-\s*(\d+)/)
  if (range) return [Number.parseInt(range[1], 10), Number.parseInt(range[2], 10)]

  return null
}

function rangesOverlap(left: [number, number], right: [number, number]) {
  return left[0] <= right[1] && right[0] <= left[1]
}

function normalizeExperienceLevel(value: string | undefined): string {
  const level = (value || "").toLowerCase().replace(/[\s-]+/g, "_")
  if (!level) return ""

  if (/(5_9|5_to_9|6\+|10\+|10_plus|10_to)/.test(level)) return "expert"
  if (/(^|_)0(_|\+|to_)|0_2|0_to_2|0_1/.test(level)) return "beginner"
  if (/(1_3|1_to_3|2_3)/.test(level)) return "intermediate"
  if (/(3_4|3_to_4|3_6|4_6)/.test(level)) return "advanced"

  if (/(beginner|entry|entry_level|intern|internship|junior)/.test(level)) return "beginner"
  if (/(intermediate|mid|mid_level|associate)/.test(level)) return "intermediate"
  if (/(advanced|senior|sr|lead|manager)/.test(level)) return "advanced"
  if (/(expert|staff|principal|director|executive|vp|chief|head)/.test(level)) return "expert"

  return level
}

function experienceAliases(level: string): RegExp[] {
  switch (level) {
    case "beginner":
      return [/beginner/i, /entry/i, /intern/i, /junior/i, /0[_\s-]?2/i, /0\s*to\s*2/i]
    case "intermediate":
      return [/intermediate/i, /mid/i, /associate/i, /1[_\s-]?3/i, /1\s*to\s*3/i, /2[_\s-]?3/i]
    case "advanced":
      return [/advanced/i, /senior/i, /sr/i, /lead/i, /manager/i, /3[_\s-]?4/i, /3\s*to\s*4/i, /3[_\s-]?6/i, /4[_\s-]?6/i]
    case "expert":
      return [/expert/i, /staff/i, /principal/i, /director/i, /executive/i, /vp/i, /chief/i, /head/i, /5[_\s-]?9/i, /5\s*to\s*9/i, /6\+/i, /10\+/i, /10_plus/i]
    default:
      return [new RegExp(escapeRegex(level), "i")]
  }
}

function matchesTimeCommitment(projectTime: string | undefined, filters: string[]) {
  if (filters.length === 0) return true
  const time = projectTime || ""
  const projectRange = parseRange(time)

  return filters.some((filter) => {
    const filterRange = parseRange(filter)
    if (!projectRange) {
      if (filterRange) {
        const numbers = time.match(/\d+/g)?.map((value) => Number.parseInt(value, 10)) || []
        if (numbers.some((value) => value >= filterRange[0] && value <= filterRange[1])) return true
      }
      return time.toLowerCase().includes(filter.toLowerCase())
    }
    return filterRange ? rangesOverlap(projectRange, filterRange) : false
  })
}

function projectSearchText(project: any) {
  const skills = (project.skillsRequired || [])
    .map((skill: any) => `${skill.categoryId || ""} ${skill.subskillId || skill.skillId || ""}`)
    .join(" ")

  return [
    project.title,
    project.description,
    project.ngo?.name,
    project.location,
    project.workMode,
    project.projectType,
    project.compensationType,
    project.experienceLevel,
    skills,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function matchesNativeProject(project: any, filters: {
  query: string
  skills: string[]
  querySkills: string[]
  timeCommitments: string[]
  workMode: string
  compensation: string[]
  experience: string[]
}) {
  const projectSkills = (project.skillsRequired || []).flatMap((skill: any) => [
    skill.categoryId,
    skill.subskillId,
    skill.skillId,
  ].filter(Boolean))

  if (filters.query) {
    if (filters.querySkills.length > 0) {
      if (!filters.querySkills.some((skill) => projectSkills.includes(skill))) return false
    } else {
      const terms = filters.query.toLowerCase().split(/\s+/).filter((term) => term.length >= 2)
      const text = projectSearchText(project)
      if (terms.length > 0 && !terms.every((term) => text.includes(term))) return false
    }
  }

  const selectedSkills = expandSkillIds(filters.skills)
  if (selectedSkills.length > 0) {
    if (!selectedSkills.some((skill) => projectSkills.includes(skill))) return false
  }

  if (!matchesTimeCommitment(project.timeCommitment, filters.timeCommitments)) return false

  if (filters.workMode) {
    const workMode = (project.workMode || "").toLowerCase().replace("-", "")
    const selected = filters.workMode.toLowerCase().replace("-", "")
    if (workMode !== selected) return false
  }

  if (filters.compensation.length > 0) {
    const compensation = `${project.compensationType || ""} ${project.projectType || ""}`.toLowerCase()
    if (!filters.compensation.some((item) => compensation.includes(item.toLowerCase()))) return false
  }

  if (filters.experience.length > 0) {
    const experience = (project.experienceLevel || "").toLowerCase()
    if (!filters.experience.some((item) => normalizeExperienceLevel(experience) === item.toLowerCase())) return false
  }

  return true
}

function buildExternalFilter(filters: {
  query: string
  skills: string[]
  querySkills: string[]
  timeCommitments: string[]
  workMode: string
  compensation: string[]
  experience: string[]
}) {
  const filter: Record<string, unknown> = {}

  if (filters.query && filters.querySkills.length === 0) {
    const regex = new RegExp(escapeRegex(filters.query), "i")
    filter.$or = [
      { title: regex },
      { description: regex },
      { shortDescription: regex },
      { organization: regex },
      { skillTags: regex },
      { location: regex },
      { city: regex },
      { country: regex },
    ]
  }

  const skillFilters = expandSkillIds([...new Set([...filters.querySkills, ...filters.skills])])
  if (skillFilters.length > 0) {
    filter.$and = [
      ...((filter.$and as any[]) || []),
      {
        $or: [
          { "skillsRequired.categoryId": { $in: skillFilters } },
          { "skillsRequired.subskillId": { $in: skillFilters } },
          { skillTags: { $in: skillFilters.map((skill) => new RegExp(escapeRegex(skill), "i")) } },
        ],
      },
    ]
  }

  if (filters.timeCommitments.length > 0) {
    filter.$and = [
      ...((filter.$and as any[]) || []),
      {
        $or: filters.timeCommitments.flatMap((time) => {
          const range = parseRange(time)
          const patterns = [new RegExp(escapeRegex(time), "i")]
          if (range) {
            const first = Number.isFinite(range[0]) ? String(range[0]) : ""
            const second = Number.isFinite(range[1]) ? String(range[1]) : ""
            if (first) patterns.push(new RegExp(`\\b${escapeRegex(first)}\\b`, "i"))
            if (second) patterns.push(new RegExp(`\\b${escapeRegex(second)}\\b`, "i"))
          }

          return patterns.map((pattern) => ({ timeCommitment: pattern }))
        }),
      },
    ]
  }

  if (filters.workMode) {
    const selected = filters.workMode.toLowerCase().replace("on-site", "onsite")
    filter.workMode = selected
  }

  if (filters.compensation.length > 0) {
    filter.compensationType = { $in: filters.compensation }
  }

  if (filters.experience.length > 0) {
    filter.experienceLevel = { $in: filters.experience.flatMap(experienceAliases) }
  }

  return filter
}

function sortProjects(projects: any[], sort: string) {
  const sorted = [...projects]
  switch (sort) {
    case "popular":
      return sorted.sort((a, b) => (b.applicantsCount || 0) - (a.applicantsCount || 0))
    case "closing":
      return sorted.sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
    case "newest":
    case "bestMatch":
    default:
      return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }
}

// ============================================
// GET /api/projects — Merged native + scraped, paginated
// ============================================
// ?page=1&limit=24  — pagination
// ?q=search         — text search across native + external opportunities
// ?type=all|native|external — filter source type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10))
    const sourceType = searchParams.get("type") || "all"
    const filters = {
      query: searchParams.get("q")?.trim() || "",
      skills: splitParam(searchParams.get("skills")),
      querySkills: skillIdsFromQuery(searchParams.get("q")?.trim() || ""),
      timeCommitments: splitParam(searchParams.get("timeCommitment")),
      workMode: searchParams.get("workMode")?.trim() || "",
      compensation: splitParam(searchParams.get("compensation")),
      experience: splitParam(searchParams.get("experience")),
    }
    const sort = searchParams.get("sort") || "newest"

    // ---- Native projects ----
    let nativeProjects: any[] = []
    let nativeTotal = 0
    if (sourceType === "all" || sourceType === "native") {
      const all = await browseProjects()
      nativeProjects = all
        .filter((project: any) => matchesNativeProject(project, filters))
        .map((p: any) => ({
          ...p,
          _source: "native" as const,
        }))
      nativeTotal = nativeProjects.length
    }

    // ---- External/scraped projects ----
    let externalProjects: any[] = []
    let externalTotal = 0
    if (sourceType === "all" || sourceType === "external") {
      const filter = buildExternalFilter(filters)

      // For merged view, fetch a window of external opps.
      // We need to know the total to compute pagination.
      externalTotal = await externalOpportunitiesDb.count(filter as any)

      // Determine how many external items to fetch for this page.
      // Strategy: native projects fill the first N items, then external fills the rest.
      // We interleave: for every page, we mix native and external proportionally.
      // Simple approach: merge all native at the front, then paginate the combined list.
      // But with 100K+ external, we can't load all. So:
      //   - Page 1-N: native items come first, then external fills remaining slots
      //   - After native is exhausted, all slots are external
      const totalCombined = nativeTotal + externalTotal
      const startIdx = (page - 1) * limit

      if (startIdx < nativeTotal) {
        // This page has some native items
        const nativeSlice = nativeProjects.slice(startIdx, startIdx + limit)
        const remainingSlots = limit - nativeSlice.length
        let extSlice: any[] = []
        if (remainingSlots > 0) {
          const rawExt = await externalOpportunitiesDb.findAll(filter as any, Math.max(remainingSlots * 4, remainingSlots), 0)
          extSlice = rawExt.map(mapExternalToProject).slice(0, remainingSlots)
        }
        const projects = sortProjects([...nativeSlice, ...extSlice], sort)
        return NextResponse.json({
          projects,
          pagination: { page, limit, total: totalCombined, totalPages: Math.ceil(totalCombined / limit) },
          counts: { native: nativeTotal, external: externalTotal },
        })
      } else {
        // Past native — all external
        const extSkip = startIdx - nativeTotal
        const rawExt = await externalOpportunitiesDb.findAll(filter as any, Math.max(limit * 4, limit), extSkip)
        const projects = sortProjects(rawExt.map(mapExternalToProject).slice(0, limit), sort)
        return NextResponse.json({
          projects,
          pagination: { page, limit, total: totalCombined, totalPages: Math.ceil(totalCombined / limit) },
          counts: { native: nativeTotal, external: externalTotal },
        })
      }
    }

    // Native-only path
    const startIdx = (page - 1) * limit
    const projects = sortProjects(nativeProjects, sort).slice(startIdx, startIdx + limit)
    return NextResponse.json({
      projects,
      pagination: { page, limit, total: nativeTotal, totalPages: Math.ceil(nativeTotal / limit) },
      counts: { native: nativeTotal, external: 0 },
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ projects: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 0 } }, { status: 500 })
  }
}

/** Map an external opportunity doc to the same shape as a native project */
function mapExternalToProject(opp: any) {
  // Use the best available description
  const desc = opp.shortDescription && opp.shortDescription !== opp.title
    ? opp.shortDescription
    : opp.description && opp.description !== opp.title
      ? opp.description.slice(0, 500)
      : opp.title

  // Format deadline for display
  const deadline = opp.deadline ? (() => {
    const d = new Date(opp.deadline)
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
  })() : null

  return {
    _id: opp._id?.toString?.() || opp._id,
    id: `ext-${opp._id?.toString?.() || opp._id}`,
    title: opp.title,
    description: desc,
    skillsRequired: opp.skillsRequired || [],
    ngoId: "",
    status: "active",
    workMode: opp.workMode || "remote",
    location: opp.location || opp.country || "Remote",
    timeCommitment: opp.timeCommitment || opp.duration || "",
    duration: opp.duration || "",
    deadline,
    projectType: opp.compensationType || opp.projectType || "volunteer",
    compensationType: opp.compensationType || "",
    salary: opp.salary || "",
    experienceLevel: normalizeExperienceLevel(opp.experienceLevel),
    applicantsCount: 0,
    createdAt: opp.postedDate || opp.scrapedAt || new Date(),
    ngo: {
      name: opp.organization || "",
      logo: deriveLogoUrl(opp),
      verified: false,
    },
    skills: (opp.skillTags && opp.skillTags.length > 0) ? opp.skillTags : (opp.skillsRequired || []).map((s: any) => s.subskillId || s.categoryId).filter(Boolean),
    externalUrl: opp.sourceUrl,
    _source: "external" as const,
    _platform: opp.sourceplatform || "",
  }
}
