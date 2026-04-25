import { MongoClient } from "mongodb"

const apiKey = process.env.THEIRSTACK_API_KEY2 || process.env.THEIRSTACK_API_KEY
const mongoUri = process.env.MONGODB_URI
const maxJobs = Number(process.env.THEIRSTACK_VERIFY_MAX_JOBS || "3")

if (!apiKey) throw new Error("THEIRSTACK_API_KEY2 or THEIRSTACK_API_KEY not set")
if (!mongoUri) throw new Error("MONGODB_URI not set")

function mapTheirStackSkills(job) {
  const titleAndTags = [job.job_title, ...(job.technology_slugs ?? [])].filter(Boolean).join(" ").toLowerCase()
  const description = (job.description || "").toLowerCase()
  const text = `${titleAndTags} ${description}`
  const matches = []
  const add = (categoryId, subskillId) => {
    if (!matches.some((skill) => skill.subskillId === subskillId)) {
      matches.push({ categoryId, subskillId, priority: "nice-to-have" })
    }
  }

  if (/\b(react|next\.?js)\b/.test(titleAndTags)) add("website", "react-nextjs")
  if (/\bnode\.?js\b/.test(titleAndTags)) add("website", "nodejs-backend")
  if (/\b(web\s*(developer|development|application|app|platform|portal|site|design)|website|front\s*-?\s*end|back\s*-?\s*end|full\s*-?\s*stack)\b/.test(titleAndTags)) add("website", "react-nextjs")
  if (/\b(data\s*(analysis|analytics?|analyst)|analytics?|data-analytics|data-analysis|data-analyst|data-science)\b/.test(titleAndTags)) add("data-technology", "data-analysis")
  if (/\b(data\s*visualization|tableau|power\s*bi|looker)\b/.test(titleAndTags)) add("data-technology", "data-visualization")
  if (/\b(ai-ml|artificial-intelligence|machine-learning|machine\s+learning|\bai\b|\bml\b)\b/.test(titleAndTags)) add("data-technology", "ai-ml")
  if (/\bit\s*support\b|\binformation\s*technology\b/.test(titleAndTags)) add("data-technology", "it-support")
  if (/\bcybersecurity\b/.test(titleAndTags) || /\bcybersecurity\b/.test(description)) add("data-technology", "cybersecurity")

  return matches
}

const query = {
  page: 0,
  limit: maxJobs,
  posted_at_max_age_days: 30,
  company_type: "direct_employer",
  industry_id_or: [70, 74, 78, 81, 84, 99, 101, 139, 141],
  company_description_pattern_or: [
    "nonprofit",
    "non-profit",
    "ngo",
    "charity",
    "foundation",
    "humanitarian",
    "social impact",
    "community development",
    "civil society",
    "social enterprise",
  ],
  company_description_pattern_not: [
    "research institute",
    "laboratory",
    "university",
    "college",
    "hospital",
    "government agency",
    "agency for science",
    "defense",
  ],
  job_description_contains_or: [
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
  ],
  remote: true,
  property_exists_or: ["hiring_team"],
  include_total_results: false,
  blur_company_data: false,
}

function mapJob(job) {
  const description = job.description || job.job_title
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
    skillTags: (job.technology_slugs ?? []).slice(0, 10),
    skillsRequired: mapTheirStackSkills(job),
    experienceLevel: job.seniority || undefined,
    workMode: job.remote ? "remote" : job.hybrid ? "hybrid" : "onsite",
    location: job.location || (job.remote ? "Remote" : undefined),
    city: undefined,
    country: undefined,
    timeCommitment: (job.employment_statuses ?? []).includes("full-time") ? "40+ hours" : "25-40 hours",
    duration: undefined,
    projectType: "long-term",
    deadline: undefined,
    postedDate: job.date_posted ? new Date(job.date_posted) : new Date(),
    compensationType: "paid",
    salary: job.salary_string || undefined,
    bodyHtml: undefined,
    howToApplyHtml: undefined,
    isActive: true,
    updatedAt: new Date(),
  }
}

const response = await fetch("https://api.theirstack.com/v1/jobs/search", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(query),
  signal: AbortSignal.timeout(30000),
})

if (!response.ok) {
  const errorText = await response.text()
  throw new Error(`TheirStack ${response.status}: ${errorText}`)
}

const payload = await response.json()
const jobs = payload.data ?? []
console.log(`Fetched ${jobs.length} TheirStack jobs`) 

const client = await MongoClient.connect(mongoUri)
const db = client.db()
const collection = db.collection("externalOpportunities")
const now = new Date()

const operations = jobs.map((job) => ({
  updateOne: {
    filter: { sourceplatform: "theirstack", externalId: String(job.id) },
    update: {
      $set: { ...mapJob(job), updatedAt: now },
      $setOnInsert: { scrapedAt: now },
    },
    upsert: true,
  },
}))

const result = operations.length
  ? await collection.bulkWrite(operations, { ordered: false })
  : { upsertedCount: 0, modifiedCount: 0 }

console.log(JSON.stringify({ inserted: result.upsertedCount || 0, updated: result.modifiedCount || 0 }))

await client.close()
