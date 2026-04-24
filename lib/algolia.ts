import { algoliasearch } from "algoliasearch"
import type { SupportedLanguage } from "algoliasearch"
import { skillCategories, causes as causesList } from "@/lib/skills-data"

// ============================================
// ALGOLIA CLIENT — Server & Client instances
// ============================================

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || ""
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || ""
const WRITE_KEY = process.env.ALGOLIA_WRITE_KEY || ""

// Server-side client (has write access — NEVER expose to client)
let _adminClient: ReturnType<typeof algoliasearch> | null = null
export function getAlgoliaAdminClient() {
  if (!APP_ID || !WRITE_KEY) {
    throw new Error("Algolia admin credentials not configured")
  }
  if (!_adminClient) _adminClient = algoliasearch(APP_ID, WRITE_KEY)
  return _adminClient
}

// Search-only client (safe for client-side)
let _searchClient: ReturnType<typeof algoliasearch> | null = null
export function getAlgoliaSearchClient() {
  if (!APP_ID || !SEARCH_KEY) {
    throw new Error("Algolia search credentials not configured")
  }
  if (!_searchClient) _searchClient = algoliasearch(APP_ID, SEARCH_KEY)
  return _searchClient
}

// ============================================
// INDEX NAMES
// ============================================

export const ALGOLIA_INDEXES = {
  VOLUNTEERS: "jbc_volunteers",
  NGOS: "jbc_ngos",
  OPPORTUNITIES: "jbc_opportunities",
} as const

// Combined "all" virtual index for multi-index searches
export const ALL_INDEX_NAMES = Object.values(ALGOLIA_INDEXES)

// ============================================
// SKILL / CAUSE LOOKUP HELPERS
// ============================================

const SKILL_NAME_MAP = new Map<string, { name: string; category: string }>()
for (const cat of skillCategories) {
  for (const sub of cat.subskills) {
    SKILL_NAME_MAP.set(sub.id, { name: sub.name, category: cat.name })
  }
}

const CAUSE_NAME_MAP = new Map<string, string>()
for (const c of causesList) {
  CAUSE_NAME_MAP.set(c.id, c.name)
}

// MongoDB stores skills/causes as JSON strings — safely parse them
function safeParseArray(val: any): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === "string") {
    try { return JSON.parse(val) } catch { return [] }
  }
  return []
}

export function resolveSkillNames(skills: any): string[] {
  const arr = safeParseArray(skills)
  return arr
    .map((s: any) => {
      if (typeof s === "string") return SKILL_NAME_MAP.get(s)?.name || s.replace(/-/g, " ")
      const id = s?.subskillId || s?.id
      return id ? SKILL_NAME_MAP.get(id)?.name || id.replace(/-/g, " ") : null
    })
    .filter(Boolean) as string[]
}

export function resolveSkillCategories(skills: any): string[] {
  const arr = safeParseArray(skills)
  const cats = new Set<string>()
  for (const s of arr) {
    const catId = typeof s === "string" ? null : s?.categoryId
    if (catId) {
      const catObj = skillCategories.find((c) => c.id === catId)
      if (catObj) cats.add(catObj.name)
    } else {
      const id = typeof s === "string" ? s : s?.subskillId || s?.id
      if (id) {
        const info = SKILL_NAME_MAP.get(id)
        if (info) cats.add(info.category)
      }
    }
  }
  return Array.from(cats)
}

export function resolveCauseNames(causeIds: any): string[] {
  const arr = safeParseArray(causeIds)
  return arr
    .map((c: any) => {
      const id = typeof c === "string" ? c : c?.id
      return id ? CAUSE_NAME_MAP.get(id) || id.replace(/-/g, " ") : null
    })
    .filter(Boolean) as string[]
}

// ============================================
// RECORD TRANSFORMERS — MongoDB doc → Algolia record
// ============================================

export function transformVolunteerRecord(user: any): Record<string, any> {
  const parsedSkills = safeParseArray(user.skills)
  const parsedCauses = safeParseArray(user.causes)
  const skillNames = resolveSkillNames(parsedSkills)
  const skillCats = resolveSkillCategories(parsedSkills)
  const causeNames = resolveCauseNames(parsedCauses)

  return {
    objectID: user._id?.toString(),
    type: "volunteer",
    // Primary searchable fields
    name: user.name || "",
    headline: user.headline || "",
    bio: user.bio || "",
    // Location
    location: user.location || "",
    city: user.city || "",
    country: user.country || "",
    // Skills (denormalized for search)
    skillNames,
    skillCategories: skillCats,
    skillIds: parsedSkills
      .map((s: any) => (typeof s === "string" ? s : s?.subskillId || s?.id)).filter(Boolean),
    // Causes (denormalized)
    causeNames,
    causeIds: parsedCauses.filter(Boolean),
    // Filters (facets)
    volunteerType: user.volunteerType || "free",
    workMode: user.workMode || "remote",
    availability: user.availability || "",
    hoursPerWeek: user.hoursPerWeek || "",
    freeHoursPerMonth: user.freeHoursPerMonth || 0,
    hourlyRate: user.hourlyRate || 0,
    currency: user.currency || "INR",
    // Ranking signals
    rating: user.rating || 0,
    totalRatings: user.totalRatings || 0,
    completedProjects: user.completedProjects || 0,
    hoursContributed: user.hoursContributed || 0,
    isVerified: user.isVerified || false,
    // Display
    avatar: user.avatar || user.image || "",
    linkedinUrl: user.linkedinUrl || "",
    portfolioUrl: user.portfolioUrl || "",
    // Timestamps (epoch for Algolia sorting)
    createdAt: user.createdAt ? new Date(user.createdAt).getTime() : 0,
    updatedAt: user.updatedAt ? new Date(user.updatedAt).getTime() : 0,
  }
}

export function transformNGORecord(user: any): Record<string, any> {
  const ngoSkills = safeParseArray(user.typicalSkillsNeeded || user.skills)
  const ngoCauses = safeParseArray(user.causes)
  const skillNames = resolveSkillNames(ngoSkills)
  const skillCats = resolveSkillCategories(ngoSkills)
  const causeNames = resolveCauseNames(ngoCauses)

  return {
    objectID: user._id?.toString(),
    type: "ngo",
    // Primary searchable fields
    name: user.organizationName || user.orgName || user.name || "",
    orgName: user.orgName || user.organizationName || "",
    contactPersonName: user.contactPersonName || "",
    description: user.description || "",
    mission: user.mission || "",
    // Location
    location: user.address || user.location || "",
    city: user.city || "",
    country: user.country || "",
    website: user.website || "",
    // Skills needed
    skillNames,
    skillCategories: skillCats,
    skillIds: ngoSkills
      .map((s: any) => s?.subskillId || s?.id).filter(Boolean),
    // Causes
    causeNames,
    causeIds: ngoCauses.filter(Boolean),
    // Filters
    acceptRemoteVolunteers: user.acceptRemoteVolunteers || false,
    acceptOnsiteVolunteers: user.acceptOnsiteVolunteers || false,
    yearFounded: user.yearFounded || "",
    teamSize: user.teamSize || "",
    // Stats
    projectsPosted: user.projectsPosted || 0,
    projectsCompleted: user.projectsCompleted || 0,
    volunteersEngaged: user.volunteersEngaged || 0,
    isVerified: user.isVerified || false,
    // Display
    logo: user.logo || user.avatar || user.image || "",
    // Timestamps
    createdAt: user.createdAt ? new Date(user.createdAt).getTime() : 0,
    updatedAt: user.updatedAt ? new Date(user.updatedAt).getTime() : 0,
  }
}

export function transformOpportunityRecord(project: any, ngoName?: string): Record<string, any> {
  const projSkills = safeParseArray(project.skillsRequired || project.skills)
  const projCauses = safeParseArray(project.causes)
  const skillNames = resolveSkillNames(projSkills)
  const skillCats = resolveSkillCategories(projSkills)
  const causeNames = resolveCauseNames(projCauses)

  return {
    objectID: project._id?.toString(),
    type: "opportunity",
    // Primary searchable
    title: project.title || "",
    description: project.description || "",
    ngoName: ngoName || "",
    // Skills
    skillNames,
    skillCategories: skillCats,
    skillIds: projSkills
      .map((s: any) => s?.subskillId || s?.id).filter(Boolean),
    // Causes
    causeNames,
    causeIds: projCauses.filter(Boolean),
    // Filters
    experienceLevel: project.experienceLevel || "",
    timeCommitment: project.timeCommitment || "",
    duration: project.duration || "",
    projectType: project.projectType || "",
    workMode: project.workMode || "remote",
    location: project.location || "",
    status: project.status || "open",
    // Stats
    applicantsCount: project.applicantsCount || 0,
    viewsCount: project.viewsCount || 0,
    // Dates
    startDate: project.startDate ? new Date(project.startDate).getTime() : 0,
    deadline: project.deadline ? new Date(project.deadline).getTime() : 0,
    ngoId: project.ngoId || "",
    // Timestamps
    createdAt: project.createdAt ? new Date(project.createdAt).getTime() : 0,
    updatedAt: project.updatedAt ? new Date(project.updatedAt).getTime() : 0,
  }
}

// ============================================
// INDEX SETTINGS CONFIGURATION
// ============================================

export function getVolunteerIndexSettings() {
  return {
    searchableAttributes: [
      "name",
      "headline",
      "skillNames",
      "skillCategories",
      "causeNames",
      "bio",
      "city,country,location",
    ],
    attributesForFaceting: [
      "searchable(skillNames)",
      "searchable(skillCategories)",
      "searchable(causeNames)",
      "volunteerType",
      "workMode",
      "availability",
      "isVerified",
      "searchable(city)",
      "searchable(country)",
    ],
    customRanking: [
      "desc(rating)",
      "desc(completedProjects)",
      "desc(isVerified)",
      "desc(updatedAt)",
    ],
    attributesToRetrieve: [
      "objectID", "type", "name", "headline", "bio", "avatar",
      "location", "city", "country",
      "skillNames", "skillCategories", "skillIds",
      "causeNames", "causeIds",
      "volunteerType", "workMode", "availability", "hoursPerWeek",
      "freeHoursPerMonth", "hourlyRate", "currency",
      "rating", "totalRatings", "completedProjects", "hoursContributed",
      "isVerified", "linkedinUrl", "portfolioUrl",
      "createdAt", "updatedAt",
    ],
    attributesToHighlight: ["name", "headline", "bio", "skillNames", "causeNames", "city"],
    attributesToSnippet: ["bio:50", "headline:80"],
    hitsPerPage: 20,
    typoTolerance: true,
    minWordSizefor1Typo: 3,
    minWordSizefor2Typos: 7,
    queryLanguages: ["en" as SupportedLanguage],
    removeStopWords: true,
    ignorePlurals: true,
  }
}

export function getNGOIndexSettings() {
  return {
    searchableAttributes: [
      "name,orgName",
      "description",
      "mission",
      "skillNames",
      "skillCategories",
      "causeNames",
      "contactPersonName",
      "city,country,location",
    ],
    attributesForFaceting: [
      "searchable(skillNames)",
      "searchable(skillCategories)",
      "searchable(causeNames)",
      "acceptRemoteVolunteers",
      "acceptOnsiteVolunteers",
      "isVerified",
      "searchable(city)",
      "searchable(country)",
    ],
    customRanking: [
      "desc(isVerified)",
      "desc(projectsPosted)",
      "desc(volunteersEngaged)",
      "desc(updatedAt)",
    ],
    attributesToRetrieve: [
      "objectID", "type", "name", "orgName", "contactPersonName",
      "description", "mission", "logo",
      "location", "city", "country", "website",
      "skillNames", "skillCategories", "skillIds",
      "causeNames", "causeIds",
      "acceptRemoteVolunteers", "acceptOnsiteVolunteers",
      "yearFounded", "teamSize",
      "projectsPosted", "projectsCompleted", "volunteersEngaged",
      "isVerified",
      "createdAt", "updatedAt",
    ],
    attributesToHighlight: ["name", "orgName", "description", "mission", "skillNames", "causeNames", "city"],
    attributesToSnippet: ["description:60", "mission:60"],
    hitsPerPage: 20,
    typoTolerance: true,
    minWordSizefor1Typo: 3,
    minWordSizefor2Typos: 7,
    queryLanguages: ["en" as SupportedLanguage],
    removeStopWords: true,
    ignorePlurals: true,
  }
}

export function getOpportunityIndexSettings() {
  return {
    searchableAttributes: [
      "title",
      "skillNames",
      "skillCategories",
      "causeNames",
      "description",
      "ngoName",
      "location",
    ],
    attributesForFaceting: [
      "searchable(skillNames)",
      "searchable(skillCategories)",
      "searchable(causeNames)",
      "experienceLevel",
      "workMode",
      "projectType",
      "status",
      "searchable(location)",
    ],
    customRanking: [
      "desc(updatedAt)",
      "desc(viewsCount)",
      "desc(applicantsCount)",
    ],
    attributesToRetrieve: [
      "objectID", "type", "title", "description", "ngoName", "ngoId",
      "skillNames", "skillCategories", "skillIds",
      "causeNames", "causeIds",
      "experienceLevel", "timeCommitment", "duration", "projectType",
      "workMode", "location", "status",
      "applicantsCount", "viewsCount",
      "startDate", "deadline",
      "createdAt", "updatedAt",
    ],
    attributesToHighlight: ["title", "description", "skillNames", "causeNames", "ngoName", "location"],
    attributesToSnippet: ["description:60"],
    hitsPerPage: 20,
    typoTolerance: true,
    minWordSizefor1Typo: 3,
    minWordSizefor2Typos: 7,
    queryLanguages: ["en" as SupportedLanguage],
    removeStopWords: true,
    ignorePlurals: true,
  }
}

// ============================================
// SYNONYM GROUPS (for Algolia)
// ============================================

export function getSynonymGroups() {
  return [
    // ======== Two-way synonyms (terms treated as equivalent) ========

    // Volunteer / platform terms
    { objectID: "syn-volunteer", type: "synonym" as const, synonyms: ["volunteer", "volunteering", "candidate", "talent"] },

    // Causes
    { objectID: "syn-education", type: "synonym" as const, synonyms: ["education", "teaching", "tutoring", "mentoring", "training"] },
    { objectID: "syn-healthcare", type: "synonym" as const, synonyms: ["healthcare", "health", "medical", "wellness"] },
    { objectID: "syn-environment", type: "synonym" as const, synonyms: ["environment", "climate", "sustainability", "ecology", "conservation"] },
    { objectID: "syn-poverty", type: "synonym" as const, synonyms: ["poverty", "poverty alleviation", "underprivileged", "welfare"] },
    { objectID: "syn-women", type: "synonym" as const, synonyms: ["women empowerment", "gender equality", "women rights", "feminism"] },
    { objectID: "syn-children", type: "synonym" as const, synonyms: ["child welfare", "children", "child rights", "kids"] },
    { objectID: "syn-animals", type: "synonym" as const, synonyms: ["animal welfare", "animals", "animal rights", "pets", "stray"] },
    { objectID: "syn-disaster", type: "synonym" as const, synonyms: ["disaster relief", "relief", "emergency", "humanitarian"] },
    { objectID: "syn-humanrights", type: "synonym" as const, synonyms: ["human rights", "civil rights", "justice", "equality"] },
    { objectID: "syn-arts", type: "synonym" as const, synonyms: ["arts", "culture", "music", "theater", "dance"] },
    { objectID: "syn-seniors", type: "synonym" as const, synonyms: ["senior citizens", "elderly", "old age", "geriatric"] },
    { objectID: "syn-disability", type: "synonym" as const, synonyms: ["disability support", "disability", "handicapped", "accessibility", "inclusion"] },

    // Content creation
    { objectID: "syn-content-creator", type: "synonym" as const, synonyms: ["content creator", "content creation", "social media content", "reels creator", "shorts creator"] },
    { objectID: "syn-video", type: "synonym" as const, synonyms: ["video editor", "video editing", "video maker", "video creator", "videographer"] },
    { objectID: "syn-photo-video", type: "synonym" as const, synonyms: ["photography", "photo", "videography", "video", "camera"] },
    { objectID: "syn-blogging", type: "synonym" as const, synonyms: ["blogger", "blog writing", "blog writer", "article writing", "content writer"] },
    { objectID: "syn-instagram", type: "synonym" as const, synonyms: ["instagram", "reels", "stories", "social media content"] },
    { objectID: "syn-youtube", type: "synonym" as const, synonyms: ["youtube", "video editing", "video creator", "youtube editor"] },
    { objectID: "syn-tiktok", type: "synonym" as const, synonyms: ["tiktok", "short video", "reels", "shorts"] },
    { objectID: "syn-podcast-group", type: "synonym" as const, synonyms: ["podcast", "podcaster", "podcast production", "audio"] },
    { objectID: "syn-animator", type: "synonym" as const, synonyms: ["animator", "animation", "motion graphics", "motion designer", "after effects"] },
    { objectID: "syn-illustration", type: "synonym" as const, synonyms: ["illustration", "illustrator", "infographic", "infographics", "drawing"] },

    // Design
    { objectID: "syn-design", type: "synonym" as const, synonyms: ["graphic design", "design", "branding", "visual identity"] },
    { objectID: "syn-canva", type: "synonym" as const, synonyms: ["canva", "graphic design", "social media design", "poster design"] },
    { objectID: "syn-figma", type: "synonym" as const, synonyms: ["figma", "ui design", "ux design", "prototype"] },
    { objectID: "syn-presentation", type: "synonym" as const, synonyms: ["presentation", "powerpoint", "google slides", "ppt", "slide deck"] },

    // Marketing
    { objectID: "syn-marketing", type: "synonym" as const, synonyms: ["marketing", "digital marketing", "social media", "advertising"] },
    { objectID: "syn-seo", type: "synonym" as const, synonyms: ["seo", "search engine optimization", "organic search", "search optimization"] },
    { objectID: "syn-ads", type: "synonym" as const, synonyms: ["ads", "advertising", "ppc", "facebook ads", "google ads", "meta ads"] },
    { objectID: "syn-email-mktg", type: "synonym" as const, synonyms: ["email marketing", "newsletter", "email campaign", "mailchimp"] },
    { objectID: "syn-crm", type: "synonym" as const, synonyms: ["crm", "hubspot", "zoho", "customer relationship"] },

    // Web development
    { objectID: "syn-webdev", type: "synonym" as const, synonyms: ["web development", "website", "frontend", "backend", "fullstack"] },
    { objectID: "syn-wordpress", type: "synonym" as const, synonyms: ["wordpress", "wp", "cms"] },
    { objectID: "syn-react", type: "synonym" as const, synonyms: ["react", "nextjs", "react.js", "next.js"] },
    { objectID: "syn-mobile-app", type: "synonym" as const, synonyms: ["mobile app", "app development", "react native", "flutter", "ios", "android"] },
    { objectID: "syn-nocode", type: "synonym" as const, synonyms: ["no code", "nocode", "webflow", "bubble", "low code"] },
    { objectID: "syn-database", type: "synonym" as const, synonyms: ["database", "mongodb", "postgresql", "mysql", "sql"] },

    // Writing & communication
    { objectID: "syn-content", type: "synonym" as const, synonyms: ["content writing", "copywriting", "blog writing", "article writing"] },
    { objectID: "syn-grant", type: "synonym" as const, synonyms: ["grant writing", "grant research", "grant proposal", "proposal writing"] },
    { objectID: "syn-translation", type: "synonym" as const, synonyms: ["translation", "localization", "translator", "interpreter"] },

    // Finance
    { objectID: "syn-finance", type: "synonym" as const, synonyms: ["finance", "accounting", "bookkeeping", "budgeting"] },
    { objectID: "syn-tax", type: "synonym" as const, synonyms: ["tax", "taxation", "tax compliance", "80g", "12a"] },
    { objectID: "syn-audit", type: "synonym" as const, synonyms: ["audit", "auditing", "audit support", "financial audit"] },
    { objectID: "syn-accounting-sw", type: "synonym" as const, synonyms: ["tally", "quickbooks", "accounting software", "zoho books"] },

    // Fundraising
    { objectID: "syn-fundraising", type: "synonym" as const, synonyms: ["fundraising", "grant writing", "crowdfunding", "sponsorship", "donation"] },
    { objectID: "syn-crowdfunding", type: "synonym" as const, synonyms: ["crowdfunding", "gofundme", "ketto", "milaap", "online fundraising"] },
    { objectID: "syn-csr", type: "synonym" as const, synonyms: ["csr", "corporate social responsibility", "corporate sponsorship"] },

    // Legal
    { objectID: "syn-legal", type: "synonym" as const, synonyms: ["legal", "compliance", "law", "regulatory", "legal advisory"] },
    { objectID: "syn-ngo-reg", type: "synonym" as const, synonyms: ["ngo registration", "trust registration", "society registration", "section 8"] },
    { objectID: "syn-fcra", type: "synonym" as const, synonyms: ["fcra", "fcra compliance", "foreign contribution"] },

    // Operations
    { objectID: "syn-event", type: "synonym" as const, synonyms: ["event planning", "event management", "event coordination", "event organizer"] },
    { objectID: "syn-project-mgmt", type: "synonym" as const, synonyms: ["project management", "project manager", "notion", "trello", "asana"] },
    { objectID: "syn-hr", type: "synonym" as const, synonyms: ["hr", "human resources", "recruitment", "hiring", "staffing"] },
    { objectID: "syn-me", type: "synonym" as const, synonyms: ["monitoring evaluation", "m&e", "impact assessment", "impact measurement"] },

    // Data & technology
    { objectID: "syn-data", type: "synonym" as const, synonyms: ["data analysis", "data visualization", "analytics", "reporting"] },
    { objectID: "syn-ai", type: "synonym" as const, synonyms: ["ai", "artificial intelligence", "machine learning", "ml", "deep learning"] },
    { objectID: "syn-automation", type: "synonym" as const, synonyms: ["automation", "zapier", "make", "n8n", "workflow automation"] },
    { objectID: "syn-it", type: "synonym" as const, synonyms: ["it support", "tech support", "it setup", "technical support"] },

    // NGO terms
    { objectID: "syn-ngo", type: "synonym" as const, synonyms: ["ngo", "nonprofit", "non-profit", "organization", "charity"] },
    { objectID: "syn-remote", type: "synonym" as const, synonyms: ["remote", "work from home", "wfh", "virtual", "online"] },
    { objectID: "syn-impact-agent", type: "synonym" as const, synonyms: ["candidate", "volunteer", "talent", "volunteering"] },

    // ======== One-way synonyms (input → expands to alternatives) ========

    // Abbreviations
    { objectID: "ow-ui-ux", type: "oneWaySynonym" as const, input: "ui ux", synonyms: ["ux ui design", "user experience", "user interface"] },
    { objectID: "ow-ml", type: "oneWaySynonym" as const, input: "ml", synonyms: ["machine learning", "ai", "artificial intelligence"] },
    { objectID: "ow-ppc", type: "oneWaySynonym" as const, input: "ppc", synonyms: ["pay per click", "google ads", "paid advertising"] },
    { objectID: "ow-hr", type: "oneWaySynonym" as const, input: "hr", synonyms: ["human resources", "recruitment", "hiring"] },
    { objectID: "ow-ca", type: "oneWaySynonym" as const, input: "ca", synonyms: ["chartered accountant", "accounting", "tax", "audit"] },
    { objectID: "ow-seo", type: "oneWaySynonym" as const, input: "seo", synonyms: ["search engine optimization", "organic search", "content marketing"] },
    { objectID: "ow-crm", type: "oneWaySynonym" as const, input: "crm", synonyms: ["customer relationship management", "hubspot", "zoho", "mailchimp"] },
    { objectID: "ow-devops", type: "oneWaySynonym" as const, input: "devops", synonyms: ["deployment", "hosting", "aws", "vercel", "cloud"] },
    { objectID: "ow-rti", type: "oneWaySynonym" as const, input: "rti", synonyms: ["right to information", "legal advocacy", "transparency"] },

    // Role terms → skill terms
    { objectID: "ow-freelance", type: "oneWaySynonym" as const, input: "freelance", synonyms: ["volunteer", "paid", "talent"] },
    { objectID: "ow-designer", type: "oneWaySynonym" as const, input: "designer", synonyms: ["graphic design", "ux ui design", "branding", "web design", "logo design"] },
    { objectID: "ow-developer", type: "oneWaySynonym" as const, input: "developer", synonyms: ["web development", "react", "nextjs", "wordpress", "node", "mobile app"] },
    { objectID: "ow-writer", type: "oneWaySynonym" as const, input: "writer", synonyms: ["blog writing", "content writing", "copywriting", "article writing", "grant writing"] },
    { objectID: "ow-editor", type: "oneWaySynonym" as const, input: "editor", synonyms: ["video editing", "photo editing", "blog writing", "content editing"] },
    { objectID: "ow-marketer", type: "oneWaySynonym" as const, input: "marketer", synonyms: ["digital marketing", "social media strategy", "email marketing", "content marketing"] },
    { objectID: "ow-analyst", type: "oneWaySynonym" as const, input: "analyst", synonyms: ["data analysis", "financial analysis", "analytics", "reporting", "impact analysis"] },
    { objectID: "ow-manager", type: "oneWaySynonym" as const, input: "manager", synonyms: ["project management", "social media manager", "event manager", "operations"] },
    { objectID: "ow-consultant", type: "oneWaySynonym" as const, input: "consultant", synonyms: ["advisory", "strategy", "consulting", "expert"] },
    { objectID: "ow-accountant", type: "oneWaySynonym" as const, input: "accountant", synonyms: ["bookkeeping", "accounting", "tax compliance", "financial reporting"] },
    { objectID: "ow-lawyer", type: "oneWaySynonym" as const, input: "lawyer", synonyms: ["legal advisory", "contract drafting", "compliance", "advocate"] },
    { objectID: "ow-trainer", type: "oneWaySynonym" as const, input: "trainer", synonyms: ["training", "workshop", "facilitation", "teaching", "coaching"] },
    { objectID: "ow-researcher", type: "oneWaySynonym" as const, input: "researcher", synonyms: ["research", "surveys", "data collection", "grant research"] },
    { objectID: "ow-photographer", type: "oneWaySynonym" as const, input: "photographer", synonyms: ["photography", "photo editing", "camera", "event photography"] },
    { objectID: "ow-fundraiser", type: "oneWaySynonym" as const, input: "fundraiser", synonyms: ["fundraising", "grant writing", "crowdfunding", "donor management"] },

    // Tool/platform names → skill domains
    { objectID: "ow-canva", type: "oneWaySynonym" as const, input: "canva", synonyms: ["graphic design", "social media content", "poster design"] },
    { objectID: "ow-figma", type: "oneWaySynonym" as const, input: "figma", synonyms: ["ux ui design", "prototype", "wireframe"] },
    { objectID: "ow-photoshop", type: "oneWaySynonym" as const, input: "photoshop", synonyms: ["photo editing", "graphic design", "retouching"] },
    { objectID: "ow-premiere", type: "oneWaySynonym" as const, input: "premiere pro", synonyms: ["video editing", "video production"] },
    { objectID: "ow-aftereffects", type: "oneWaySynonym" as const, input: "after effects", synonyms: ["motion graphics", "animation", "visual effects"] },
    { objectID: "ow-davinci", type: "oneWaySynonym" as const, input: "davinci resolve", synonyms: ["video editing", "color grading"] },
    { objectID: "ow-excel", type: "oneWaySynonym" as const, input: "excel", synonyms: ["data analysis", "spreadsheet", "data entry", "reporting"] },
    { objectID: "ow-powerbi", type: "oneWaySynonym" as const, input: "power bi", synonyms: ["data visualization", "analytics", "dashboard", "reporting"] },
    { objectID: "ow-tableau", type: "oneWaySynonym" as const, input: "tableau", synonyms: ["data visualization", "analytics", "dashboard"] },
  ]
}

// ============================================
// SINGLE RECORD SYNC — for real-time updates
// ============================================

export async function syncVolunteerToAlgolia(user: any) {
  try {
    const client = getAlgoliaAdminClient()
    const record = transformVolunteerRecord(user)
    await client.saveObject({ indexName: ALGOLIA_INDEXES.VOLUNTEERS, body: record })
    console.log(`[Algolia] Synced volunteer ${record.objectID}`)
  } catch (err) {
    console.error("[Algolia] Failed to sync volunteer:", err)
  }
}

export async function syncNGOToAlgolia(user: any) {
  try {
    const client = getAlgoliaAdminClient()
    const record = transformNGORecord(user)
    await client.saveObject({ indexName: ALGOLIA_INDEXES.NGOS, body: record })
    console.log(`[Algolia] Synced NGO ${record.objectID}`)
  } catch (err) {
    console.error("[Algolia] Failed to sync NGO:", err)
  }
}

export async function syncOpportunityToAlgolia(project: any, ngoName?: string) {
  try {
    const client = getAlgoliaAdminClient()
    const record = transformOpportunityRecord(project, ngoName)
    await client.saveObject({ indexName: ALGOLIA_INDEXES.OPPORTUNITIES, body: record })
    console.log(`[Algolia] Synced opportunity ${record.objectID}`)
  } catch (err) {
    console.error("[Algolia] Failed to sync opportunity:", err)
  }
}

export async function deleteFromAlgolia(indexName: string, objectID: string) {
  try {
    const client = getAlgoliaAdminClient()
    await client.deleteObject({ indexName, objectID })
    console.log(`[Algolia] Deleted ${objectID} from ${indexName}`)
  } catch (err) {
    console.error("[Algolia] Failed to delete:", err)
  }
}
