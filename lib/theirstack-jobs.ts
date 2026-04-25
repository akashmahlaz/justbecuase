// filepath: lib/theirstack-jobs.ts
// TheirStack jobs — MongoDB read layer

import { getDb } from "./database"

const COLLECTION_NAME = "theirstackJobs"

export interface TheirStackJobDoc {
  _id?: string
  theirstackId: number
  job_title: string
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
  url: string | null
  final_url: string | null
  date_posted: string | null
  country_code: string | null
  syncedAt: Date
}

export const theirstackJobsDb = {
  /** Upsert a batch of jobs (replaces all for a given sync run) */
  async upsertBatch(jobs: Omit<TheirStackJobDoc, "_id" | "syncedAt">[], syncedAt: Date) {
    if (jobs.length === 0) return { inserted: 0, replaced: 0 }
    const db = await getDb()
    const collection = db.collection<TheirStackJobDoc>(COLLECTION_NAME)

    let inserted = 0
    let replaced = 0

    for (const job of jobs) {
      const existing = await collection.findOne({ theirstackId: job.theirstackId })
      if (existing) {
        await collection.replaceOne({ _id: existing._id }, { ...job, syncedAt })
        replaced++
      } else {
        await collection.insertOne({ ...job, syncedAt } as TheirStackJobDoc)
        inserted++
      }
    }

    return { inserted, replaced }
  },

  /** Get the most recent sync timestamp */
  async getLastSync(): Promise<Date | null> {
    const db = await getDb()
    const collection = db.collection<TheirStackJobDoc>(COLLECTION_NAME)
    const latest = await collection.findOne({}, { sort: { syncedAt: -1 } })
    return latest?.syncedAt ?? null
  },

  /** Get all jobs, optionally filtered by country and remote */
  async findAll(filter: {
    country?: string
    remote?: boolean
    limit?: number
  } = {}): Promise<TheirStackJobDoc[]> {
    const db = await getDb()
    const collection = db.collection<TheirStackJobDoc>(COLLECTION_NAME)

    const query: Record<string, any> = {}
    if (filter.country) query.country_code = filter.country
    if (filter.remote !== undefined) query.remote = filter.remote

    return collection
      .find(query)
      .sort({ date_posted: -1 })
      .limit(filter.limit ?? 50)
      .toArray()
  },
}
