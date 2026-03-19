// ============================================
// Scraper Test Script — Run with: bun run scripts/test-scrapers.ts
// ============================================
// Tests each scraper independently with real HTTP calls.
// Does NOT write to the database — just prints results.

import { scrapeReliefWeb } from "../lib/scraper/platforms/reliefweb"
import { scrapeIdealist } from "../lib/scraper/platforms/idealist"
import { scrapeUNJobs } from "../lib/scraper/platforms/unjobs"
import { scrapeDevex } from "../lib/scraper/platforms/devex"
import { scrapeImpactpool } from "../lib/scraper/platforms/impactpool"
import { scrapeWorkForGood } from "../lib/scraper/platforms/workforgood"
import { scrapeDevNetJobs } from "../lib/scraper/platforms/devnetjobs"
import { fetchPage, extractPageContent, extractListings } from "../lib/scraper/text-extractor"
import { scrapeSingleUrl } from "../lib/scraper/platforms/generic"
import type { ScrapedOpportunity } from "../lib/scraper/types"

const RESET = "\x1b[0m"
const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"

function header(text: string) {
  console.log(`\n${BOLD}${CYAN}${"=".repeat(60)}${RESET}`)
  console.log(`${BOLD}${CYAN}  ${text}${RESET}`)
  console.log(`${BOLD}${CYAN}${"=".repeat(60)}${RESET}`)
}

function pass(msg: string) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`)
}

function fail(msg: string) {
  console.log(`  ${RED}✗${RESET} ${msg}`)
}

function warn(msg: string) {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}`)
}

function info(msg: string) {
  console.log(`  ${DIM}${msg}${RESET}`)
}

function printOpp(opp: ScrapedOpportunity, index: number) {
  console.log(`\n  ${BOLD}#${index + 1}${RESET} ${opp.title}`)
  info(`   Org: ${opp.organization}`)
  info(`   URL: ${opp.sourceUrl}`)
  info(`   Location: ${opp.location || "—"} | Mode: ${opp.workMode} | Type: ${opp.compensationType || "—"}`)
  info(`   Causes: ${opp.causes.slice(0, 5).join(", ") || "—"}`)
  info(`   Skills: ${opp.skillsRequired.slice(0, 3).map(s => s.subskillId).join(", ") || "—"}`)
  if (opp.description) {
    info(`   Description: ${opp.description.slice(0, 120)}...`)
  }
}

async function testScraper(
  name: string,
  fn: () => AsyncGenerator<ScrapedOpportunity>,
  expectedMin = 1
): Promise<{ name: string; count: number; success: boolean; error?: string; duration: number }> {
  header(`Testing: ${name}`)
  const start = Date.now()
  const items: ScrapedOpportunity[] = []

  try {
    for await (const item of fn()) {
      items.push(item)
      if (items.length <= 3) printOpp(item, items.length - 1)
      if (items.length >= 10) break // Limit to 10 for testing
    }

    const duration = Date.now() - start

    if (items.length >= expectedMin) {
      pass(`Scraped ${items.length} items in ${(duration / 1000).toFixed(1)}s`)
    } else if (items.length > 0) {
      warn(`Only ${items.length} items (expected ${expectedMin}+) in ${(duration / 1000).toFixed(1)}s`)
    } else {
      fail(`No items scraped in ${(duration / 1000).toFixed(1)}s`)
    }

    // Validate item structure
    if (items.length > 0) {
      const item = items[0]
      const checks = [
        { field: "title", ok: !!item.title },
        { field: "sourceUrl", ok: !!item.sourceUrl && item.sourceUrl.startsWith("http") },
        { field: "externalId", ok: !!item.externalId },
        { field: "sourceplatform", ok: !!item.sourceplatform },
        { field: "description", ok: !!item.description },
        { field: "organization", ok: !!item.organization },
        { field: "workMode", ok: ["remote", "onsite", "hybrid"].includes(item.workMode) },
      ]

      let allValid = true
      for (const check of checks) {
        if (!check.ok) {
          fail(`Missing/invalid field: ${check.field}`)
          allValid = false
        }
      }
      if (allValid) pass("All required fields present and valid")
    }

    return { name, count: items.length, success: items.length >= expectedMin, duration }
  } catch (err) {
    const duration = Date.now() - start
    const msg = err instanceof Error ? err.message : String(err)
    fail(`Error: ${msg}`)
    return { name, count: items.length, success: false, error: msg, duration }
  }
}

async function testTextExtractor() {
  header("Testing: Text Extractor Engine")
  const start = Date.now()

  try {
    // Test 1: fetchPage
    info("Fetching a real page...")
    const html = await fetchPage("https://api.reliefweb.int/v1/jobs?appname=test&limit=1&preset=latest")
    if (html && html.length > 100) {
      pass(`fetchPage works (${html.length} bytes)`)
    } else {
      fail(`fetchPage returned insufficient content (${html?.length || 0} bytes)`)
    }

    // Test 2: extractPageContent on a real page
    info("Testing extractPageContent on a real HTML page...")
    const testHtml = await fetchPage("https://www.reliefweb.int")
    const content = extractPageContent(testHtml, "https://www.reliefweb.int")
    if (content.title) {
      pass(`extractPageContent: title="${content.title.slice(0, 60)}"`)
    } else {
      warn("extractPageContent: no title extracted")
    }
    if (content.description) {
      pass(`extractPageContent: description (${content.description.length} chars)`)
    } else {
      warn("extractPageContent: no description extracted")
    }
    if (content.links.length > 0) {
      pass(`extractPageContent: ${content.links.length} links found`)
    }
    info(`Tags: ${content.tags.slice(0, 5).join(", ") || "none"}`)
    info(`Metadata keys: ${Object.keys(content.metadata).slice(0, 5).join(", ")}`)

    // Test 3: extractListings on a real listing page
    info("Testing extractListings on reliefweb...")
    const listingsHtml = await fetchPage("https://reliefweb.int/updates?list=Jobs")
    const listings = extractListings(listingsHtml, "https://reliefweb.int")
    if (listings.length > 0) {
      pass(`extractListings: found ${listings.length} items`)
      info(`  First: "${listings[0].title}" → ${listings[0].url}`)
    } else {
      warn("extractListings: no listings found (page structure may have changed)")
    }

    const duration = Date.now() - start
    pass(`Text extractor tests done in ${(duration / 1000).toFixed(1)}s`)
    return { name: "Text Extractor", count: listings.length, success: true, duration }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    fail(`Text extractor error: ${msg}`)
    return { name: "Text Extractor", count: 0, success: false, error: msg, duration: Date.now() - start }
  }
}

async function testGenericScraper() {
  header("Testing: Generic URL Scraper")
  const start = Date.now()

  try {
    // Test scraping a single ReliefWeb job page via the generic scraper
    info("Scraping a ReliefWeb job listing via generic single-URL scraper...")

    // First get a real job URL from the API
    const apiRes = await fetch("https://api.reliefweb.int/v1/jobs?appname=test&limit=1&preset=latest&fields[include][]=url")
    const apiData = await apiRes.json()
    const jobUrl = apiData.data?.[0]?.fields?.url

    if (!jobUrl) {
      warn("Could not get a test job URL from ReliefWeb API")
      return { name: "Generic Scraper", count: 0, success: false, error: "No test URL", duration: Date.now() - start }
    }

    info(`Test URL: ${jobUrl}`)
    const opp = await scrapeSingleUrl(jobUrl, "reliefweb")

    if (opp.title) {
      pass(`Title: ${opp.title}`)
      info(`  Org: ${opp.organization}`)
      info(`  Location: ${opp.location || "—"} | Mode: ${opp.workMode}`)
      info(`  Causes: ${opp.causes.slice(0, 5).join(", ") || "—"}`)
      info(`  Description: ${opp.description.slice(0, 150)}...`)
      pass("Generic single-URL scraper works")
    } else {
      fail("No title extracted")
    }

    const duration = Date.now() - start
    return { name: "Generic Scraper", count: 1, success: !!opp.title, duration }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    fail(`Error: ${msg}`)
    return { name: "Generic Scraper", count: 0, success: false, error: msg, duration: Date.now() - start }
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║        JustBeCause Scraper Test Suite                ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}`)
  console.log(`${DIM}  Running at ${new Date().toISOString()}${RESET}\n`)

  const results: { name: string; count: number; success: boolean; error?: string; duration: number }[] = []

  // 1. Text Extractor (foundation — test first)
  results.push(await testTextExtractor())

  // 2. ReliefWeb (HTML scraping)
  results.push(await testScraper("ReliefWeb (HTML)", () => scrapeReliefWeb({ maxPages: "1" }), 3))

  // 3. Generic URL scraper
  results.push(await testGenericScraper())

  // 4. Idealist (HTML)
  results.push(await testScraper("Idealist (HTML)", () => scrapeIdealist({ maxPages: "1" }), 1))

  // 5. UN Jobs (HTML)
  results.push(await testScraper("UN Jobs (HTML)", () => scrapeUNJobs({ maxPages: "1" }), 1))

  // 6. Devex — DISABLED (JS SPA)
  results.push(await testScraper("Devex (DISABLED)", () => scrapeDevex({ maxPages: "1" }), 0))

  // 7. Impactpool (HTML)
  results.push(await testScraper("Impactpool (HTML)", () => scrapeImpactpool({ maxPages: "1" }), 1))

  // 8. WorkForGood — DISABLED (not a job board)
  results.push(await testScraper("WorkForGood (DISABLED)", () => scrapeWorkForGood({ maxPages: "1" }), 0))

  // 9. DevNetJobs — DISABLED (ASP.NET postback)
  results.push(await testScraper("DevNetJobs (DISABLED)", () => scrapeDevNetJobs({ maxPages: "1" }), 0))

  // ============================================
  // SUMMARY
  // ============================================
  header("TEST SUMMARY")
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  for (const r of results) {
    const icon = r.success ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
    const count = r.count > 0 ? `${r.count} items` : "0 items"
    const time = `${(r.duration / 1000).toFixed(1)}s`
    const err = r.error ? ` ${RED}(${r.error.slice(0, 50)})${RESET}` : ""
    console.log(`  ${icon} ${r.name.padEnd(25)} ${count.padEnd(12)} ${time}${err}`)
  }

  console.log(`\n  ${BOLD}Results: ${GREEN}${passed} passed${RESET}, ${failed > 0 ? `${RED}${failed} failed` : `${GREEN}0 failed`}${RESET}`)
  console.log(`  ${DIM}Total time: ${(results.reduce((s, r) => s + r.duration, 0) / 1000).toFixed(1)}s${RESET}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error(`\n${RED}Fatal error:${RESET}`, err)
  process.exit(1)
})
