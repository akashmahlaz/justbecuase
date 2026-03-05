import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { ensureElasticsearchIndexes } from "@/lib/es-indexes"
import { bulkSyncToElasticsearch, cleanupStaleDocuments } from "@/lib/es-sync"

export const dynamic = "force-dynamic"
// Full bulk sync can take up to 5 minutes for large datasets
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    // Admin-only auth check
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const mode = body.mode || "full"
    const collections = body.collections as ("volunteers" | "ngos" | "projects" | "blog" | "pages")[] | undefined

    // Always ensure indexes are up-to-date
    await ensureElasticsearchIndexes()

    if (mode === "setup") {
      return NextResponse.json({
        success: true,
        message: "Elasticsearch indexes created/verified",
      })
    }

    if (mode === "cleanup") {
      const removed = await cleanupStaleDocuments()
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${removed} stale documents`,
        removed,
      })
    }

    // Incremental or full sync
    const since = body.since ? new Date(body.since) : undefined

    const result = await bulkSyncToElasticsearch({
      collections: collections || undefined,
      since,
    })

    return NextResponse.json({
      success: true,
      mode,
      collections: collections || ["volunteers", "ngos", "projects", "blog", "pages"],
      synced: result.synced,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Admin ES Sync API] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Sync failed" },
      { status: 500 }
    )
  }
}

// GET — check ES index stats
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const esClient = (await import("@/lib/elasticsearch")).default
    const { ES_INDEXES } = await import("@/lib/elasticsearch")

    const indexNames = Object.values(ES_INDEXES)

    const statsRaw = await esClient.indices.stats({ index: indexNames.join(",") }).catch(() => null)
    if (!statsRaw) {
      return NextResponse.json({ success: true, status: "unreachable", indices: {} })
    }

    const indices: Record<string, { docs: number; size: string }> = {}
    for (const [name, data] of Object.entries(statsRaw.indices || {})) {
      const d = data as any
      indices[name] = {
        docs: d.primaries?.docs?.count ?? 0,
        size: formatBytes(d.primaries?.store?.size_in_bytes ?? 0),
      }
    }

    return NextResponse.json({ success: true, status: "ok", indices })
  } catch (error: any) {
    console.error("[Admin ES Sync API] Stats error:", error)
    return NextResponse.json({ success: true, status: "error", error: error.message, indices: {} })
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
