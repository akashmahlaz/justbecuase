import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { searchAnalyticsDb } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") || "overview"
    const days = parseInt(searchParams.get("days") || "30", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    switch (section) {
      case "overview": {
        const stats = await searchAnalyticsDb.getOverviewStats(days)
        return NextResponse.json({ success: true, data: stats })
      }
      case "top-queries": {
        const data = await searchAnalyticsDb.getTopQueries(days, limit)
        return NextResponse.json({ success: true, data })
      }
      case "zero-results": {
        const data = await searchAnalyticsDb.getZeroResultQueries(days, limit)
        return NextResponse.json({ success: true, data })
      }
      case "trending": {
        const hours = parseInt(searchParams.get("hours") || "24", 10)
        const data = await searchAnalyticsDb.getTrendingQueries(hours, limit)
        return NextResponse.json({ success: true, data })
      }
      case "daily-volume": {
        const data = await searchAnalyticsDb.getDailyVolume(days)
        return NextResponse.json({ success: true, data })
      }
      case "engine-breakdown": {
        const data = await searchAnalyticsDb.getEngineBreakdown(days)
        return NextResponse.json({ success: true, data })
      }
      case "recent": {
        const data = await searchAnalyticsDb.getRecentSearches(limit)
        return NextResponse.json({ success: true, data })
      }
      case "content-gaps": {
        const data = await searchAnalyticsDb.getContentGaps(days, limit)
        return NextResponse.json({ success: true, data })
      }
      case "live-feed": {
        const data = await searchAnalyticsDb.getLiveFeed(limit)
        return NextResponse.json({ success: true, data })
      }
      case "user-search-stats": {
        const data = await searchAnalyticsDb.getUserSearchStats(days, limit)
        return NextResponse.json({ success: true, data })
      }
      default:
        return NextResponse.json({ error: "Invalid section" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[Search Analytics API] Error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
