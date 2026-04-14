import { MongoClient } from "mongodb"
import { readFileSync } from "fs"

// Load env
const envContent = readFileSync(".env.local", "utf-8")
for (const line of envContent.split("\n")) {
  const eqIdx = line.indexOf("=")
  if (eqIdx > 0 && !line.trimStart().startsWith("#")) {
    process.env[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim()
  }
}

const API_KEY = process.env.THEIRSTACK_API_KEY
const MONGO_URI = process.env.MONGODB_URI

async function run() {
  const mongo = await MongoClient.connect(MONGO_URI)
  const db = mongo.db("justbecause")
  const col = db.collection("externalOpportunities")

  console.log("=== STARTING FULL NGO SYNC (Production Key) ===")

  const allJobs = []
  let totalAvailable = null
  let page = 0
  const PAGE_SIZE = 25
  const MAX_CREDITS = 1600 // keep 100 reserve from 1700

  while (allJobs.length < MAX_CREDITS) {
    const query = {
      page,
      limit: PAGE_SIZE,
      posted_at_max_age_days: 30,
      company_type: "direct_employer",
      company_description_pattern_or: [
        "nonprofit organization", "non-profit organization",
        "nongovernmental", "non-governmental",
        "humanitarian aid", "humanitarian organization",
        "charitable organization", "international development",
        "social enterprise", "civil society organization",
      ],
      company_description_pattern_not: [
        "research institute", "laboratory", "university",
        "college", "hospital", "government agency",
        "agency for science", "defense",
      ],
      remote: true,
      include_total_results: page === 0,
      blur_company_data: false,
    }

    const res = await fetch("https://api.theirstack.com/v1/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.log(`Stopped at page ${page}: ${res.status}`, JSON.stringify(err))
      break
    }

    const data = await res.json()
    if (page === 0) {
      totalAvailable = data.metadata?.total_results
      console.log("Total NGO remote jobs available:", totalAvailable)
    }

    const jobs = data.data || []
    if (jobs.length === 0) break
    allJobs.push(...jobs)

    if (page % 10 === 0) console.log(`  Page ${page} | Fetched: ${allJobs.length}`)
    page++

    if (jobs.length < PAGE_SIZE) break
    if (allJobs.length >= (totalAvailable || Infinity)) break
  }

  console.log(`\nFetch complete: ${allJobs.length} jobs in ${page} pages`)

  // Deduplicate
  const unique = new Map()
  for (const job of allJobs) unique.set(job.id, job)
  const uniqueJobs = [...unique.values()]
  console.log("Unique jobs:", uniqueJobs.length)

  // Upsert into MongoDB
  let inserted = 0
  let updated = 0
  const now = new Date()

  for (const job of uniqueJobs) {
    const workMode = job.remote ? "remote" : job.hybrid ? "hybrid" : "onsite"
    const location = job.location || (workMode === "remote" ? "Remote" : undefined)
    const desc = (job.description || job.job_title).slice(0, 5000)

    const doc = {
      sourceplatform: "theirstack",
      externalId: String(job.id),
      sourceUrl: job.final_url || job.url || "",
      title: job.job_title,
      description: desc,
      shortDescription: desc.slice(0, 300),
      organization: job.company,
      organizationUrl: job.company_domain ? `https://${job.company_domain}` : undefined,
      causes: [],
      skillTags: (job.technology_slugs || []).slice(0, 10),
      skillsRequired: (job.technology_slugs || []).slice(0, 5).map((t) => ({
        categoryId: "technology",
        subskillId: t,
        priority: "nice-to-have",
      })),
      experienceLevel: job.seniority || undefined,
      workMode,
      location,
      timeCommitment: (job.employment_statuses || []).includes("full-time")
        ? "40+ hours"
        : "25-40 hours",
      projectType: "long-term",
      compensationType: "paid",
      salary: job.salary_string || undefined,
      postedDate: job.date_posted ? new Date(job.date_posted) : now,
      isActive: true,
      scrapedAt: now,
      updatedAt: now,
    }

    const existing = await col.findOne({
      sourceplatform: "theirstack",
      externalId: doc.externalId,
    })
    if (existing) {
      await col.updateOne({ _id: existing._id }, { $set: { ...doc, updatedAt: now } })
      updated++
    } else {
      await col.insertOne(doc)
      inserted++
    }
  }

  console.log("\n=== MONGODB RESULTS ===")
  console.log("Inserted:", inserted)
  console.log("Updated:", updated)
  console.log("Total synced:", inserted + updated)

  // Company breakdown
  const companies = new Map()
  for (const job of uniqueJobs) {
    const key = job.company_domain || job.company
    if (!companies.has(key))
      companies.set(key, { name: job.company, domain: job.company_domain, count: 0 })
    companies.get(key).count++
  }
  const sorted = [...companies.values()].sort((a, b) => b.count - a.count)
  console.log("\nUnique NGOs:", companies.size)
  console.log("\n=== TOP 30 HIRING NGOs ===")
  for (const c of sorted.slice(0, 30)) {
    console.log(`  ${c.count} jobs | ${c.name}${c.domain ? ` (${c.domain})` : ""}`)
  }

  // Credit check
  const balRes = await fetch("https://api.theirstack.com/v0/billing/credit-balance", {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  const bal = await balRes.json()
  console.log("\n=== CREDITS AFTER SYNC ===")
  console.log(
    `Used: ${bal.used_api_credits} / ${bal.api_credits} | Remaining: ${bal.api_credits - bal.used_api_credits}`
  )

  // Platform totals
  const breakdown = await col
    .aggregate([
      { $group: { _id: "$sourceplatform", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray()
  console.log("\n=== TOTAL PLATFORM JOB COUNTS ===")
  let total = 0
  for (const r of breakdown) {
    console.log(`  ${r._id}: ${r.count}`)
    total += r.count
  }
  console.log(`  TOTAL: ${total}`)

  await mongo.close()
}

run().catch(console.error)
