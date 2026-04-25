import { NextRequest, NextResponse } from "next/server"
import { runScraper, runAllScrapers, scraperConfigsDb, scraperRunsDb, externalOpportunitiesDb } from "@/lib/scraper"
import type { ScraperPlatform } from "@/lib/scraper"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export const maxDuration = 300 // 5 min for Vercel Pro

const VALID_PLATFORMS: ScraperPlatform[] = ["reliefweb", "idealist", "unjobs", "devex", "impactpool", "workforgood", "devnetjobs"]

// ============================================
// GET /api/admin/scraper — Get scraper status & configs
// ============================================
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [configs, recentRuns, opportunityCounts] = await Promise.all([
    scraperConfigsDb.getAll(),
    scraperRunsDb.findRecent(30),
    externalOpportunitiesDb.countByPlatform(),
  ])

  // Seed defaults if empty
  if (configs.length === 0) {
    await scraperConfigsDb.seedDefaults()
    const seededConfigs = await scraperConfigsDb.getAll()
    return NextResponse.json({
      configs: seededConfigs,
      recentRuns,
      opportunityCounts,
      totalOpportunities: Object.values(opportunityCounts).reduce((a, b) => a + b, 0),
    })
  }

  return NextResponse.json({
    configs,
    recentRuns,
    opportunityCounts,
    totalOpportunities: Object.values(opportunityCounts).reduce((a, b) => a + b, 0),
  })
}

// ============================================
// POST /api/admin/scraper — Trigger a scraper run
// ============================================
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { action, platform } = body

  if (action === "run") {
    if (platform && platform !== "all") {
      if (!VALID_PLATFORMS.includes(platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
      }
      const result = await runScraper(platform, "manual")
      return NextResponse.json({ success: true, result })
    }

    const results = await runAllScrapers("manual")
    return NextResponse.json({ success: true, results })
  }

  if (action === "toggle") {
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
    }
    const config = await scraperConfigsDb.getByPlatform(platform)
    if (config) {
      await scraperConfigsDb.upsert({ ...config, enabled: !config.enabled })
      return NextResponse.json({ success: true, enabled: !config.enabled })
    }
    return NextResponse.json({ error: "Config not found" }, { status: 404 })
  }

  if (action === "seed") {
    await scraperConfigsDb.seedDefaults()
    await externalOpportunitiesDb.ensureIndexes()
    return NextResponse.json({ success: true, message: "Defaults seeded and indexes created" })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
