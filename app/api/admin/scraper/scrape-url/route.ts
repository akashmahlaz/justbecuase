// ============================================
// Generic URL Scraper — Admin API for on-demand scraping
// ============================================
// POST: Scrape any URL and optionally save results
// Body: { url, mode: "single"|"listing", platform?, deepScrape?, save?, selectors? }

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { scrapeSingleUrl, scrapeListingUrl } from "@/lib/scraper/platforms/generic"
import { externalOpportunitiesDb } from "@/lib/scraper/db"
import type { ScraperPlatform } from "@/lib/scraper/types"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { url, mode = "single", platform = "devex", deepScrape = false, save = false, selectors } = body

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 })
  }

  // Validate the URL format
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
  }

  try {
    if (mode === "single") {
      const opportunity = await scrapeSingleUrl(url, platform as ScraperPlatform)

      if (save) {
        const { isNew } = await externalOpportunitiesDb.upsert({
          ...opportunity,
          skillTags: opportunity.skillsRequired.map(s => s.subskillId),
          isActive: true,
          scrapedAt: new Date(),
          updatedAt: new Date(),
        })
        return NextResponse.json({ success: true, opportunity, saved: true, isNew })
      }

      return NextResponse.json({ success: true, opportunity, saved: false })
    }

    // Listing mode — scrape multiple from a search page
    const opportunities = []
    let saved = 0
    let newCount = 0

    const generator = scrapeListingUrl({
      url,
      mode: "listing",
      platform: platform as ScraperPlatform,
      deepScrape,
      maxDetailPages: parseInt(body.maxDetailPages || "20", 10),
      selectors,
    })

    for await (const opp of generator) {
      opportunities.push(opp)

      if (save) {
        const { isNew } = await externalOpportunitiesDb.upsert({
          ...opp,
          skillTags: opp.skillsRequired.map(s => s.subskillId),
          isActive: true,
          scrapedAt: new Date(),
          updatedAt: new Date(),
        })
        saved++
        if (isNew) newCount++
      }
    }

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities: opportunities.slice(0, 50), // Limit response size
      saved: save ? saved : 0,
      newItems: save ? newCount : 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scraper failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
