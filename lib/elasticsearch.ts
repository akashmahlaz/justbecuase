// ============================================
// Elasticsearch Client — Serverless Cloud
// ============================================
// Connects to Elastic Cloud Serverless using API key auth.
// Provides a singleton client instance shared across the app.
// ============================================

import { Client } from "@elastic/elasticsearch"

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || ""
const ELASTICSEARCH_API_KEY = process.env.ELASTICSEARCH_API_KEY || ""

if (!ELASTICSEARCH_URL) {
  console.warn("[Elasticsearch] Missing ELASTICSEARCH_URL env variable")
}
if (!ELASTICSEARCH_API_KEY) {
  console.warn("[Elasticsearch] Missing ELASTICSEARCH_API_KEY env variable")
}

let esClient: Client

function createClient(): Client {
  return new Client({
    node: ELASTICSEARCH_URL,
    auth: {
      apiKey: ELASTICSEARCH_API_KEY,
    },
    // Serverless Elastic Cloud doesn't need TLS config — it's handled by the endpoint
    requestTimeout: 5000,  // 5s — fail fast so MongoDB fallback kicks in quickly
    maxRetries: 1,         // 1 retry max to avoid 30s+ waits on DNS failures
  })
}

if (process.env.NODE_ENV === "development") {
  // Reuse client across HMR in dev
  const globalWithEs = global as typeof globalThis & { _esClient?: Client }
  if (!globalWithEs._esClient) {
    globalWithEs._esClient = createClient()
  }
  esClient = globalWithEs._esClient
} else {
  esClient = createClient()
}

export default esClient

// ============================================
// ES Circuit Breaker — skip ES for 60s after a connection failure
// ============================================
let _esCircuitOpen = false
let _esCircuitOpenedAt = 0
const ES_CIRCUIT_COOLDOWN_MS = 60_000

export function isESAvailable(): boolean {
  if (!ELASTICSEARCH_URL || !ELASTICSEARCH_API_KEY) return false
  if (_esCircuitOpen && Date.now() - _esCircuitOpenedAt < ES_CIRCUIT_COOLDOWN_MS) return false
  if (_esCircuitOpen) { _esCircuitOpen = false } // reset after cooldown
  return true
}

export function markESFailed(): void {
  _esCircuitOpen = true
  _esCircuitOpenedAt = Date.now()
  console.warn(`[ES Circuit Breaker] Opened — skipping ES for ${ES_CIRCUIT_COOLDOWN_MS / 1000}s`)
}

// ============================================
// INDEX NAMES
// ============================================
export const ES_INDEXES = {
  VOLUNTEERS: "jbc_volunteers",
  NGOS: "jbc_ngos",
  PROJECTS: "jbc_projects",
  BLOG_POSTS: "jbc_blog_posts",
  PAGES: "jbc_pages",
} as const

export type ESIndexName = (typeof ES_INDEXES)[keyof typeof ES_INDEXES]
