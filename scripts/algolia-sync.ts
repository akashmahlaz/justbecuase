/**
 * Algolia Full Sync Script
 * 
 * Syncs all MongoDB data → Algolia indexes.
 * Run: npx tsx scripts/algolia-sync.ts
 * 
 * Steps:
 * 1. Configures index settings (searchable attributes, facets, ranking)
 * 2. Pushes synonyms
 * 3. Syncs all volunteers, NGOs, and opportunities
 */

import { MongoClient } from "mongodb"
import { algoliasearch } from "algoliasearch"
import {
  ALGOLIA_INDEXES,
  getVolunteerIndexSettings,
  getNGOIndexSettings,
  getOpportunityIndexSettings,
  getSynonymGroups,
  transformVolunteerRecord,
  transformNGORecord,
  transformOpportunityRecord,
} from "../lib/algolia"

// Load env vars
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || ""
const DB_NAME = process.env.MONGODB_DB || "justbecause"
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || ""
const ALGOLIA_WRITE_KEY = process.env.ALGOLIA_WRITE_KEY || ""

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set")
  process.exit(1)
}
if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_KEY) {
  console.error("❌ Algolia credentials not set (NEXT_PUBLIC_ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY)")
  process.exit(1)
}

const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY)
const mongo = new MongoClient(MONGODB_URI)

async function configureIndexSettings() {
  console.log("\n📋 Configuring index settings...")

  // Volunteers
  await algolia.setSettings({
    indexName: ALGOLIA_INDEXES.VOLUNTEERS,
    indexSettings: getVolunteerIndexSettings(),
  })
  console.log(`  ✅ ${ALGOLIA_INDEXES.VOLUNTEERS} settings configured`)

  // NGOs
  await algolia.setSettings({
    indexName: ALGOLIA_INDEXES.NGOS,
    indexSettings: getNGOIndexSettings(),
  })
  console.log(`  ✅ ${ALGOLIA_INDEXES.NGOS} settings configured`)

  // Opportunities
  await algolia.setSettings({
    indexName: ALGOLIA_INDEXES.OPPORTUNITIES,
    indexSettings: getOpportunityIndexSettings(),
  })
  console.log(`  ✅ ${ALGOLIA_INDEXES.OPPORTUNITIES} settings configured`)
}

async function pushSynonyms() {
  console.log("\n🔗 Pushing synonyms...")
  const synonyms = getSynonymGroups()

  for (const indexName of Object.values(ALGOLIA_INDEXES)) {
    await algolia.saveSynonyms({
      indexName,
      synonymHit: synonyms,
      forwardToReplicas: false,
      replaceExistingSynonyms: true,
    })
    console.log(`  ✅ ${synonyms.length} synonyms pushed to ${indexName}`)
  }
}

async function syncVolunteers(db: any) {
  console.log("\n👤 Syncing volunteers...")
  const cursor = db.collection("user").find({
    role: "volunteer",
    isOnboarded: true,
    isBanned: { $ne: true },
  })

  const batch: Record<string, any>[] = []
  let total = 0

  for await (const doc of cursor) {
    // Skip private users
    if (doc.privacy?.showInSearch === false) continue
    batch.push(transformVolunteerRecord(doc))
    if (batch.length >= 1000) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.VOLUNTEERS, objects: batch })
      total += batch.length
      console.log(`  📤 Sent ${total} volunteers...`)
      batch.length = 0
    }
  }

  if (batch.length > 0) {
    await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.VOLUNTEERS, objects: batch })
    total += batch.length
  }
  console.log(`  ✅ ${total} volunteers synced`)
}

async function syncNGOs(db: any) {
  console.log("\n🏢 Syncing NGOs...")
  const cursor = db.collection("user").find({
    role: "ngo",
    isOnboarded: true,
    isBanned: { $ne: true },
  })

  const batch: Record<string, any>[] = []
  let total = 0

  for await (const doc of cursor) {
    if (doc.privacy?.showInSearch === false) continue
    batch.push(transformNGORecord(doc))
    if (batch.length >= 1000) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.NGOS, objects: batch })
      total += batch.length
      console.log(`  📤 Sent ${total} NGOs...`)
      batch.length = 0
    }
  }

  if (batch.length > 0) {
    await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.NGOS, objects: batch })
    total += batch.length
  }
  console.log(`  ✅ ${total} NGOs synced`)
}

async function syncOpportunities(db: any) {
  console.log("\n💼 Syncing opportunities...")

  // Build NGO name lookup
  const ngoNameMap = new Map<string, string>()
  const ngos = await db.collection("user").find(
    { role: "ngo" },
    { projection: { _id: 1, organizationName: 1, orgName: 1, name: 1 } }
  ).toArray()
  for (const ngo of ngos) {
    ngoNameMap.set(ngo._id.toString(), ngo.organizationName || ngo.orgName || ngo.name || "")
  }

  const cursor = db.collection("projects").find({
    status: { $in: ["open", "active"] },
  })

  const batch: Record<string, any>[] = []
  let total = 0

  for await (const doc of cursor) {
    const ngoName = ngoNameMap.get(doc.ngoId?.toString() || doc.ngoProfileId?.toString() || "")
    batch.push(transformOpportunityRecord(doc, ngoName))
    if (batch.length >= 1000) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.OPPORTUNITIES, objects: batch })
      total += batch.length
      console.log(`  📤 Sent ${total} opportunities...`)
      batch.length = 0
    }
  }

  if (batch.length > 0) {
    await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.OPPORTUNITIES, objects: batch })
    total += batch.length
  }
  console.log(`  ✅ ${total} opportunities synced`)
}

async function main() {
  console.log("🚀 Algolia Full Sync")
  console.log(`   App ID: ${ALGOLIA_APP_ID}`)
  console.log(`   DB: ${DB_NAME}`)

  try {
    // Step 1: Configure indexes
    await configureIndexSettings()

    // Step 2: Push synonyms
    await pushSynonyms()

    // Step 3: Connect to MongoDB and sync data
    await mongo.connect()
    const db = mongo.db(DB_NAME)

    await syncVolunteers(db)
    await syncNGOs(db)
    await syncOpportunities(db)

    console.log("\n✅ Full sync complete!")
  } catch (err) {
    console.error("\n❌ Sync failed:", err)
    process.exit(1)
  } finally {
    await mongo.close()
  }
}

main()
