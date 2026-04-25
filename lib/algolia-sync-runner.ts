/**
 * Algolia Full Sync Runner
 *
 * Atomically replaces every Algolia index from MongoDB so that stale
 * records (role-changed users, deleted accounts, banned users, closed
 * projects, etc.) are dropped on every run. Uses `replaceAllObjects`
 * which creates a temporary index and atomic-swaps it in — no read
 * downtime and no orphaned objects.
 *
 * Used by:
 *   - scripts/algolia-sync.ts  (manual CLI)
 *   - app/api/cron/algolia-sync/route.ts  (daily Vercel cron)
 */

import { getDb } from "@/lib/database"
import { getAlgoliaAdminClient } from "@/lib/algolia"
import {
  ALGOLIA_INDEXES,
  getVolunteerIndexSettings,
  getNGOIndexSettings,
  getOpportunityIndexSettings,
  getSynonymGroups,
  transformVolunteerRecord,
  transformNGORecord,
  transformOpportunityRecord,
} from "@/lib/algolia"

export interface AlgoliaSyncResult {
  volunteers: number
  ngos: number
  opportunities: number
  durationMs: number
}

async function configureIndexSettings(client: ReturnType<typeof getAlgoliaAdminClient>) {
  await Promise.all([
    client.setSettings({
      indexName: ALGOLIA_INDEXES.VOLUNTEERS,
      indexSettings: getVolunteerIndexSettings(),
    }),
    client.setSettings({
      indexName: ALGOLIA_INDEXES.NGOS,
      indexSettings: getNGOIndexSettings(),
    }),
    client.setSettings({
      indexName: ALGOLIA_INDEXES.OPPORTUNITIES,
      indexSettings: getOpportunityIndexSettings(),
    }),
  ])
}

async function pushSynonyms(client: ReturnType<typeof getAlgoliaAdminClient>) {
  const synonyms = getSynonymGroups()
  await Promise.all(
    Object.values(ALGOLIA_INDEXES).map((indexName) =>
      client.saveSynonyms({
        indexName,
        synonymHit: synonyms,
        forwardToReplicas: false,
        replaceExistingSynonyms: true,
      })
    )
  )
}

async function collectVolunteers(db: any): Promise<Record<string, any>[]> {
  const cursor = db.collection("user").find({
    role: "volunteer",
    isOnboarded: true,
    isBanned: { $ne: true },
  })
  const out: Record<string, any>[] = []
  for await (const doc of cursor) {
    if (doc.privacy?.showInSearch === false) continue
    out.push(transformVolunteerRecord(doc))
  }
  return out
}

async function collectNGOs(db: any): Promise<Record<string, any>[]> {
  const cursor = db.collection("user").find({
    role: "ngo",
    isOnboarded: true,
    isBanned: { $ne: true },
  })
  const out: Record<string, any>[] = []
  for await (const doc of cursor) {
    if (doc.privacy?.showInSearch === false) continue
    out.push(transformNGORecord(doc))
  }
  return out
}

async function collectOpportunities(db: any): Promise<Record<string, any>[]> {
  // NGO name lookup (handles both ObjectId and string _id)
  const ngoNameMap = new Map<string, string>()
  const ngos = await db
    .collection("user")
    .find(
      { role: "ngo" },
      { projection: { _id: 1, organizationName: 1, orgName: 1, name: 1 } }
    )
    .toArray()
  for (const ngo of ngos) {
    ngoNameMap.set(ngo._id.toString(), ngo.organizationName || ngo.orgName || ngo.name || "")
  }

  const cursor = db.collection("projects").find({
    status: { $in: ["open", "active"] },
  })
  const out: Record<string, any>[] = []
  for await (const doc of cursor) {
    const ngoName = ngoNameMap.get(doc.ngoId?.toString() || doc.ngoProfileId?.toString() || "")
    out.push(transformOpportunityRecord(doc, ngoName))
  }
  return out
}

/**
 * Run a full atomic sync from MongoDB → Algolia.
 *
 * Uses `replaceAllObjects` so stale records (ex-volunteers, banned
 * users, closed projects) are automatically removed — no manual
 * cleanup pass required.
 */
export async function runAlgoliaFullSync(options?: {
  configureSettings?: boolean
  syncSynonyms?: boolean
}): Promise<AlgoliaSyncResult> {
  const start = Date.now()
  const client = getAlgoliaAdminClient()
  const db = await getDb()

  if (options?.configureSettings !== false) {
    await configureIndexSettings(client)
  }
  if (options?.syncSynonyms !== false) {
    await pushSynonyms(client)
  }

  const [volunteers, ngos, opportunities] = await Promise.all([
    collectVolunteers(db),
    collectNGOs(db),
    collectOpportunities(db),
  ])

  // Atomic replace — drops anything not in the new payload.
  // safe=true waits for the temporary index task to complete before
  // the move so we never serve a half-built index.
  await Promise.all([
    client.replaceAllObjects({
      indexName: ALGOLIA_INDEXES.VOLUNTEERS,
      objects: volunteers,
      batchSize: 1000,
    }),
    client.replaceAllObjects({
      indexName: ALGOLIA_INDEXES.NGOS,
      objects: ngos,
      batchSize: 1000,
    }),
    client.replaceAllObjects({
      indexName: ALGOLIA_INDEXES.OPPORTUNITIES,
      objects: opportunities,
      batchSize: 1000,
    }),
  ])

  return {
    volunteers: volunteers.length,
    ngos: ngos.length,
    opportunities: opportunities.length,
    durationMs: Date.now() - start,
  }
}
