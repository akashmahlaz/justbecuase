import { NextRequest, NextResponse } from "next/server"
import { externalOpportunitiesDb } from "@/lib/scraper"

// POST /api/admin/scraper/purge-onsite — Remove all non-remote jobs from DB
export async function POST(request: NextRequest) {
  try {
    const result = await externalOpportunitiesDb.purgeNonRemote()
    return NextResponse.json({
      success: true,
      message: `Purged ${result.deleted} non-remote opportunities from database`,
      ...result,
    })
  } catch (error) {
    console.error("Error purging non-remote jobs:", error)
    return NextResponse.json(
      { success: false, error: "Failed to purge non-remote jobs" },
      { status: 500 }
    )
  }
}
