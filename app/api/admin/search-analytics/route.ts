import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getDb } from "@/lib/database"

export const dynamic = "force-dynamic"

/**
 * Admin Search Analytics API
 * 
 * GET /api/admin/search-analytics?range=7d|30d|90d
 *   Returns: top queries, zero-result queries, query volume over time,
 *            result type distribution, search engine usage, peak hours,
 *            click-through data, recent raw queries
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "30d"
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const db = await getDb()
    const col = db.collection("platform_events")

    // ── 1. Total search queries in range ──
    const totalQueries = await col.countDocuments({
      category: "search",
      action: "query",
      timestamp: { $gte: since },
    })

    // ── 2. Total unique queries ──
    const uniqueQueriesAgg = await col.aggregate([
      { $match: { category: "search", action: "query", timestamp: { $gte: since } } },
      { $group: { _id: { $toLower: "$metadata.query" } } },
      { $count: "total" },
    ]).toArray()
    const uniqueQueries = uniqueQueriesAgg[0]?.total || 0

    // ── 3. Zero-result queries (count=0) ──
    const zeroResultQueries = await col.countDocuments({
      category: "search",
      action: "query",
      timestamp: { $gte: since },
      "metadata.count": 0,
    })

    // ── 4. Top searched terms (full queries, count>0) ──
    const topQueriesAgg = await col.aggregate([
      { $match: { category: "search", action: "query", timestamp: { $gte: since } } },
      {
        $group: {
          _id: { $toLower: "$metadata.query" },
          searches: { $sum: 1 },
          avgResults: { $avg: "$metadata.count" },
          lastSearched: { $max: "$timestamp" },
          hasZeroResults: { $min: "$metadata.count" },
        },
      },
      { $sort: { searches: -1 } },
      { $limit: 20 },
      {
        $project: {
          query: "$_id",
          searches: 1,
          avgResults: { $round: ["$avgResults", 1] },
          lastSearched: 1,
          zeroResultOccurred: { $eq: ["$hasZeroResults", 0] },
          _id: 0,
        },
      },
    ]).toArray()

    // ── 5. Zero-result queries list (for admin alert) ──
    const zeroResultQueriesListAgg = await col.aggregate([
      {
        $match: {
          category: "search",
          action: "query",
          timestamp: { $gte: since },
          "metadata.count": 0,
        },
      },
      {
        $group: {
          _id: { $toLower: "$metadata.query" },
          occurrences: { $sum: 1 },
          lastSearched: { $max: "$timestamp" },
          engines: { $addToSet: "$metadata.engine" },
        },
      },
      { $sort: { occurrences: -1 } },
      { $limit: 50 },
      {
        $project: {
          query: "$_id",
          occurrences: 1,
          lastSearched: 1,
          engines: 1,
          _id: 0,
        },
      },
    ]).toArray()

    // ── 6. Daily volume (time series) ──
    const dailyVolumeAgg = await col.aggregate([
      { $match: { category: "search", action: "query", timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          searches: { $sum: 1 },
          zeroResults: {
            $sum: { $cond: [{ $eq: ["$metadata.count", 0] }, 1, 0] },
          },
          avgResults: { $avg: "$metadata.count" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      {
        $project: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: "$_id.day",
                },
              },
            },
          },
          searches: 1,
          zeroResults: 1,
          avgResults: { $round: ["$avgResults", 1] },
          _id: 0,
        },
      },
    ]).toArray()

    // ── 7. Peak search hours (0–23) ──
    const peakHoursAgg = await col.aggregate([
      { $match: { category: "search", action: "query", timestamp: { $gte: since } } },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          searches: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
      { $project: { hour: "$_id", searches: 1, _id: 0 } },
    ]).toArray()

    // ── 8. Search engine distribution ──
    const engineDistAgg = await col.aggregate([
      { $match: { category: "search", action: "query", timestamp: { $gte: since } } },
      {
        $group: {
          _id: "$metadata.engine",
          count: { $sum: 1 },
        },
      },
      { $project: { engine: "$_id", count: 1, _id: 0 } },
    ]).toArray()

    // ── 9. Result type breakdown (from suggestions + full results) ──
    const typeDistAgg = await col.aggregate([
      {
        $match: {
          category: "search",
          action: "result_click",
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$metadata.resultType",
          clicks: { $sum: 1 },
        },
      },
      { $project: { type: "$_id", clicks: 1, _id: 0 } },
    ]).toArray()

    // ── 10. Recent raw search log ──
    const recentSearchesAgg = await col.aggregate([
      { $match: { category: "search", action: "query", timestamp: { $gte: since } } },
      { $sort: { timestamp: -1 } },
      { $limit: 100 },
      {
        $project: {
          query: "$metadata.query",
          results: "$metadata.count",
          engine: "$metadata.engine",
          took: "$metadata.took",
          timestamp: 1,
          userId: 1,
          _id: 0,
        },
      },
    ]).toArray()

    // ── 11. Suggestion vs full query ratio ──
    const suggestCount = await col.countDocuments({
      category: "search",
      action: "suggest",
      timestamp: { $gte: since },
    })

    // ── 12. Zero result rate ──
    const zeroResultRate = totalQueries > 0
      ? Math.round((zeroResultQueries / totalQueries) * 100 * 10) / 10
      : 0

    // ── 13. Avg results per query ──
    const avgResultsAgg = await col.aggregate([
      { $match: { category: "search", action: "query", timestamp: { $gte: since } } },
      { $group: { _id: null, avg: { $avg: "$metadata.count" } } },
    ]).toArray()
    const avgResultsPerQuery = Math.round((avgResultsAgg[0]?.avg || 0) * 10) / 10

    // ── 14. Searches with clicks (CTR proxy) ──
    const searchesWithClicks = await col.countDocuments({
      category: "search",
      action: "result_click",
      timestamp: { $gte: since },
    })

    return NextResponse.json({
      success: true,
      range,
      days,
      summary: {
        totalQueries,
        uniqueQueries,
        zeroResultQueries,
        zeroResultRate,
        avgResultsPerQuery,
        suggestionsServed: suggestCount,
        resultClicks: searchesWithClicks,
      },
      topQueries: topQueriesAgg,
      zeroResultList: zeroResultQueriesListAgg,
      dailyVolume: dailyVolumeAgg,
      peakHours: peakHoursAgg,
      engineDistribution: engineDistAgg,
      typeDistribution: typeDistAgg,
      recentSearches: recentSearchesAgg,
    })
  } catch (err) {
    console.error("[Search Analytics API]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/search-analytics
 * Track a result click from the frontend
 * Body: { query, resultId, resultType, resultTitle, position }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, resultId, resultType, resultTitle, position } = body

    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 })

    const db = await getDb()
    await db.collection("platform_events").insertOne({
      category: "search",
      action: "result_click",
      userId: null,
      metadata: {
        query,
        resultId,
        resultType,
        resultTitle,
        position: position || 0,
      },
      value: 0,
      sessionId: null,
      timestamp: new Date(),
      _createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Search Analytics POST]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
