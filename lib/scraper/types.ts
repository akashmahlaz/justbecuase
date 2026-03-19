// ============================================
// Scraper Types
// ============================================

export type ScraperPlatform =
  | "reliefweb"
  | "idealist"
  | "unjobs"
  | "devex"
  | "impactpool"
  | "workforgood"
  | "devnetjobs"

export type ScraperStatus = "idle" | "running" | "completed" | "failed"

export interface ScrapedOpportunity {
  // External identifiers
  sourceplatform: ScraperPlatform
  sourceUrl: string
  externalId: string // Unique ID from the source platform

  // Mapped to our Project model
  title: string
  description: string
  shortDescription?: string
  organization: string // NGO/Org name from source
  organizationUrl?: string
  organizationLogo?: string

  // Classification
  causes: string[]
  skillsRequired: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[]
  experienceLevel?: "beginner" | "intermediate" | "advanced" | "expert"

  // Time & Location
  workMode: "remote" | "onsite" | "hybrid"
  location?: string
  city?: string
  country?: string
  timeCommitment?: string
  duration?: string
  projectType?: "short-term" | "long-term" | "consultation" | "ongoing"

  // Dates
  deadline?: Date
  postedDate?: Date
  startDate?: Date

  // Compensation
  compensationType?: "volunteer" | "paid" | "stipend"
  salary?: string // Raw salary string from source

  // Raw data from source (for debugging)
  rawData?: Record<string, unknown>
}

export interface ScraperRun {
  _id?: string
  platform: ScraperPlatform
  status: ScraperStatus
  startedAt: Date
  completedAt?: Date
  itemsScraped: number
  itemsNew: number
  itemsUpdated: number
  itemsSkipped: number
  errors: string[]
  triggeredBy: "cron" | "manual"
}

export interface ScraperConfig {
  _id?: string
  platform: ScraperPlatform
  enabled: boolean
  cronSchedule?: string // e.g., "0 4 * * *"
  lastRunAt?: Date
  lastRunStatus?: ScraperStatus
  totalItemsScraped: number
  settings: Record<string, string> // Platform-specific settings (API keys, search params)
  createdAt: Date
  updatedAt: Date
}

export interface ExternalOpportunity {
  _id?: string
  sourceplatform: ScraperPlatform
  externalId: string
  sourceUrl: string

  // Mapped fields (stored as a project-compatible shape)
  title: string
  description: string
  shortDescription?: string
  organization: string
  organizationUrl?: string
  organizationLogo?: string

  causes: string[]
  skillTags: string[] // Raw skill tags from source
  skillsRequired: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[]
  experienceLevel?: string

  workMode: "remote" | "onsite" | "hybrid"
  location?: string
  city?: string
  country?: string
  timeCommitment?: string
  duration?: string
  projectType?: string

  deadline?: Date
  postedDate?: Date

  compensationType?: string
  salary?: string

  // Sync status
  isActive: boolean
  importedToProjectId?: string // If imported as a real project

  // Timestamps
  scrapedAt: Date
  updatedAt: Date
}
