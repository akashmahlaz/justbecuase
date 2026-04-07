#!/usr/bin/env npx tsx
// ============================================
// NGO Discovery Pipeline
// ============================================
// Finds NGOs that are URGENTLY & ACTIVELY hiring
// by cross-referencing multiple data sources.
//
// Usage:
//   npx tsx scripts/discover-hiring-ngos.ts
//   npx tsx scripts/discover-hiring-ngos.ts --days 7 --min-jobs 3
//   npx tsx scripts/discover-hiring-ngos.ts --export csv

import "dotenv/config"

// ============================================
// Config
// ============================================
const args = process.argv.slice(2)
const DAYS = parseInt(args.find((_, i, a) => a[i - 1] === "--days") ?? "30")
const MIN_JOBS = parseInt(args.find((_, i, a) => a[i - 1] === "--min-jobs") ?? "2")
const EXPORT_FORMAT = args.find((_, i, a) => a[i - 1] === "--export") as "csv" | "json" | undefined

interface DiscoveredNGO {
  name: string
  sources: string[]
  totalJobs: number
  jobsBySource: Record<string, number>
  roles: string[]
  countries: string[]
  categories: string[]
  urgencyScore: number // 0-100
  lastPosted: string | null
  contactHints: string[]
}

// ============================================
// Source 1: ReliefWeb API (FREE, unlimited)
// ============================================
async function fetchReliefWebNGOs(): Promise<Map<string, Partial<DiscoveredNGO>>> {
  const since = new Date(Date.now() - DAYS * 86400000).toISOString()
  const ngos = new Map<string, Partial<DiscoveredNGO>>()

  console.log(`  [ReliefWeb] Fetching humanitarian jobs posted since ${since.split("T")[0]}...`)

  // Paginate to get all results
  let offset = 0
  let total = 0
  const limit = 1000

  do {
    const url = new URL("https://api.reliefweb.int/v2/jobs")
    url.searchParams.set("appname", "JBCN1235UKsOWVihHUJtRzg5huGfMm")
    url.searchParams.set("limit", String(limit))
    url.searchParams.set("offset", String(offset))
    url.searchParams.append("sort[]", "date.created:desc")
    url.searchParams.append("fields[include][]", "title")
    url.searchParams.append("fields[include][]", "source.name")
    url.searchParams.append("fields[include][]", "source.shortname")
    url.searchParams.append("fields[include][]", "source.homepage")
    url.searchParams.append("fields[include][]", "date.created")
    url.searchParams.append("fields[include][]", "date.closing")
    url.searchParams.append("fields[include][]", "career_categories.name")
    url.searchParams.append("fields[include][]", "country.name")
    url.searchParams.set("filter[field]", "date.created")
    url.searchParams.set("filter[value][from]", since)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`ReliefWeb API error: ${res.status}`)
    const data = await res.json()
    total = data.totalCount

    for (const item of data.data) {
      const f = item.fields
      const sources = Array.isArray(f.source) ? f.source : [f.source]
      const orgName = sources[0]?.name
      if (!orgName) continue

      const existing = ngos.get(orgName) ?? {
        name: orgName,
        sources: ["reliefweb"],
        totalJobs: 0,
        jobsBySource: {},
        roles: [],
        countries: [],
        categories: [],
        contactHints: [],
      }

      existing.totalJobs = (existing.totalJobs ?? 0) + 1
      existing.jobsBySource = existing.jobsBySource ?? {}
      existing.jobsBySource.reliefweb = (existing.jobsBySource.reliefweb ?? 0) + 1

      // Track roles
      if (f.title && !(existing.roles ?? []).includes(f.title)) {
        existing.roles = [...(existing.roles ?? []), f.title].slice(0, 10)
      }

      // Track countries
      const countries = Array.isArray(f.country) ? f.country : f.country ? [f.country] : []
      for (const c of countries) {
        if (c.name && !(existing.countries ?? []).includes(c.name)) {
          existing.countries = [...(existing.countries ?? []), c.name]
        }
      }

      // Track categories
      const cats = Array.isArray(f.career_categories) ? f.career_categories : f.career_categories ? [f.career_categories] : []
      for (const cat of cats) {
        if (cat.name && !(existing.categories ?? []).includes(cat.name)) {
          existing.categories = [...(existing.categories ?? []), cat.name]
        }
      }

      // Website hint
      const homepage = sources[0]?.homepage
      if (homepage && !(existing.contactHints ?? []).includes(homepage)) {
        existing.contactHints = [...(existing.contactHints ?? []), homepage]
      }

      // Track latest post date
      if (f.date?.created) {
        if (!existing.lastPosted || f.date.created > existing.lastPosted) {
          existing.lastPosted = f.date.created
        }
      }

      ngos.set(orgName, existing)
    }

    offset += limit
    console.log(`  [ReliefWeb] Fetched ${Math.min(offset, total)}/${total} jobs...`)
  } while (offset < total)

  console.log(`  [ReliefWeb] Found ${ngos.size} unique organizations from ${total} jobs\n`)
  return ngos
}

// ============================================
// Source 2: TheirStack API (preview/blur mode = FREE)
// ============================================
async function fetchTheirStackNGOs(): Promise<Map<string, Partial<DiscoveredNGO>>> {
  const token = process.env.THEIRSTACK_API_KEY
  if (!token) {
    console.log("  [TheirStack] Skipped - THEIRSTACK_API_KEY not set\n")
    return new Map()
  }

  console.log(`  [TheirStack] Searching for nonprofit employers (last ${DAYS} days)...`)
  const ngos = new Map<string, Partial<DiscoveredNGO>>()

  const body = {
    page: 0,
    limit: 50,
    posted_at_max_age_days: DAYS,
    job_description_contains_or: [
      "volunteer", "nonprofit", "ngo", "humanitarian",
      "social impact", "community development", "civil society",
      "charity", "foundation", "volunteer management",
    ],
    company_description_pattern_or: [
      "nonprofit", "non-profit", "ngo", "charity", "foundation",
      "humanitarian", "social impact", "community development",
      "civil society", "social enterprise",
    ],
    company_type: "direct_employer" as const,
    include_total_results: true,
    blur_company_data: true, // FREE mode - no credits consumed
  }

  const res = await fetch("https://api.theirstack.com/v1/jobs/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const err = await res.text()
    console.log(`  [TheirStack] API error ${res.status}: ${err}\n`)
    return ngos
  }

  const data = await res.json()
  console.log(`  [TheirStack] Total matching: ${data.metadata?.total_results} jobs from ${data.metadata?.total_companies} companies`)

  for (const job of data.data ?? []) {
    const orgName = job.company
    if (!orgName) continue

    const existing = ngos.get(orgName) ?? {
      name: orgName,
      sources: ["theirstack"],
      totalJobs: 0,
      jobsBySource: {},
      roles: [],
      countries: [],
      categories: [],
      contactHints: [],
    }

    existing.totalJobs = (existing.totalJobs ?? 0) + 1
    existing.jobsBySource = existing.jobsBySource ?? {}
    existing.jobsBySource.theirstack = (existing.jobsBySource.theirstack ?? 0) + 1

    if (job.job_title && !(existing.roles ?? []).includes(job.job_title)) {
      existing.roles = [...(existing.roles ?? []), job.job_title].slice(0, 10)
    }

    if (job.location) {
      const loc = job.location
      if (!(existing.countries ?? []).includes(loc)) {
        existing.countries = [...(existing.countries ?? []), loc]
      }
    }

    if (job.date_posted) {
      if (!existing.lastPosted || job.date_posted > existing.lastPosted) {
        existing.lastPosted = job.date_posted
      }
    }

    ngos.set(orgName, existing)
  }

  console.log(`  [TheirStack] Found ${ngos.size} unique organizations (blurred names in free mode)\n`)
  return ngos
}

// ============================================
// Source 3: Idealist API (if key available)
// ============================================
async function fetchIdealistNGOs(): Promise<Map<string, Partial<DiscoveredNGO>>> {
  const apiKey = process.env.IDEALIST_API_KEY
  if (!apiKey) {
    console.log("  [Idealist] Skipped - IDEALIST_API_KEY not set\n")
    return new Map()
  }

  console.log(`  [Idealist] Fetching remote NGO jobs...`)
  const ngos = new Map<string, Partial<DiscoveredNGO>>()

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64")
    const res = await fetch("https://www.idealist.org/api/v1/listings/jobs?limit=200", {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      console.log(`  [Idealist] API error ${res.status}\n`)
      return ngos
    }

    const data = await res.json()
    const jobs = Array.isArray(data) ? data : data.listings ?? data.data ?? []

    for (const job of jobs) {
      const orgName = job.org?.name ?? job.organization?.name
      if (!orgName) continue

      const existing = ngos.get(orgName) ?? {
        name: orgName,
        sources: ["idealist"],
        totalJobs: 0,
        jobsBySource: {},
        roles: [],
        countries: [],
        categories: [],
        contactHints: [],
      }

      existing.totalJobs = (existing.totalJobs ?? 0) + 1
      existing.jobsBySource = existing.jobsBySource ?? {}
      existing.jobsBySource.idealist = (existing.jobsBySource.idealist ?? 0) + 1

      if (job.name && !(existing.roles ?? []).includes(job.name)) {
        existing.roles = [...(existing.roles ?? []), job.name].slice(0, 10)
      }

      // Areas of focus as categories
      const areas = job.org?.areasOfFocus ?? []
      for (const area of areas) {
        const areaName = typeof area === "string" ? area : area.name ?? area
        if (areaName && !(existing.categories ?? []).includes(String(areaName))) {
          existing.categories = [...(existing.categories ?? []), String(areaName)]
        }
      }

      ngos.set(orgName, existing)
    }

    console.log(`  [Idealist] Found ${ngos.size} unique organizations\n`)
  } catch (err) {
    console.log(`  [Idealist] Error: ${err}\n`)
  }

  return ngos
}

// ============================================
// Urgency Scoring
// ============================================
function calculateUrgencyScore(ngo: DiscoveredNGO): number {
  let score = 0

  // Job volume (0-40 points)
  score += Math.min(ngo.totalJobs * 4, 40)

  // Multi-source presence (0-20 points)
  score += ngo.sources.length * 10

  // Recency (0-20 points)
  if (ngo.lastPosted) {
    const daysAgo = (Date.now() - new Date(ngo.lastPosted).getTime()) / 86400000
    if (daysAgo <= 3) score += 20
    else if (daysAgo <= 7) score += 15
    else if (daysAgo <= 14) score += 10
    else score += 5
  }

  // Geographic spread (0-10 points) - more countries = larger operation
  score += Math.min(ngo.countries.length * 2, 10)

  // Role diversity (0-10 points) - many different roles = scaling up
  score += Math.min(ngo.roles.length, 10)

  return Math.min(score, 100)
}

// ============================================
// Merge & Deduplicate
// ============================================
function mergeResults(...sources: Map<string, Partial<DiscoveredNGO>>[]): DiscoveredNGO[] {
  const merged = new Map<string, DiscoveredNGO>()

  for (const source of sources) {
    for (const [name, data] of source) {
      const normalizedName = name.trim()
      const existing = merged.get(normalizedName)

      if (existing) {
        // Merge
        existing.totalJobs += data.totalJobs ?? 0
        for (const [src, count] of Object.entries(data.jobsBySource ?? {})) {
          existing.jobsBySource[src] = (existing.jobsBySource[src] ?? 0) + count
        }
        for (const s of data.sources ?? []) {
          if (!existing.sources.includes(s)) existing.sources.push(s)
        }
        for (const r of data.roles ?? []) {
          if (!existing.roles.includes(r)) existing.roles.push(r)
        }
        for (const c of data.countries ?? []) {
          if (!existing.countries.includes(c)) existing.countries.push(c)
        }
        for (const cat of data.categories ?? []) {
          if (!existing.categories.includes(cat)) existing.categories.push(cat)
        }
        for (const h of data.contactHints ?? []) {
          if (!existing.contactHints.includes(h)) existing.contactHints.push(h)
        }
        if (data.lastPosted && (!existing.lastPosted || data.lastPosted > existing.lastPosted)) {
          existing.lastPosted = data.lastPosted
        }
      } else {
        merged.set(normalizedName, {
          name: normalizedName,
          sources: data.sources ?? [],
          totalJobs: data.totalJobs ?? 0,
          jobsBySource: data.jobsBySource ?? {},
          roles: (data.roles ?? []).slice(0, 10),
          countries: data.countries ?? [],
          categories: data.categories ?? [],
          urgencyScore: 0,
          lastPosted: data.lastPosted ?? null,
          contactHints: data.contactHints ?? [],
        })
      }
    }
  }

  // Calculate urgency scores
  const results = Array.from(merged.values())
  for (const ngo of results) {
    ngo.urgencyScore = calculateUrgencyScore(ngo)
  }

  return results
    .filter(n => n.totalJobs >= MIN_JOBS)
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
}

// ============================================
// Output
// ============================================
function printResults(ngos: DiscoveredNGO[]) {
  console.log("=".repeat(70))
  console.log(`  TOP ${Math.min(ngos.length, 50)} ACTIVELY HIRING NGOs (urgency-ranked)`)
  console.log(`  Period: Last ${DAYS} days | Min jobs: ${MIN_JOBS}`)
  console.log("=".repeat(70))
  console.log()

  for (let i = 0; i < Math.min(ngos.length, 50); i++) {
    const n = ngos[i]
    const sourceStr = n.sources.join("+")
    const urgencyBar = "█".repeat(Math.floor(n.urgencyScore / 10)) + "░".repeat(10 - Math.floor(n.urgencyScore / 10))
    
    console.log(`${(i + 1).toString().padStart(2)}. ${n.name}`)
    console.log(`    Urgency: [${urgencyBar}] ${n.urgencyScore}/100`)
    console.log(`    Jobs: ${n.totalJobs} total (${Object.entries(n.jobsBySource).map(([k, v]) => `${k}: ${v}`).join(", ")})`)
    console.log(`    Sources: ${sourceStr}`)
    if (n.categories.length) console.log(`    Sectors: ${n.categories.slice(0, 5).join(", ")}`)
    if (n.countries.length) console.log(`    Countries: ${n.countries.slice(0, 6).join(", ")}`)
    if (n.roles.length) console.log(`    Sample roles: ${n.roles.slice(0, 3).join(" | ")}`)
    if (n.contactHints.length) console.log(`    Website: ${n.contactHints[0]}`)
    if (n.lastPosted) console.log(`    Last posted: ${n.lastPosted.split("T")[0]}`)
    console.log()
  }

  // Summary stats
  console.log("=".repeat(70))
  console.log("  SUMMARY")
  console.log("=".repeat(70))
  console.log(`  Total NGOs found: ${ngos.length} (with ${MIN_JOBS}+ jobs)`)
  console.log(`  High urgency (70+): ${ngos.filter(n => n.urgencyScore >= 70).length}`)
  console.log(`  Medium urgency (40-69): ${ngos.filter(n => n.urgencyScore >= 40 && n.urgencyScore < 70).length}`)
  console.log(`  Low urgency (<40): ${ngos.filter(n => n.urgencyScore < 40).length}`)
  console.log(`  Total open positions tracked: ${ngos.reduce((s, n) => s + n.totalJobs, 0)}`)
  console.log()
}

function exportCSV(ngos: DiscoveredNGO[]) {
  const header = "Rank,NGO Name,Urgency Score,Total Jobs,Sources,Sectors,Countries,Website,Last Posted"
  const rows = ngos.map((n, i) =>
    [
      i + 1,
      `"${n.name.replace(/"/g, '""')}"`,
      n.urgencyScore,
      n.totalJobs,
      n.sources.join("+"),
      `"${n.categories.slice(0, 5).join("; ")}"`,
      `"${n.countries.slice(0, 5).join("; ")}"`,
      n.contactHints[0] ?? "",
      n.lastPosted?.split("T")[0] ?? "",
    ].join(",")
  )
  const csv = [header, ...rows].join("\n")
  const fs = require("fs")
  const path = `discovered-ngos-${new Date().toISOString().split("T")[0]}.csv`
  fs.writeFileSync(path, csv)
  console.log(`Exported to ${path}`)
}

function exportJSON(ngos: DiscoveredNGO[]) {
  const fs = require("fs")
  const path = `discovered-ngos-${new Date().toISOString().split("T")[0]}.json`
  fs.writeFileSync(path, JSON.stringify(ngos, null, 2))
  console.log(`Exported to ${path}`)
}

// ============================================
// Main
// ============================================
async function main() {
  console.log("\n🔍 NGO DISCOVERY PIPELINE")
  console.log(`   Scanning ${3} data sources for actively-hiring NGOs...\n`)

  const [reliefweb, theirstack, idealist] = await Promise.all([
    fetchReliefWebNGOs(),
    fetchTheirStackNGOs(),
    fetchIdealistNGOs(),
  ])

  const results = mergeResults(reliefweb, theirstack, idealist)

  printResults(results)

  if (EXPORT_FORMAT === "csv") exportCSV(results)
  if (EXPORT_FORMAT === "json") exportJSON(results)
}

main().catch(console.error)
