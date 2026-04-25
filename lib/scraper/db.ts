// ============================================
// Scraper Database Helpers
// ============================================

import { ObjectId, Filter } from "mongodb"
import { getDb } from "../database"
import type { ExternalOpportunity, ScraperRun, ScraperConfig, ScraperPlatform } from "./types"

const COLLECTIONS = {
  EXTERNAL_OPPORTUNITIES: "externalOpportunities",
  SCRAPER_RUNS: "scraperRuns",
  SCRAPER_CONFIGS: "scraperConfigs",
} as const

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function scoreExternalOpportunity(opp: ExternalOpportunity, query: string, terms: string[]): number {
  const title = opp.title || ""
  const organization = opp.organization || ""
  const shortDescription = opp.shortDescription || ""
  const description = opp.description || ""
  const skills = (opp.skillTags || []).join(" ")
  const location = [opp.location, opp.city, opp.country].filter(Boolean).join(" ")

  const titleLower = title.toLowerCase()
  const organizationLower = organization.toLowerCase()
  const shortLower = shortDescription.toLowerCase()
  const descriptionLower = description.toLowerCase()
  const skillsLower = skills.toLowerCase()
  const locationLower = location.toLowerCase()
  const queryLower = query.toLowerCase()

  let score = 0
  if (titleLower.includes(queryLower)) score += 120
  if (organizationLower.includes(queryLower)) score += 70
  if (shortLower.includes(queryLower)) score += 55
  if (descriptionLower.includes(queryLower)) score += 35

  for (const term of terms) {
    if (titleLower.includes(term)) score += 18
    if (organizationLower.includes(term)) score += 10
    if (shortLower.includes(term)) score += 8
    if (descriptionLower.includes(term)) score += 4
    if (skillsLower.includes(term)) score += 12
    if (locationLower.includes(term)) score += 6
  }

  if (opp.workMode === "remote") score += 10

  const postedDate = opp.postedDate ? new Date(opp.postedDate).getTime() : 0
  const ageInDays = postedDate > 0 ? (Date.now() - postedDate) / 86_400_000 : 365
  if (ageInDays <= 7) score += 10
  else if (ageInDays <= 30) score += 5

  return score
}

// ============================================
// EXTERNAL OPPORTUNITIES
// ============================================
export const externalOpportunitiesDb = {
  async upsert(opp: Omit<ExternalOpportunity, "_id">): Promise<{ isNew: boolean }> {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    const { scrapedAt, ...updateFields } = opp

    // Single round-trip upsert using MongoDB's native upsert
    const result = await collection.updateOne(
      { sourceplatform: opp.sourceplatform, externalId: opp.externalId },
      {
        $set: { ...updateFields, updatedAt: new Date() },
        $setOnInsert: { scrapedAt: scrapedAt ?? new Date() },
      },
      { upsert: true }
    )
    return { isNew: result.upsertedCount > 0 }
  },

  /** Bulk upsert — single round trip per item, much faster for high-volume syncs */
  async bulkUpsert(opps: Omit<ExternalOpportunity, "_id">[]): Promise<{ inserted: number; updated: number }> {
    if (opps.length === 0) return { inserted: 0, updated: 0 }
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)

    const ops = opps.map(opp => {
      const { scrapedAt, ...updateFields } = opp

      return {
        updateOne: {
          filter: { sourceplatform: opp.sourceplatform, externalId: opp.externalId },
          update: {
            $set: { ...updateFields, updatedAt: new Date() },
            $setOnInsert: { scrapedAt: scrapedAt ?? new Date() },
          },
          upsert: true,
        },
      }
    })

    const result = await collection.bulkWrite(ops, { ordered: false })
    return { inserted: result.upsertedCount || 0, updated: result.modifiedCount || 0 }
  },

  /** Update an existing opportunity with enriched detail-page data */
  async enrich(platform: ScraperPlatform, externalId: string, data: Partial<ExternalOpportunity>) {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    await collection.updateOne(
      { sourceplatform: platform, externalId },
      { $set: { ...data, updatedAt: new Date() } }
    )
  },

  async findByPlatform(platform: ScraperPlatform, limit = 50, skip = 0) {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    return collection
      .find({ sourceplatform: platform, isActive: true })
      .sort({ postedDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
  },

  async findAll(filter: Filter<ExternalOpportunity> = {}, limit = 50, skip = 0) {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    return collection
      .find({ isActive: true, ...filter })
      .sort({ scrapedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
  },

  async search(query: string, limit = 10) {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    const trimmed = query.trim()

    if (!trimmed) {
      return collection
        .find({ isActive: true, workMode: "remote" })
        .sort({ postedDate: -1, scrapedAt: -1 })
        .limit(limit)
        .toArray()
    }

    const terms = trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean)
      .slice(0, 8)

    const phraseRegex = new RegExp(escapeRegex(trimmed), "i")
    const termRegexes = terms.map((term) => new RegExp(escapeRegex(term), "i"))

    const fields = ["title", "organization", "shortDescription", "description", "skillTags", "location", "city", "country"]
    const orConditions: Filter<ExternalOpportunity>[] = fields.map((field) => ({ [field]: phraseRegex } as Filter<ExternalOpportunity>))
    for (const regex of termRegexes) {
      for (const field of fields) {
        orConditions.push({ [field]: regex } as Filter<ExternalOpportunity>)
      }
    }

    const candidates = await collection
      .find({
        isActive: true,
        workMode: "remote",
        $or: orConditions,
      })
      .sort({ postedDate: -1, scrapedAt: -1 })
      .limit(Math.max(limit * 8, 40))
      .toArray()

    return candidates
      .map((opp) => ({ opp, score: scoreExternalOpportunity(opp, trimmed, terms) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((entry) => entry.opp)
  },

  async count(filter: Filter<ExternalOpportunity> = {}) {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    return collection.countDocuments({ isActive: true, ...filter })
  },

  async countByPlatform(): Promise<Record<string, number>> {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    const results = await collection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$sourceplatform", count: { $sum: 1 } } },
    ]).toArray()
    const counts: Record<string, number> = {}
    for (const r of results) counts[r._id] = r.count
    return counts
  },

  async markInactive(platform: ScraperPlatform, olderThan: Date) {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    const result = await collection.updateMany(
      { sourceplatform: platform, updatedAt: { $lt: olderThan }, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    )
    return result.modifiedCount
  },

  async findById(id: string) {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    return collection.findOne({ _id: new ObjectId(id) } as any)
  },

  /** Purge all non-remote opportunities (delete onsite & hybrid) */
  async purgeNonRemote(): Promise<{ deleted: number; deactivated: number }> {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    // Hard delete non-remote active records
    const deleteResult = await collection.deleteMany({
      $or: [
        { workMode: { $ne: "remote" } },
        { workMode: { $exists: false } },
      ],
    })
    return { deleted: deleteResult.deletedCount, deactivated: 0 }
  },

  async ensureIndexes() {
    const db = await getDb()
    const collection = db.collection(COLLECTIONS.EXTERNAL_OPPORTUNITIES)
    await collection.createIndex({ sourceplatform: 1, externalId: 1 }, { unique: true })
    await collection.createIndex({ isActive: 1, scrapedAt: -1 })
    await collection.createIndex({ sourceplatform: 1, isActive: 1 })
    await collection.createIndex(
      { title: "text", description: "text", organization: "text", location: "text" },
      { name: "external_opp_text" }
    )
  },
}

// ============================================
// SCRAPER RUNS (audit log)
// ============================================
export const scraperRunsDb = {
  async create(run: Omit<ScraperRun, "_id">): Promise<string> {
    const db = await getDb()
    const collection = db.collection(COLLECTIONS.SCRAPER_RUNS)
    const result = await collection.insertOne(run)
    return result.insertedId.toString()
  },

  async update(id: string, updates: Partial<ScraperRun>) {
    const db = await getDb()
    const collection = db.collection(COLLECTIONS.SCRAPER_RUNS)
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updates })
  },

  async findRecent(limit = 20) {
    const db = await getDb()
    const collection = db.collection(COLLECTIONS.SCRAPER_RUNS)
    return collection.find().sort({ startedAt: -1 }).limit(limit).toArray()
  },

  async findByPlatform(platform: ScraperPlatform, limit = 10) {
    const db = await getDb()
    const collection = db.collection(COLLECTIONS.SCRAPER_RUNS)
    return collection.find({ platform }).sort({ startedAt: -1 }).limit(limit).toArray()
  },
}

// ============================================
// SCRAPER CONFIGS
// ============================================
export const scraperConfigsDb = {
  async getAll(): Promise<ScraperConfig[]> {
    const db = await getDb()
    const collection = db.collection<ScraperConfig>(COLLECTIONS.SCRAPER_CONFIGS)
    return collection.find().toArray()
  },

  async getByPlatform(platform: ScraperPlatform): Promise<ScraperConfig | null> {
    const db = await getDb()
    const collection = db.collection<ScraperConfig>(COLLECTIONS.SCRAPER_CONFIGS)
    return collection.findOne({ platform })
  },

  async upsert(config: Omit<ScraperConfig, "_id">) {
    const db = await getDb()
    const collection = db.collection<ScraperConfig>(COLLECTIONS.SCRAPER_CONFIGS)
    const { createdAt, ...updatableFields } = config

    await collection.updateOne(
      { platform: config.platform },
      {
        $set: { ...updatableFields, updatedAt: new Date() },
        $setOnInsert: { createdAt: createdAt || new Date() },
      },
      { upsert: true }
    )
  },

  async updateRunStatus(platform: ScraperPlatform, status: ScraperRun["status"], itemsScraped: number) {
    const db = await getDb()
    const collection = db.collection<ScraperConfig>(COLLECTIONS.SCRAPER_CONFIGS)
    await collection.updateOne(
      { platform },
      {
        $set: {
          lastRunAt: new Date(),
          lastRunStatus: status,
          updatedAt: new Date(),
        },
        $inc: { totalItemsScraped: itemsScraped },
      }
    )
  },

  async seedDefaults() {
    const defaults: Omit<ScraperConfig, "_id">[] = [
      {
        platform: "reliefweb",
        enabled: false,
        cronSchedule: "0 */2 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "500", deepScrape: "true", maxDetailPages: "200", jobTypes: "volunteer,internship,job" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "idealist",
        enabled: false,
        cronSchedule: "20 */2 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "400", deepScrape: "true", maxDetailPages: "200" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "unjobs",
        enabled: false,
        cronSchedule: "40 */2 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "400", deepScrape: "true", maxDetailPages: "200" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "devex",
        enabled: false,
        cronSchedule: "10 */2 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "200", deepScrape: "true", maxDetailPages: "200" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "impactpool",
        enabled: false,
        cronSchedule: "50 */2 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "300", deepScrape: "true", maxDetailPages: "200" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "workforgood",
        enabled: false,
        cronSchedule: "30 */2 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "150", deepScrape: "true", maxDetailPages: "150" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "devnetjobs",
        enabled: false,
        cronSchedule: "30 7 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "15", deepScrape: "true", maxDetailPages: "20" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    for (const config of defaults) {
      const db = await getDb()
      const collection = db.collection<ScraperConfig>(COLLECTIONS.SCRAPER_CONFIGS)
      const exists = await collection.findOne({ platform: config.platform })
      if (!exists) {
        await collection.insertOne(config as ScraperConfig)
      }
    }
  },
}
