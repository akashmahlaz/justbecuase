import { NextResponse } from "next/server"
import { fetchAllJobsUnfiltered, mapApiJobToOpportunity } from "@/lib/reliefweb-api"
import { fetchAllIdealistJobs } from "@/lib/idealist-fast-fetch"
import { externalOpportunitiesDb } from "@/lib/scraper"
import type { ExternalOpportunity, ScraperPlatform } from "@/lib/scraper/types"
import { sendEmail } from "@/lib/email"
import { runTheirStackSync } from "@/lib/theirstack-sync"
import { getDb } from "@/lib/database"

export const maxDuration = 800 // Vercel Pro max for high-volume sync

const BATCH_SIZE = 200 // Bulk upsert batch size
const MAX_IDEALIST_FETCH = Number(process.env.IDEALIST_MAX_DETAIL_FETCH || 5000)
const DEFAULT_NOTIFY_EMAIL = "akashdalla409@gmail.com"
const DEFAULT_THEIRSTACK_MAX_JOBS = 1000
const SYNC_PLATFORMS: ScraperPlatform[] = ["reliefweb-api", "idealist-api", "theirstack"]

// ============================================
// GET /api/cron/fetch-5k — High-volume sync
// ============================================
// Fetches maximum volume from ReliefWeb (~500-900 remote jobs) + Idealist (~500-2000 remote jobs)
// + TheirStack, then bulk-upserts them into externalOpportunities.
//
// Performance targets:
// - ReliefWeb: ~913 API call → bulk upsert in ~5-10s
// - Idealist: ~3000 detail fetches (parallel) + bulk upsert in ~2-5min
// - Total: < 10 minutes
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    const requestUrl = new URL(request.url)
    const isLocalDevelopment =
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1", "::1"].includes(requestUrl.hostname)

    if (auth !== `Bearer ${cronSecret}` && !isLocalDevelopment) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const includeReliefWeb = searchParams.get("includeReliefWeb") !== "false"
  const includeIdealist = searchParams.get("includeIdealist") !== "false"
  const includeTheirStack =
    searchParams.get("includeTheirStack") !== "false" &&
    process.env.THEIRSTACK_SYNC_ENABLED !== "false"
  const idealistMaxFetch = Number(searchParams.get("idealistMaxFetch") || MAX_IDEALIST_FETCH)
  const idealistMaxPages = Number(searchParams.get("idealistMaxPages") || process.env.IDEALIST_MAX_LISTING_PAGES || 120)
  const theirStackMaxJobs = Number(
    searchParams.get("theirStackMaxJobs") ||
      process.env.THEIRSTACK_SYNC_MAX_JOBS ||
      DEFAULT_THEIRSTACK_MAX_JOBS
  )
  const countsBefore = await safeGetActiveRemoteCounts()
  const stats = {
    reliefweb: { total: 0, remoteOnly: 0, relevant: 0, new: 0, updated: 0, errors: 0 },
    idealist: { total: 0, remoteOnly: 0, relevant: 0, new: 0, updated: 0, errors: 0 },
    theirstack: {
      total: 0,
      relevant: 0,
      new: 0,
      updated: 0,
      errors: 0,
      skippedReason: includeTheirStack ? null as string | null : "Disabled",
    },
  }

  // ── ReliefWeb ────────────────────────────────────────────────
  if (includeReliefWeb) try {
    console.log("[fetch-5k] Fetching ReliefWeb...")
    const { jobs: rwJobs } = await fetchAllJobsUnfiltered()
    stats.reliefweb.total = rwJobs.length

    // Filter to remote-only jobs that map into our platform categories.
    const mappedOpps = rwJobs
      .map(job => {
        const opp = mapApiJobToOpportunity(job)
        opp.scrapedAt = new Date()
        opp.updatedAt = new Date()
        return opp
      })
    const remoteOpps = mappedOpps.filter(opp => opp.workMode === "remote")
    const relevantRemoteOpps = remoteOpps.filter(isRemoteRelevantOpportunity)

    stats.reliefweb.remoteOnly = remoteOpps.length
    stats.reliefweb.relevant = relevantRemoteOpps.length
    console.log(`[fetch-5k] ReliefWeb: ${stats.reliefweb.total} total, ${stats.reliefweb.remoteOnly} remote, ${stats.reliefweb.relevant} relevant`)

    // Bulk upsert in batches
    for (let i = 0; i < relevantRemoteOpps.length; i += BATCH_SIZE) {
      const batch = relevantRemoteOpps.slice(i, i + BATCH_SIZE)
      try {
        const { inserted, updated } = await externalOpportunitiesDb.bulkUpsert(batch)
        stats.reliefweb.new += inserted
        stats.reliefweb.updated += updated
      } catch (e: any) {
        console.error(`[fetch-5k] RW batch error: ${e.message}`)
        stats.reliefweb.errors += batch.length
      }
    }
    console.log(`[fetch-5k] ReliefWeb: ${stats.reliefweb.new} new, ${stats.reliefweb.updated} updated`)
  } catch (e: any) {
    console.error("[fetch-5k] ReliefWeb fatal:", e.message)
  }

  // ── Idealist ────────────────────────────────────────────────
  if (includeIdealist) try {
    console.log("[fetch-5k] Fetching Idealist (parallel detail fetching)...")
    const istStart = Date.now()
    const { opportunities: fetchedOpportunities, lastUpdated } = await fetchAllIdealistJobs(idealistMaxFetch, idealistMaxPages)
    const relevantOpportunities = fetchedOpportunities.filter(isRemoteRelevantOpportunity)
    if (lastUpdated) {
      console.log(`[fetch-5k] Idealist last updated: ${lastUpdated}`)
    }
    stats.idealist.total = opportunities.length
    stats.idealist.remoteOnly = opportunities.length
    stats.idealist.relevant = relevantOpportunities.length
    console.log(`[fetch-5k] Idealist: ${stats.idealist.total} remote opportunities, ${stats.idealist.relevant} relevant`)

    // Bulk upsert in batches
    for (let i = 0; i < relevantOpportunities.length; i += BATCH_SIZE) {
      const batch = relevantOpportunities.slice(i, i + BATCH_SIZE)
      try {
        const { inserted, updated } = await externalOpportunitiesDb.bulkUpsert(batch)
        stats.idealist.new += inserted
        stats.idealist.updated += updated
      } catch (e: any) {
        console.error(`[fetch-5k] IST batch error: ${e.message}`)
        stats.idealist.errors += batch.length
      }
    }
    console.log(`[fetch-5k] Idealist: ${stats.idealist.new} new, ${stats.idealist.updated} updated in ${((Date.now() - istStart) / 1000).toFixed(1)}s`)
  } catch (e: any) {
    console.error("[fetch-5k] Idealist fatal:", e.message)
  }

  // ── TheirStack ──────────────────────────────────────────────
  if (includeTheirStack && theirStackMaxJobs > 0) {
    try {
      console.log(`[fetch-5k] Fetching TheirStack (up to ${theirStackMaxJobs} jobs)...`)
      const result = await runTheirStackSync({
        preview: false,
        remoteOnly: true,
        onlyWithContacts: false,
        maxAgeDays: 30,
        maxJobs: theirStackMaxJobs,
        maxPages: Math.max(1, Math.ceil(theirStackMaxJobs / 25)),
        pageSize: 25,
      })
      stats.theirstack.total = result.stats.uniqueJobs
      stats.theirstack.relevant = result.stats.uniqueJobs
      stats.theirstack.new = result.stats.inserted
      stats.theirstack.updated = result.stats.updated
      stats.theirstack.skippedReason = result.stats.skippedReason ?? null
      console.log(
        `[fetch-5k] TheirStack: ${result.stats.uniqueJobs} fetched | ${result.stats.inserted} new | ${result.stats.updated} updated`
      )
    } catch (e: any) {
      console.error("[fetch-5k] TheirStack fatal:", e.message)
      stats.theirstack.errors += 1
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const grandNew = stats.reliefweb.new + stats.idealist.new + stats.theirstack.new
  const grandUpdated = stats.reliefweb.updated + stats.idealist.updated + stats.theirstack.updated
  const grandTotal = stats.reliefweb.relevant + stats.idealist.relevant + stats.theirstack.relevant
  const countsAfter = await safeGetActiveRemoteCounts()

  // Email notification
  let emailStatus = "skipped"
  try {
    const email = process.env.CRON_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL
    if (email) {
      const sent = await sendEmail({
        to: email,
        subject: `[Cron] fetch-5k — ${grandNew} new, ${grandTotal} total | ${totalElapsed}s`,
        html: getHighVolumeSyncEmailHtml({ stats, grandTotal, grandNew, grandUpdated, totalElapsed, countsBefore, countsAfter }),
      })
      emailStatus = sent ? "sent" : "failed"
    }
  } catch (error) {
    emailStatus = `error: ${String(error)}`
    console.error("[fetch-5k] Email notification failed:", error)
  }

  return NextResponse.json({
    success: true,
    stats,
    grandTotal,
    grandNew,
    grandUpdated,
    activeRemoteCounts: {
      before: countsBefore,
      after: countsAfter,
      delta: countsAfter.total - countsBefore.total,
    },
    emailStatus,
    elapsedSeconds: parseFloat(totalElapsed),
  })
}

function isRemoteRelevantOpportunity(opp: Omit<ExternalOpportunity, "_id">): boolean {
  return (
    opp.workMode === "remote" &&
    (
      (opp.causes?.length ?? 0) > 0 ||
      (opp.skillsRequired?.length ?? 0) > 0 ||
      (opp.skillTags?.length ?? 0) > 0
    )
  )
}

async function getActiveRemoteCounts() {
  const db = await getDb()
  const collection = db.collection("externalOpportunities")
  const byPlatform = Object.fromEntries(SYNC_PLATFORMS.map((platform) => [platform, 0])) as Record<ScraperPlatform, number>
  const rows = await collection.aggregate<{ _id: ScraperPlatform; count: number }>([
    { $match: { isActive: true, workMode: "remote", sourceplatform: { $in: SYNC_PLATFORMS } } },
    { $group: { _id: "$sourceplatform", count: { $sum: 1 } } },
  ]).toArray()

  for (const row of rows) {
    byPlatform[row._id] = row.count
  }

  return {
    ...byPlatform,
    total: rows.reduce((sum, row) => sum + row.count, 0),
  }
}

async function safeGetActiveRemoteCounts() {
  try {
    return await getActiveRemoteCounts()
  } catch (error) {
    console.error("[fetch-5k] Failed to read active remote counts:", error)
    return {
      ...Object.fromEntries(SYNC_PLATFORMS.map((platform) => [platform, 0])) as Record<ScraperPlatform, number>,
      total: 0,
    }
  }
}

function getHighVolumeSyncEmailHtml({
  stats,
  grandTotal,
  grandNew,
  grandUpdated,
  totalElapsed,
  countsBefore,
  countsAfter,
}: {
  stats: {
    reliefweb: { total: number; relevant: number; new: number; updated: number; errors: number }
    idealist: { total: number; relevant: number; new: number; updated: number; errors: number }
    theirstack: { total: number; relevant: number; new: number; updated: number; errors: number; skippedReason: string | null }
  }
  grandTotal: number
  grandNew: number
  grandUpdated: number
  totalElapsed: string
  countsBefore: Awaited<ReturnType<typeof getActiveRemoteCounts>>
  countsAfter: Awaited<ReturnType<typeof getActiveRemoteCounts>>
}) {
  const activeDelta = countsAfter.total - countsBefore.total
  const deltaLabel = activeDelta >= 0 ? `+${activeDelta}` : String(activeDelta)

  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:620px;color:#0f172a">
      <h2 style="margin:0 0 12px">High-volume job fetch complete</h2>
      <p style="margin:0 0 16px;color:#475569">Remote, relevant jobs from ReliefWeb, Idealist, and TheirStack. Run time: ${totalElapsed}s.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="background:#f8fafc"><th style="text-align:left;padding:10px;border-bottom:1px solid #e2e8f0">Source</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Fetched</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Relevant</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">New</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Updated</th><th style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">Errors</th></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">ReliefWeb</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.reliefweb.total}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.reliefweb.relevant}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.reliefweb.new}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.reliefweb.updated}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.reliefweb.errors}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">Idealist</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.idealist.total}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.idealist.relevant}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.idealist.new}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.idealist.updated}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.idealist.errors}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">TheirStack${stats.theirstack.skippedReason ? ` (${stats.theirstack.skippedReason})` : ""}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.theirstack.total}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.theirstack.relevant}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.theirstack.new}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.theirstack.updated}</td><td style="text-align:right;padding:10px;border-bottom:1px solid #e2e8f0">${stats.theirstack.errors}</td></tr>
        <tr style="font-weight:700"><td style="padding:10px">Run total</td><td style="text-align:right;padding:10px">${grandTotal}</td><td style="text-align:right;padding:10px">${grandTotal}</td><td style="text-align:right;padding:10px">${grandNew}</td><td style="text-align:right;padding:10px">${grandUpdated}</td><td style="text-align:right;padding:10px">${stats.reliefweb.errors + stats.idealist.errors + stats.theirstack.errors}</td></tr>
      </table>
      <div style="margin-top:16px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
        <strong>Active remote database count:</strong> ${countsBefore.total} -> ${countsAfter.total} (${deltaLabel})
      </div>
    </div>
  `
}
