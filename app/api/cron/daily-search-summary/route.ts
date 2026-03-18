import { NextResponse } from "next/server"
import { searchAnalyticsDb, teamMembersDb } from "@/lib/database"
import { sendEmail, getDailySearchSummaryEmailHtml } from "@/lib/email"

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

    // Get yesterday's search summary (cron runs in the morning for previous day)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split("T")[0]

    const summary = await searchAnalyticsDb.getDailySummary(yesterday)

    // Skip sending if no searches happened
    if (summary.totalSearches === 0) {
      return NextResponse.json({
        success: true,
        message: "No searches yesterday, skipping email",
        date: dateStr,
      })
    }

    const teamEmails = await getTeamEmails()
    const html = getDailySearchSummaryEmailHtml({
      date: dateStr,
      ...summary,
    })

    let sent = 0
    let failed = 0
    const results = await Promise.allSettled(
      teamEmails.map(email =>
        sendEmail({
          to: email,
          subject: `[JBC] Daily Search Summary — ${dateStr}`,
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
      totalSearches: summary.totalSearches,
      emailsSent: sent,
      emailsFailed: failed,
      recipients: teamEmails.length,
    })
  } catch (error: any) {
    console.error("[Cron] Daily search summary failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
