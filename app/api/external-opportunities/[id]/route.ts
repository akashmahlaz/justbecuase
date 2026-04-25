import { NextRequest, NextResponse } from "next/server"
import { externalOpportunitiesDb } from "@/lib/scraper"

// ============================================
// GET /api/external-opportunities/:id — Single external opportunity
// ============================================
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || id.length < 10) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  try {
    const opportunity = await externalOpportunitiesDb.findById(id)

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error("Error fetching external opportunity:", error)
    return NextResponse.json({ error: "Failed to fetch opportunity" }, { status: 500 })
  }
}
