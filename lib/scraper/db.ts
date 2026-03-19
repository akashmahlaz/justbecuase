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

// ============================================
// EXTERNAL OPPORTUNITIES
// ============================================
export const externalOpportunitiesDb = {
  async upsert(opp: Omit<ExternalOpportunity, "_id">): Promise<{ isNew: boolean }> {
    const db = await getDb()
    const collection = db.collection<ExternalOpportunity>(COLLECTIONS.EXTERNAL_OPPORTUNITIES)

    const existing = await collection.findOne({
      sourceplatform: opp.sourceplatform,
      externalId: opp.externalId,
    })

    if (existing) {
      await collection.updateOne(
        { _id: existing._id },
        { $set: { ...opp, updatedAt: new Date() } }
      )
      return { isNew: false }
    }

    await collection.insertOne({
      ...opp,
      scrapedAt: new Date(),
      updatedAt: new Date(),
    } as ExternalOpportunity)
    return { isNew: true }
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
    await collection.updateOne(
      { platform: config.platform },
      { $set: { ...config, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
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
        enabled: true,
        cronSchedule: "0 4 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "5", jobTypes: "volunteer,internship" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "idealist",
        enabled: true,
        cronSchedule: "0 5 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "5" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "unjobs",
        enabled: true,
        cronSchedule: "0 6 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "3" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "devex",
        enabled: false,
        cronSchedule: "30 4 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "3", deepScrape: "true", maxDetailPages: "30" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "impactpool",
        enabled: false,
        cronSchedule: "30 5 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "3", deepScrape: "true", maxDetailPages: "25" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "workforgood",
        enabled: false,
        cronSchedule: "0 7 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "3", deepScrape: "true", maxDetailPages: "25" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        platform: "devnetjobs",
        enabled: false,
        cronSchedule: "30 7 * * *",
        totalItemsScraped: 0,
        settings: { maxPages: "3", deepScrape: "true", maxDetailPages: "20" },
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
