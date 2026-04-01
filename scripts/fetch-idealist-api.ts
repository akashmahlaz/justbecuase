#!/usr/bin/env tsx
// ============================================
// FULL-SCAN: Fetch ALL Idealist remote jobs into MongoDB
// ============================================
// No timeout limit — runs locally. Scans every job on Idealist,
// checks detail for locationType=REMOTE, stores with clean data.
// Uses sourceplatform "idealist-api" (matches the cron route).
//
// Run: cd c:\Users\akash\work\justbecuase && npx tsx scripts/fetch-idealist-api.ts

import { config } from "dotenv"
config({ path: ".env.local" })

const API_BASE = "https://www.idealist.org"
const API_KEY = process.env.IDEALIST_API_KEY || ""

if (!API_KEY) {
  console.error("IDEALIST_API_KEY not set in .env.local")
  process.exit(1)
}

const HEADERS = {
  Accept: "application/json",
  Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ============================================
// Mappings (same as lib/idealist-api.ts)
// ============================================
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
  ENGINEERING: "website",
  ENVIRONMENTAL: "planning-support",
  EVENTS: "planning-support",
  FINANCE: "finance",
  GENERAL: "planning-support",
  GRANT_WRITING: "fundraising",
  GRAPHIC_DESIGN: "content-creation",
  HEALTH: "planning-support",
  HR: "planning-support",
  IT: "website",
  LEGAL: "legal",
  MANAGEMENT: "planning-support",
  MARKETING: "digital-marketing",
  MEDIA: "content-creation",
  OTHER: "planning-support",
  PR: "communication",
  PROGRAM: "planning-support",
  PROJECT_MGMT: "planning-support",
  RESEARCH: "data-technology",
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
  ENGINEERING: "react-nextjs",
  ENVIRONMENTAL: "research-surveys",
  EVENTS: "event-planning",
  FINANCE: "financial-reporting",
  GENERAL: "data-entry",
  GRANT_WRITING: "grant-writing",
  GRAPHIC_DESIGN: "graphic-design",
  HEALTH: "research-surveys",
  HR: "hr-recruitment",
  IT: "react-nextjs",
  LEGAL: "legal-advisory",
  MANAGEMENT: "project-management",
  MARKETING: "social-media-strategy",
  MEDIA: "video-editing",
  OTHER: "data-entry",
  PR: "press-release",
  PROGRAM: "project-management",
  PROJECT_MGMT: "project-management",
  RESEARCH: "data-analysis",
  SOCIAL_MEDIA: "social-media-strategy",
  SOCIAL_WORK: "volunteer-recruitment",
  TRANSLATION: "translation-localization",
  VOLUNTEER_MGMT: "volunteer-recruitment",
  WRITING_EDITING: "blog-article-writing",
}

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

const AREA_WORD_TO_CAUSE: Record<string, string> = {
  animals: "animal-welfare",
  arts: "arts-culture",
  children: "child-welfare",
  youth: "child-welfare",
  crisis: "disaster-relief",
  disaster: "disaster-relief",
  education: "education",
  environment: "environment",
  climate: "environment",
  health: "healthcare",
  healthcare: "healthcare",
  human: "human-rights",
  rights: "human-rights",
  poverty: "poverty-alleviation",
  hunger: "poverty-alleviation",
  women: "women-empowerment",
  gender: "women-empowerment",
  disability: "disability-support",
  senior: "senior-citizens",
  elderly: "senior-citizens",
}

function mapCauses(areasOfFocus: string[]): string[] {
  const causeSet = new Set<string>()
  for (const area of areasOfFocus) {
    const direct = AREA_TO_CAUSE[area]
    if (direct) { causeSet.add(direct); continue }
    const words = area.replace(/_/g, " ").toLowerCase().split(/\s+/)
    for (const w of words) {
      const mapped = AREA_WORD_TO_CAUSE[w]
      if (mapped) causeSet.add(mapped)
    }
  }
  return Array.from(causeSet)
}

function mapSkills(functions: string[]) {
  const skillTags: string[] = []
  const skillsRequired: { categoryId: string; subskillId: string; priority: string }[] = []
  const seen = new Set<string>()
  for (const fn of functions) {
    const categoryId = FUNCTION_TO_SKILL[fn]
    const subskillId = FUNCTION_TO_SUBSKILL[fn]
    if (categoryId && subskillId && !seen.has(subskillId)) {
      seen.add(subskillId)
      skillsRequired.push({ categoryId, subskillId, priority: "nice-to-have" })
    }
    const tag = fn.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    if (!skillTags.includes(tag)) skillTags.push(tag)
  }
  return { skillTags, skillsRequired }
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

// ============================================
// Main
// ============================================
async function main() {
  console.log("Fetching ALL Idealist remote jobs (no limit)...\n")

  const { MongoClient } = await import("mongodb")
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) { console.error("MONGODB_URI not set"); process.exit(1) }

  const client = new MongoClient(mongoUri)
  await client.connect()
  const db = client.db("justbecause")
  const collection = db.collection("externalOpportunities")

  await collection.createIndex({ sourceplatform: 1, externalId: 1 }, { unique: true })
  await collection.createIndex({ isActive: 1, scrapedAt: -1 })

  let since = ""
  let hasMore = true
  let pageCount = 0
  let totalListed = 0
  let detailsFetched = 0
  let remoteCount = 0
  let inserted = 0
  let updated = 0
  const seenIds = new Set<string>()

  while (hasMore) {
    pageCount++
    const url = since
      ? `${API_BASE}/api/v1/listings/jobs?since=${encodeURIComponent(since)}`
      : `${API_BASE}/api/v1/listings/jobs`

    console.log(`Page ${pageCount}: fetching list...`)

    let data: { jobs: any[]; hasMore: boolean }
    try {
      const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) })
      if (!response.ok) {
        console.error(`HTTP ${response.status} — stopping`)
        break
      }
      data = await response.json()
    } catch (err) {
      console.error(`Fetch failed on page ${pageCount}:`, err)
      break
    }

    const jobs = data.jobs || []
    hasMore = data.hasMore ?? false

    if (jobs.length === 0) {
      console.log("No more jobs")
      break
    }

    totalListed += jobs.length
    console.log(`  Got ${jobs.length} items (total listed: ${totalListed}, hasMore: ${hasMore})`)

    for (const job of jobs) {
      since = job.updated

      if (job.isPublished === false) continue

      await sleep(200) // Slightly faster locally — still polite
      detailsFetched++

      try {
        const detailResp = await fetch(`${API_BASE}/api/v1/listings/jobs/${job.id}`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(20000),
        })
        if (detailResp.status === 404) continue
        if (!detailResp.ok) continue

        const detailData = await detailResp.json()
        const d = detailData.job
        if (!d) continue

        // REMOTE ONLY
        if (d.locationType !== "REMOTE") continue

        remoteCount++
        seenIds.add(`idealist_${d.id}`)

        const plainDescription = stripHtml(d.description || "")
        const { skillTags, skillsRequired } = mapSkills(d.functions || [])
        const causes = mapCauses(d.areasOfFocus || d.org?.areasOfFocus || [])

        let salary: string | undefined
        if (d.salaryMinimum || d.salaryMaximum) {
          const parts: string[] = []
          if (d.salaryMinimum) parts.push(d.salaryMinimum)
          if (d.salaryMaximum) parts.push(d.salaryMaximum)
          salary = parts.join(" - ")
          if (d.salaryCurrency) salary += ` ${d.salaryCurrency}`
          if (d.salaryPeriod) salary += `/${d.salaryPeriod.toLowerCase()}`
        }

        let projectType = "long-term"
        if (d.isContract) projectType = "consultation"
        if (d.isTemporary) projectType = "short-term"

        const sourceUrl = d.url?.en || `https://www.idealist.org/en/nonprofit-job/${d.id}`

        const doc = {
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
          experienceLevel: undefined,
          workMode: "remote",
          location: d.address?.full || "Remote",
          city: d.address?.city || undefined,
          country: d.address?.country || undefined,
          timeCommitment: d.isFullTime ? "Full time" : "Part time",
          duration: d.startDate && d.endDate ? `${d.startDate} to ${d.endDate}` : undefined,
          projectType,
          deadline: d.applicationDeadline ? new Date(d.applicationDeadline) : d.expires ? new Date(d.expires) : undefined,
          postedDate: d.firstPublished ? new Date(d.firstPublished) : undefined,
          compensationType: "paid",
          salary,
          isActive: true,
          scrapedAt: new Date(),
          updatedAt: new Date(),
        }

        const existing = await collection.findOne({ sourceplatform: "idealist-api", externalId: doc.externalId })
        if (existing) {
          await collection.updateOne({ _id: existing._id }, { $set: { ...doc, updatedAt: new Date() } })
          updated++
        } else {
          await collection.insertOne(doc as any)
          inserted++
        }

        if (remoteCount % 25 === 0) {
          console.log(`  Remote: ${remoteCount} (new: ${inserted}, updated: ${updated}) | Details checked: ${detailsFetched}`)
        }
      } catch {
        // Non-fatal — continue to next job
      }
    }

    await sleep(200)
  }

  // Mark stale idealist-api jobs as inactive
  const staleResult = await collection.updateMany(
    {
      sourceplatform: "idealist-api",
      isActive: true,
      externalId: { $nin: Array.from(seenIds) },
    },
    { $set: { isActive: false, updatedAt: new Date() } }
  )

  console.log("\n==========================================")
  console.log("Done!")
  console.log(`  Total jobs listed: ${totalListed}`)
  console.log(`  Details checked: ${detailsFetched}`)
  console.log(`  Remote jobs found: ${remoteCount}`)
  console.log(`  New inserted: ${inserted}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Stale deactivated: ${staleResult.modifiedCount}`)
  console.log(`  Pages fetched: ${pageCount}`)
  console.log("==========================================")

  await client.close()
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1) })
