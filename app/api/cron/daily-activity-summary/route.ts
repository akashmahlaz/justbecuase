import { NextResponse } from "next/server"
import { teamMembersDb, getDb } from "@/lib/database"
import { sendEmail, getDailyActivitySummaryEmailHtml } from "@/lib/email"

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
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dayStart = new Date(yesterday)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(yesterday)
    dayEnd.setHours(23, 59, 59, 999)
    const dateStr = yesterday.toISOString().split("T")[0]
    const timeFilter = { $gte: dayStart, $lte: dayEnd }

    // Aggregate platform events for yesterday
    const [eventCounts, topEvents, searchCount, revenueAgg] = await Promise.all([
      db.collection("platform_events").aggregate([
        { $match: { timestamp: timeFilter } },
        { $group: {
          _id: { category: "$category", action: "$action" },
          count: { $sum: 1 },
        }},
      ]).toArray(),
      db.collection("platform_events").aggregate([
        { $match: { timestamp: timeFilter } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { _id: 0, action: "$_id", count: 1 } },
      ]).toArray(),
      db.collection("searchAnalytics").countDocuments({
        timestamp: timeFilter,
        isSuggestion: false,
      }),
      db.collection("platform_events").aggregate([
        { $match: { category: "payment", timestamp: timeFilter, value: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$value" } } },
      ]).toArray(),
    ])

    // Extract counts from event categories
    const getCategoryActionCount = (category: string, action: string) => {
      const found = eventCounts.find(
        (e: any) => e._id.category === category && e._id.action === action
      )
      return found?.count || 0
    }

    const newSignups = getCategoryActionCount("user", "signup")
    const ngoSignups = getCategoryActionCount("user", "ngo_signup")
    const newProjects = getCategoryActionCount("project", "created")
    const applications = getCategoryActionCount("application", "submitted")
    const matches = getCategoryActionCount("application", "accepted")
    const emailsSent = getCategoryActionCount("email", "sent")
    const revenue = Math.round(((revenueAgg[0]?.total || 0) / 100) * 100) / 100

    const teamEmails = await getTeamEmails()
    const html = getDailyActivitySummaryEmailHtml({
      date: dateStr,
      newSignups,
      ngoSignups,
      newProjects,
      applications,
      matches,
      totalSearches: searchCount,
      revenue,
      emailsSent,
      topEvents: topEvents as any,
    })

    let sent = 0
    let failed = 0
    const results = await Promise.allSettled(
      teamEmails.map(email =>
        sendEmail({
          to: email,
          subject: `[JBC] Daily Activity Report — ${dateStr}`,
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
      date: dateStr,
      metrics: { newSignups, ngoSignups, newProjects, applications, matches, revenue, searchCount },
      emailsSent: sent,
      emailsFailed: failed,
      recipients: teamEmails.length,
    })
  } catch (error: any) {
    console.error("[Cron] Daily activity summary failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
