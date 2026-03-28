import { NextRequest, NextResponse } from "next/server"
import { externalOpportunitiesDb } from "@/lib/scraper"

// ============================================
// GET /api/external-opportunities — Browse scraped opportunities (public)
// ============================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get("platform") || undefined
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(500, parseInt(searchParams.get("limit") || "100", 10))
  const skip = (page - 1) * limit
  const search = searchParams.get("q")?.trim()

  const filter: Record<string, unknown> = {}
  if (platform) filter.sourceplatform = platform
  if (search) {
    filter.$text = { $search: search }
  }

  const [opportunities, total] = await Promise.all([
    externalOpportunitiesDb.findAll(filter as any, limit, skip),
    externalOpportunitiesDb.count(filter as any),
  ])

  return NextResponse.json({
    opportunities,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
