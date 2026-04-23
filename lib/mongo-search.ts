// ============================================================
// Mongo-only search — drop-in replacement for elasticSearch().
// ============================================================
// No Elasticsearch, no ELSER, no Algolia. Just MongoDB Atlas
// (which we're already using as the primary store) plus a tiny
// in-process scorer. This works because:
//
//   1. Our agent already reasons over results with an LLM, so
//      perfect semantic recall isn't required at the index layer.
//   2. The collections are small enough (low six figures) that a
//      `$text` index + regex fallback returns in <100ms.
//   3. Skills / causes / locations are structured fields, so
//      filters are exact array/string matches — no fuzziness needed.
//
// If query throughput grows past Mongo $text limits we can switch
// to Atlas Search ($search) without changing the tool signatures.
// ============================================================

import { ObjectId, type Collection, type Filter } from "mongodb"
import client from "@/lib/db"

type Role = "volunteer" | "ngo"

type AnyDoc = Record<string, unknown> & {
  _id?: ObjectId | string
  id?: string
  name?: string
  orgName?: string
  organizationName?: string
  headline?: string
  bio?: string
  description?: string
  city?: string
  country?: string
  location?: string
  avatar?: string
  isVerified?: boolean
  rating?: number
  workMode?: string
  volunteerType?: string
  skills?: unknown
  causes?: unknown
  // typicalSkillsNeeded is array on NGO
  typicalSkillsNeeded?: unknown
}

export type MongoSearchHit = {
  id: string
  type: "volunteer" | "ngo" | "project"
  title: string
  subtitle: string
  metadata: {
    city?: string
    country?: string
    location?: string
    skillNames?: string[]
    avatar?: string
    isVerified?: boolean
    rating?: number
    workMode?: string
    volunteerType?: string
  }
  _score: number
}

export type MongoSearchInput = {
  query: string
  types: Array<"volunteer" | "ngo" | "project">
  filters?: {
    skills?: string[]
    causes?: string[]
    location?: string
    workMode?: "remote" | "onsite" | "hybrid"
    volunteerType?: "free" | "paid" | "both"
    minRating?: number
    isVerified?: boolean
    status?: string
  }
  limit?: number
  sort?: "relevance" | "newest"
}

const DB_NAME = "justbecause"

async function db() {
  await client.connect()
  return client.db(DB_NAME)
}

// ---- text-index management (idempotent, lazy) -------------
const textIndexEnsured: Record<string, boolean> = {}
async function ensureTextIndex(col: Collection<AnyDoc>, fields: string[]) {
  const cacheKey = `${col.namespace}:${fields.join(",")}`
  if (textIndexEnsured[cacheKey]) return
  try {
    const spec = Object.fromEntries(fields.map((f) => [f, "text"])) as Record<string, "text">
    await col.createIndex(spec, { name: `mongo_search_${fields.join("_")}_text` })
  } catch {
    // index may already exist with a different field set — ignore
  }
  textIndexEnsured[cacheKey] = true
}

// ---- helpers ----------------------------------------------
function idOf(d: AnyDoc): string {
  if (d._id instanceof ObjectId) return d._id.toHexString()
  if (typeof d._id === "string") return d._id
  if (typeof d.id === "string") return d.id
  return ""
}

function safeArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : (x as { name?: string })?.name || "")).filter(Boolean)
  if (typeof v === "string") {
    const s = v.trim()
    if (!s) return []
    if (s.startsWith("[")) {
      try { return safeArray(JSON.parse(s)) } catch { return [] }
    }
    return [s]
  }
  return []
}

function caseInsens(s: string): RegExp {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
}

// Build a relevance score as a fallback when $text isn't usable.
function lexicalScore(d: AnyDoc, terms: string[]): number {
  if (terms.length === 0) return 1
  const hay = [
    d.name, d.orgName, d.organizationName, d.headline,
    d.bio, d.description, d.city, d.country, d.location,
    ...safeArray(d.skills),
    ...safeArray(d.causes),
    ...safeArray(d.typicalSkillsNeeded),
  ].filter(Boolean).join(" ").toLowerCase()
  let score = 0
  for (const t of terms) {
    const tl = t.toLowerCase()
    if (!tl) continue
    const occ = hay.split(tl).length - 1
    score += occ
  }
  return score
}

function tokensOf(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2)
}

// ---- USER (volunteers + ngos live in the user collection) -
async function searchUserRole(
  role: Role,
  input: MongoSearchInput,
): Promise<MongoSearchHit[]> {
  const col = (await db()).collection<AnyDoc>("user")
  await ensureTextIndex(col, ["name", "orgName", "organizationName", "headline", "bio", "description", "city", "country"])

  const f: Filter<AnyDoc> = { role }

  // structural filters first (cheap, exact)
  if (input.filters?.location) {
    const r = caseInsens(input.filters.location)
    ;(f as Record<string, unknown>).$or = [{ city: r }, { country: r }, { location: r }]
  }
  if (input.filters?.workMode) (f as Record<string, unknown>).workMode = input.filters.workMode
  if (input.filters?.volunteerType && input.filters.volunteerType !== "both") {
    (f as Record<string, unknown>).volunteerType = { $in: [input.filters.volunteerType, "both"] }
  }
  if (typeof input.filters?.minRating === "number") (f as Record<string, unknown>).rating = { $gte: input.filters.minRating }
  if (input.filters?.isVerified) (f as Record<string, unknown>).isVerified = true

  // skills/causes — these are stringified JSON in mongo, so use regex
  const arrayChecks: Array<Record<string, unknown>> = []
  if (input.filters?.skills?.length) {
    arrayChecks.push({ $or: input.filters.skills.map((s) => ({ skills: caseInsens(s) })) })
  }
  if (input.filters?.causes?.length) {
    arrayChecks.push({ $or: input.filters.causes.map((c) => ({ causes: caseInsens(c) })) })
  }
  if (arrayChecks.length) {
    const existing = (f as Record<string, unknown>).$and as unknown[] | undefined
    ;(f as Record<string, unknown>).$and = [...(existing || []), ...arrayChecks]
  }

  // text query — try $text first, fall back to regex on failure
  const limit = Math.min(input.limit ?? 10, 50)
  let docs: AnyDoc[] = []
  let usedTextScore = false
  if (input.query.trim()) {
    try {
      const sortSpec = { score: { $meta: "textScore" } } as unknown as { score: 1 }
      docs = await col
        .find(
          { ...f, $text: { $search: input.query } } as Filter<AnyDoc>,
          { projection: { score: { $meta: "textScore" } } },
        )
        .sort(sortSpec)
        .limit(limit)
        .toArray()
      usedTextScore = true
    } catch {
      docs = []
    }
    if (docs.length === 0) {
      // regex fallback across the same fields
      const r = caseInsens(input.query)
      const orQ = {
        $or: [
          { name: r }, { orgName: r }, { organizationName: r }, { headline: r },
          { bio: r }, { description: r }, { skills: r }, { causes: r },
          { city: r }, { country: r }, { location: r },
        ],
      }
      const merged: Filter<AnyDoc> = { ...f, ...orQ } as Filter<AnyDoc>
      docs = await col.find(merged).limit(limit * 2).toArray()
    }
  } else {
    docs = await col.find(f).limit(limit).toArray()
  }

  const terms = tokensOf(input.query)
  const scored = docs
    .map((d) => {
      const s = usedTextScore ? Number((d as { score?: number }).score ?? 1) : lexicalScore(d, terms) + (d.isVerified ? 0.5 : 0) + Math.min(2, Number(d.rating || 0) / 2.5)
      return { d, s }
    })
    .filter((x) => x.s > 0 || !input.query.trim())
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)

  return scored.map(({ d, s }) => ({
    id: idOf(d),
    type: role === "volunteer" ? "volunteer" : "ngo",
    title: String(d.name || d.orgName || d.organizationName || "Unnamed"),
    subtitle: String(d.headline || d.description?.slice(0, 100) || ""),
    metadata: {
      city: d.city as string | undefined,
      country: d.country as string | undefined,
      location: d.location as string | undefined,
      skillNames: safeArray(d.skills),
      avatar: d.avatar as string | undefined,
      isVerified: Boolean(d.isVerified),
      rating: typeof d.rating === "number" ? d.rating : undefined,
      workMode: d.workMode as string | undefined,
      volunteerType: d.volunteerType as string | undefined,
    },
    _score: s,
  }))
}

// ---- PROJECTS ---------------------------------------------
async function searchProjects(input: MongoSearchInput): Promise<MongoSearchHit[]> {
  const col = (await db()).collection<AnyDoc>("projects")
  await ensureTextIndex(col, ["title", "description", "location"])

  const f: Filter<AnyDoc> = {}
  if (input.filters?.status) (f as Record<string, unknown>).status = input.filters.status
  else (f as Record<string, unknown>).status = { $in: ["active", "open"] }

  if (input.filters?.location) {
    const r = caseInsens(input.filters.location)
    ;(f as Record<string, unknown>).location = r
  }
  if (input.filters?.workMode) (f as Record<string, unknown>).workMode = input.filters.workMode
  if (input.filters?.skills?.length) {
    (f as Record<string, unknown>).$or = input.filters.skills.map((s) => ({ skillsRequired: caseInsens(s) }))
  }

  const limit = Math.min(input.limit ?? 10, 50)
  let docs: AnyDoc[] = []
  let usedTextScore = false
  if (input.query.trim()) {
    try {
      docs = await col
        .find({ ...f, $text: { $search: input.query } } as Filter<AnyDoc>, { projection: { score: { $meta: "textScore" } } })
        .sort({ score: { $meta: "textScore" } } as unknown as { score: 1 })
        .limit(limit)
        .toArray()
      usedTextScore = true
    } catch { docs = [] }
    if (docs.length === 0) {
      const r = caseInsens(input.query)
      docs = await col.find({ ...f, $or: [{ title: r }, { description: r }, { location: r }, { skillsRequired: r }] } as Filter<AnyDoc>)
        .limit(limit * 2)
        .toArray()
    }
  } else {
    docs = await col.find(f).sort({ createdAt: -1 }).limit(limit).toArray()
  }

  const terms = tokensOf(input.query)
  const scored = docs
    .map((d) => ({ d, s: usedTextScore ? Number((d as { score?: number }).score ?? 1) : lexicalScore(d, terms) }))
    .filter((x) => x.s > 0 || !input.query.trim())
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)

  return scored.map(({ d, s }) => ({
    id: idOf(d),
    type: "project",
    title: String(d.title || "Opportunity"),
    subtitle: String(d.description?.slice(0, 100) || ""),
    metadata: {
      location: d.location as string | undefined,
      skillNames: safeArray(d.skillsRequired ?? d.skills),
      workMode: d.workMode as string | undefined,
    },
    _score: s,
  }))
}

// ---- public API (mirrors elasticSearch shape) -------------
export async function mongoSearch(input: MongoSearchInput): Promise<{
  results: MongoSearchHit[]
  total: number
}> {
  const types = input.types?.length ? input.types : ["volunteer", "ngo", "project"]
  const buckets = await Promise.all(
    types.map((t) => {
      if (t === "volunteer") return searchUserRole("volunteer", input)
      if (t === "ngo") return searchUserRole("ngo", input)
      return searchProjects(input)
    }),
  )
  const merged = buckets.flat().sort((a, b) => b._score - a._score)
  const limit = Math.min(input.limit ?? 10, 50)
  return { results: merged.slice(0, limit), total: merged.length }
}
