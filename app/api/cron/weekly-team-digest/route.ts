import { NextResponse } from "next/server"
import { searchAnalyticsDb, teamMembersDb, getDb } from "@/lib/database"
import { sendEmail, getWeeklyTeamDigestEmailHtml } from "@/lib/email"

const ADMIN_EMAIL = "admin@justbecausenetwork.com"

async function getTeamEmails(): Promise<string[]> {
  const emails = new Set<string>()
  emails.add(ADMIN_EMAIL)
  try {
    const teamMembers = await teamMembersDb.findActive()
    for (const m of teamMembers) {
      if (m.email) emails.add(m.email)
    }
  } catch (err) {
    console.error("[Cron] Failed to fetch team emails:", err)
  }
  return Array.from(emails)
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const now = new Date()
    const weekEnd = new Date(now)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekRange = `${weekStart.toISOString().split("T")[0]} to ${weekEnd.toISOString().split("T")[0]}`
    const timeFilter = { $gte: weekStart, $lte: weekEnd }

    // Get search summary for the week
    const searchSummary = await searchAnalyticsDb.getWeeklySummary()

    // Get platform activity metrics for the week
    const eventCounts = await db.collection("platform_events").aggregate([
      { $match: { timestamp: timeFilter } },
      { $group: {
        _id: { category: "$category", action: "$action" },
        count: { $sum: 1 },
      }},
    ]).toArray()

    const revenueAgg = await db.collection("platform_events").aggregate([
      { $match: { category: "payment", timestamp: timeFilter, value: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$value" } } },
    ]).toArray()

    const getCategoryActionCount = (category: string, action: string) => {
      const found = eventCounts.find(
        (e: any) => e._id.category === category && e._id.action === action
      )
      return found?.count || 0
    }

    const teamEmails = await getTeamEmails()
    const html = getWeeklyTeamDigestEmailHtml({
      weekRange,
      newSignups: getCategoryActionCount("user", "signup"),
      ngoSignups: getCategoryActionCount("user", "ngo_signup"),
      newProjects: getCategoryActionCount("project", "created"),
      applications: getCategoryActionCount("application", "submitted"),
      matches: getCategoryActionCount("application", "accepted"),
      revenue: Math.round(((revenueAgg[0]?.total || 0) / 100) * 100) / 100,
      totalSearches: searchSummary.totalSearches,
      uniqueQueries: searchSummary.uniqueQueries,
      zeroResultRate: searchSummary.zeroResultRate,
      topQueries: searchSummary.topQueries,
      zeroResultQueries: searchSummary.zeroResultQueries,
      contentGaps: searchSummary.contentGaps,
      searchTrend: searchSummary.searchTrend,
    })

    let sent = 0
    let failed = 0
    const results = await Promise.allSettled(
      teamEmails.map(email =>
        sendEmail({
          to: email,
          subject: `[JBC] Weekly Team Digest — ${weekRange}`,
          html,
        })
      )
    )

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++
      else failed++
    }

    return NextResponse.json({
      success: true,
      weekRange,
      searchSummary: {
        totalSearches: searchSummary.totalSearches,
        uniqueQueries: searchSummary.uniqueQueries,
        zeroResultRate: searchSummary.zeroResultRate,
      },
      emailsSent: sent,
      emailsFailed: failed,
      recipients: teamEmails.length,
    })
  } catch (error: any) {
    console.error("[Cron] Weekly team digest failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
