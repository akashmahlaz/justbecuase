import { NextRequest, NextResponse } from "next/server"
import { theirstackJobsDb, type TheirStackJobDoc } from "@/lib/theirstack-jobs"

// ============================================
// GET /api/jobs — Public TheirStack job listings (from MongoDB)
// ============================================
// Reads from the theirstackJobs collection, which is populated
// once per day by /api/cron/theirstack.
// No TheirStack API calls on page load — zero credit cost per visitor.

export const revalidate = 3600 // Next.js cache — revalidate hourly

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)))
    const country = searchParams.get("country")?.trim().toUpperCase() || ""
    const remote = searchParams.get("remote") === "true"

    const jobs = await theirstackJobsDb.findAll({
      country: country || undefined,
      remote: remote || undefined,
      limit,
    })

    const lastSync = await theirstackJobsDb.getLastSync()

    return NextResponse.json({
      jobs,
      total: jobs.length,
      lastSyncedAt: lastSync?.toISOString() ?? null,
    })
  } catch (err: any) {
    console.error("[/api/jobs]", err?.message)
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}
