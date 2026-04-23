import { NextRequest, NextResponse } from "next/server"
import { browseProjects } from "@/lib/actions"
import { externalOpportunitiesDb } from "@/lib/scraper"

// ============================================
// GET /api/projects — Merged native + scraped, paginated
// ============================================
// ?page=1&limit=24  — pagination
// ?q=search         — text search (applied to external only; native uses browseProjects)
// ?type=all|native|external — filter source type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10))
    const sourceType = searchParams.get("type") || "all"
    const search = searchParams.get("q")?.trim()

    // ---- Native projects ----
    let nativeProjects: any[] = []
    let nativeTotal = 0
    if (sourceType === "all" || sourceType === "native") {
      const all = await browseProjects()
      nativeProjects = all.map((p: any) => ({
        ...p,
        _source: "native" as const,
      }))
      nativeTotal = nativeProjects.length
    }

    // ---- External/scraped projects ----
    let externalProjects: any[] = []
    let externalTotal = 0
    if (sourceType === "all" || sourceType === "external") {
      const filter: Record<string, unknown> = {}
      if (search) filter.$text = { $search: search }

      // For merged view, fetch a window of external opps.
      // We need to know the total to compute pagination.
      externalTotal = await externalOpportunitiesDb.count(filter as any)

      // Determine how many external items to fetch for this page.
      // Strategy: native projects fill the first N items, then external fills the rest.
      // We interleave: for every page, we mix native and external proportionally.
      // Simple approach: merge all native at the front, then paginate the combined list.
      // But with 100K+ external, we can't load all. So:
      //   - Page 1-N: native items come first, then external fills remaining slots
      //   - After native is exhausted, all slots are external
      const totalCombined = nativeTotal + externalTotal
      const startIdx = (page - 1) * limit

      if (startIdx < nativeTotal) {
        // This page has some native items
        const nativeSlice = nativeProjects.slice(startIdx, startIdx + limit)
        const remainingSlots = limit - nativeSlice.length
        let extSlice: any[] = []
        if (remainingSlots > 0) {
          const rawExt = await externalOpportunitiesDb.findAll(filter as any, remainingSlots, 0)
          extSlice = rawExt.map(mapExternalToProject)
        }
        const projects = [...nativeSlice, ...extSlice]
        return NextResponse.json({
          projects,
          pagination: { page, limit, total: totalCombined, totalPages: Math.ceil(totalCombined / limit) },
          counts: { native: nativeTotal, external: externalTotal },
        })
      } else {
        // Past native — all external
        const extSkip = startIdx - nativeTotal
        const rawExt = await externalOpportunitiesDb.findAll(filter as any, limit, extSkip)
        const projects = rawExt.map(mapExternalToProject)
        return NextResponse.json({
          projects,
          pagination: { page, limit, total: totalCombined, totalPages: Math.ceil(totalCombined / limit) },
          counts: { native: nativeTotal, external: externalTotal },
        })
      }
    }

    // Native-only path
    const startIdx = (page - 1) * limit
    const projects = nativeProjects.slice(startIdx, startIdx + limit)
    return NextResponse.json({
      projects,
      pagination: { page, limit, total: nativeTotal, totalPages: Math.ceil(nativeTotal / limit) },
      counts: { native: nativeTotal, external: 0 },
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ projects: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 0 } }, { status: 500 })
  }
}

/** Derive a logo URL from stored logo or Clearbit domain lookup */
function deriveLogoUrl(opp: any): string {
  if (opp.organizationLogo) return opp.organizationLogo
  const url = opp.organizationUrl || opp.sourceUrl || ""
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "")
    return `https://logo.clearbit.com/${domain}`
  } catch {
    return ""
  }
}

/** Map an external opportunity doc to the same shape as a native project */
function mapExternalToProject(opp: any) {
  // Use the best available description
  const desc = opp.shortDescription && opp.shortDescription !== opp.title
    ? opp.shortDescription
    : opp.description && opp.description !== opp.title
      ? opp.description.slice(0, 500)
      : opp.title

  // Format deadline for display
  const deadline = opp.deadline ? (() => {
    const d = new Date(opp.deadline)
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
  })() : null

  return {
    _id: opp._id?.toString?.() || opp._id,
    id: `ext-${opp._id?.toString?.() || opp._id}`,
    title: opp.title,
    description: desc,
    skillsRequired: opp.skillsRequired || [],
    ngoId: "",
    status: "active",
    workMode: opp.workMode || "remote",
    location: opp.location || opp.country || "Remote",
    timeCommitment: opp.timeCommitment || opp.duration || "",
    duration: opp.duration || "",
    deadline,
    projectType: opp.compensationType || opp.projectType || "volunteer",
    compensationType: opp.compensationType || "",
    salary: opp.salary || "",
    experienceLevel: opp.experienceLevel || "",
    applicantsCount: 0,
    createdAt: opp.postedDate || opp.scrapedAt || new Date(),
    ngo: {
      name: opp.organization || "",
      logo: deriveLogoUrl(opp),
      verified: false,
    },
    skills: (opp.skillTags && opp.skillTags.length > 0) ? opp.skillTags : (opp.skillsRequired || []).map((s: any) => s.subskillId || s.categoryId).filter(Boolean),
    externalUrl: opp.sourceUrl,
    _source: "external" as const,
    _platform: opp.sourceplatform || "",
  }
}
