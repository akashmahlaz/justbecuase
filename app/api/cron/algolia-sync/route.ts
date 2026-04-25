import { NextResponse } from "next/server"
import { runAlgoliaFullSync } from "@/lib/algolia-sync-runner"

// ============================================
// Algolia Daily Sync Cron Endpoint
// ============================================
// Atomic full re-index of volunteers, NGOs, and opportunities.
// Stale records (role-changed, deleted, banned, closed) are dropped
// automatically because the runner uses `replaceAllObjects`.
//
// Secured via CRON_SECRET (Bearer header).
// Schedule: see vercel.json — runs daily at 02:00 UTC.
// ============================================

export const maxDuration = 300 // 5 min — large indexes can take a while

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runAlgoliaFullSync()
    console.log("[cron/algolia-sync] complete", result)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error("[cron/algolia-sync] failed", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Sync failed" },
      { status: 500 }
    )
  }
}
