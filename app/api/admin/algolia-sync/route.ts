import { NextResponse } from "next/server"
import { algoliasearch } from "algoliasearch"
import clientPromise from "@/lib/db"
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

export const maxDuration = 120

export async function POST(request: Request) {
  // Simple auth check — require the write key as bearer token
  const authHeader = request.headers.get("authorization")
  const writeKey = process.env.ALGOLIA_WRITE_KEY
  if (!writeKey || authHeader !== `Bearer ${writeKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
  if (!appId || !writeKey) {
    return NextResponse.json({ error: "Algolia not configured" }, { status: 500 })
  }

  const algolia = algoliasearch(appId, writeKey)
  const log: string[] = []

  try {
    // 1. Configure index settings
    log.push("Configuring index settings...")
    await algolia.setSettings({ indexName: ALGOLIA_INDEXES.VOLUNTEERS, indexSettings: getVolunteerIndexSettings() })
    await algolia.setSettings({ indexName: ALGOLIA_INDEXES.NGOS, indexSettings: getNGOIndexSettings() })
    await algolia.setSettings({ indexName: ALGOLIA_INDEXES.OPPORTUNITIES, indexSettings: getOpportunityIndexSettings() })
    log.push("✅ Index settings configured")

    // 2. Push synonyms
    const synonyms = getSynonymGroups()
    for (const indexName of Object.values(ALGOLIA_INDEXES)) {
      await algolia.saveSynonyms({ indexName, synonymHit: synonyms, forwardToReplicas: false, replaceExistingSynonyms: true })
    }
    log.push(`✅ ${synonyms.length} synonyms pushed to all indexes`)

    // 3. Connect to MongoDB (reuses Next.js connection)
    const client = clientPromise
    const db = client.db("justbecause")

    // 4. Sync volunteers
    const volCursor = db.collection("user").find({ role: "volunteer", isOnboarded: true, isBanned: { $ne: true } })
    const volBatch: Record<string, any>[] = []
    let volTotal = 0
    for await (const doc of volCursor) {
      if (doc.privacy?.showInSearch === false) continue
      volBatch.push(transformVolunteerRecord(doc))
      if (volBatch.length >= 500) {
        await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.VOLUNTEERS, objects: volBatch })
        volTotal += volBatch.length
        volBatch.length = 0
      }
    }
    if (volBatch.length > 0) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.VOLUNTEERS, objects: volBatch })
      volTotal += volBatch.length
    }
    log.push(`✅ ${volTotal} volunteers synced`)

    // 5. Sync NGOs
    const ngoCursor = db.collection("user").find({ role: "ngo", isOnboarded: true, isBanned: { $ne: true } })
    const ngoBatch: Record<string, any>[] = []
    let ngoTotal = 0
    for await (const doc of ngoCursor) {
      if (doc.privacy?.showInSearch === false) continue
      ngoBatch.push(transformNGORecord(doc))
      if (ngoBatch.length >= 500) {
        await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.NGOS, objects: ngoBatch })
        ngoTotal += ngoBatch.length
        ngoBatch.length = 0
      }
    }
    if (ngoBatch.length > 0) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.NGOS, objects: ngoBatch })
      ngoTotal += ngoBatch.length
    }
    log.push(`✅ ${ngoTotal} NGOs synced`)

    // 6. Sync opportunities
    const ngoNameMap = new Map<string, string>()
    const ngos = await db.collection("user").find(
      { role: "ngo" },
      { projection: { _id: 1, organizationName: 1, orgName: 1, name: 1 } }
    ).toArray()
    for (const ngo of ngos) {
      ngoNameMap.set(ngo._id.toString(), ngo.organizationName || ngo.orgName || ngo.name || "")
    }

    const projCursor = db.collection("projects").find({ status: { $in: ["open", "active"] } })
    const projBatch: Record<string, any>[] = []
    let projTotal = 0
    for await (const doc of projCursor) {
      const ngoName = ngoNameMap.get(doc.ngoId?.toString() || doc.ngoProfileId?.toString() || "")
      projBatch.push(transformOpportunityRecord(doc, ngoName))
      if (projBatch.length >= 500) {
        await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.OPPORTUNITIES, objects: projBatch })
        projTotal += projBatch.length
        projBatch.length = 0
      }
    }
    if (projBatch.length > 0) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDEXES.OPPORTUNITIES, objects: projBatch })
      projTotal += projBatch.length
    }
    log.push(`✅ ${projTotal} opportunities synced`)

    return NextResponse.json({
      success: true,
      summary: { volunteers: volTotal, ngos: ngoTotal, opportunities: projTotal },
      log,
    })
  } catch (error: any) {
    log.push(`❌ Error: ${error.message}`)
    return NextResponse.json({ success: false, error: error.message, log }, { status: 500 })
  }
}
