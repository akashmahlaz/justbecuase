import { NextRequest, NextResponse } from "next/server"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

// ============================================
// GET /api/admin/scraper/opportunities — List scraped opportunities
// ============================================
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get("platform") || undefined
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10))
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = {}
  if (platform) filter.sourceplatform = platform

  const [opportunities, total] = await Promise.all([
    externalOpportunitiesDb.findAll(filter as any, limit, skip),
    externalOpportunitiesDb.count(filter as any),
  ])

  return NextResponse.json({
    opportunities,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
