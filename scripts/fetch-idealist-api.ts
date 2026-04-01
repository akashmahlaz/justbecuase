#!/usr/bin/env tsx
// ============================================
// Standalone script to fetch Idealist API jobs and insert into MongoDB
// Run: cd /mnt/c/Users/akash/work/justbecuase && npx tsx scripts/fetch-idealist-api.ts
// ============================================

import { config } from 'dotenv'
config({ path: '.env.local' })

const API_BASE = "https://www.idealist.org"
const API_KEY = process.env.IDEALIST_API_KEY || "b30dfbf84f9b84aa74bb56be06e5d8ce"

const HEADERS = {
  Accept: "application/json",
  Authorization: `Basic ${Buffer.from(`${API_KEY}:`).toString("base64")}`,
}

interface JobListItem {
  id: string
  firstPublished: string
  updated: string
  name: string
  url: { en: string | null }
  isPublished?: boolean
}

interface JobDetail {
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
  locationType?: string
  remoteZone?: string | null
  remoteCountry?: string | null
  salaryMinimum?: string | null
  salaryMaximum?: string | null
  salaryCurrency?: string | null
  salaryPeriod?: string | null
  applicationDeadline?: string | null
  startDate?: string | null
  endDate?: string | null
  isFullTime?: boolean
  functions?: string[]
  areasOfFocus?: string[]
  applyUrl?: string | null
  applyEmail?: string | null
  applyOnIdealist?: boolean
  url: { en: string | null }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Map Idealist areasOfFocus to JBC causes
const CAUSE_MAP: Record<string, string> = {
  "animals": "animal-welfare",
  "arts": "arts-culture",
  "children": "child-welfare",
  "youth": "child-welfare",
  "community": "community-development",
  "crisis": "disaster-relief",
  "disaster": "disaster-relief",
  "humanitarian": "disaster-relief",
  "refugees": "disaster-relief",
  "education": "education",
  "environment": "environment",
  "climate": "environment",
  "energy": "environment",
  "conservation": "environment",
  "sustainability": "environment",
  "health": "healthcare",
  "healthcare": "healthcare",
  "medical": "healthcare",
  "mental": "healthcare",
  "nutrition": "healthcare",
  "human": "human-rights",
  "rights": "human-rights",
  "immigrants": "human-rights",
  "race": "human-rights",
  "civil": "human-rights",
  "lgbtq": "human-rights",
  "poverty": "poverty-alleviation",
  "hunger": "poverty-alleviation",
  "food": "poverty-alleviation",
  "housing": "poverty-alleviation",
  "homelessness": "poverty-alleviation",
  "employment": "poverty-alleviation",
  "women": "women-empowerment",
  "gender": "women-empowerment",
  "disability": "disability-support",
  "senior": "senior-citizens",
  "elderly": "senior-citizens",
}

function mapCauses(areasOfFocus: string[]): string[] {
  const seen = new Set<string>()
  for (const area of areasOfFocus) {
    const words = area.replace(/_/g, " ").toLowerCase().split(/\s+/)
    for (const word of words) {
      const mapped = CAUSE_MAP[word]
      if (mapped && !seen.has(mapped)) seen.add(mapped)
    }
  }
  return Array.from(seen)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
}

async function main() {
  console.log("🚀 Fetching Idealist API jobs (remote only)...")
  
  // Dynamic import for MongoDB
  const { MongoClient } = await import("mongodb")
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) { console.error("❌ MONGODB_URI not set"); process.exit(1) }
  
  const client = new MongoClient(mongoUri)
  await client.connect()
  const db = client.db("justbecause")
  const collection = db.collection("externalOpportunities")

  // Ensure indexes
  await collection.createIndex({ sourceplatform: 1, externalId: 1 }, { unique: true })
  await collection.createIndex({ isActive: 1, scrapedAt: -1 })
  
  let since = ""
  let hasMore = true
  let pageCount = 0
  let totalFetched = 0
  let remoteJobs = 0
  let inserted = 0
  let updated = 0
  const maxPages = 300 // safety limit
  const maxDetails = 1000

  while (hasMore && pageCount < maxPages) {
    pageCount++
    const url = since
      ? `${API_BASE}/api/v1/listings/jobs?since=${encodeURIComponent(since)}`
      : `${API_BASE}/api/v1/listings/jobs`

    console.log(`📄 Page ${pageCount}: fetching list...`)
    
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) })
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status} — stopping`)
      break
    }

    const data = await response.json() as { jobs: JobListItem[], hasMore: boolean }
    const jobs = data.jobs || []
    hasMore = data.hasMore ?? false

    if (jobs.length === 0) {
      console.log("✅ No more jobs")
      break
    }

    totalFetched += jobs.length
    console.log(`   Got ${jobs.length} jobs (total listed: ${totalFetched}, hasMore: ${hasMore})`)

    // Fetch details for each job
    for (const job of jobs) {
      since = job.updated // Update cursor

      if (remoteJobs >= maxDetails) continue

      await sleep(300) // Politeness

      const detailUrl = `${API_BASE}/api/v1/listings/jobs/${job.id}`
      try {
        const detailResp = await fetch(detailUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) })
        if (detailResp.status === 404) continue
        if (!detailResp.ok) continue

        const detailData = await detailResp.json() as { job: JobDetail }
        const d = detailData.job
        if (!d) continue

        // REMOTE ONLY filter
        if (d.locationType !== "REMOTE") continue

        remoteJobs++
        const plainDescription = stripHtml(d.description || "")

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

        const causes = mapCauses(d.areasOfFocus || d.org?.areasOfFocus || [])
        const sourceUrl = d.url?.en || `https://www.idealist.org/en/nonprofit-job/${d.id}`

        const doc = {
          sourceplatform: "idealist" as const,
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
          skillTags: [...(d.functions || []).map(f => f.replace(/_/g, " ").toLowerCase()), ...causes],
          skillsRequired: [],
          experienceLevel: undefined,
          workMode: "remote" as const,
          location: d.address?.full || "Remote",
          city: d.address?.city || undefined,
          country: d.address?.country || undefined,
          timeCommitment: d.isFullTime ? "Full time" : "Part time",
          duration: d.startDate && d.endDate ? `${d.startDate} to ${d.endDate}` : undefined,
          projectType: "long-term",
          deadline: d.applicationDeadline ? new Date(d.applicationDeadline) : d.expires ? new Date(d.expires) : undefined,
          postedDate: d.firstPublished ? new Date(d.firstPublished) : undefined,
          compensationType: "paid",
          salary,
          isActive: true,
          scrapedAt: new Date(),
          updatedAt: new Date(),
        }

        // Upsert
        const existing = await collection.findOne({ sourceplatform: "idealist", externalId: doc.externalId })
        if (existing) {
          await collection.updateOne({ _id: existing._id }, { $set: { ...doc, updatedAt: new Date() } })
          updated++
        } else {
          await collection.insertOne(doc as any)
          inserted++
        }

        if (remoteJobs % 20 === 0) {
          console.log(`   🌍 Remote jobs so far: ${remoteJobs} (inserted: ${inserted}, updated: ${updated})`)
        }
      } catch (err) {
        // Non-fatal
      }
    }

    await sleep(300)
  }

  console.log("\n==========================================")
  console.log(`✅ Done!`)
  console.log(`   Total jobs listed: ${totalFetched}`)
  console.log(`   Remote jobs found: ${remoteJobs}`)
  console.log(`   New inserted: ${inserted}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Pages fetched: ${pageCount}`)
  console.log(`   Last cursor: ${since}`)
  console.log("==========================================")

  await client.close()
}

main().catch(err => { console.error("Fatal:", err); process.exit(1) })
