/**
 * One-off scraping test for the keyword "SOCIAL ENTERPRISE JOBS".
 *
 * Hits multiple sources (search-page URLs, no DB writes) and reports:
 *   - source
 *   - listing count
 *   - sample titles + orgs
 *
 * Run:  bun run scripts/test-scrape-social-enterprise.ts
 */

import { fetchPage, extractListings } from "../lib/scraper/text-extractor"

const KEYWORD = "SOCIAL ENTERPRISE JOBS"
const Q = encodeURIComponent(KEYWORD)
const Q_LOWER = encodeURIComponent(KEYWORD.toLowerCase())

type Source = {
  name: string
  url: string
}

const SOURCES: Source[] = [
  { name: "ReliefWeb",  url: `https://reliefweb.int/jobs?search=${Q_LOWER}` },
  { name: "Idealist",   url: `https://www.idealist.org/en/jobs?q=${Q}` },
  { name: "Catchafire", url: `https://www.catchafire.org/search/?q=${Q}` },
  { name: "Impactpool", url: `https://www.impactpool.org/jobs?keyword=${Q}` },
  { name: "Devex",      url: `https://www.devex.com/jobs/search/?filter%5Bkeywords%5D=${Q}` },
  { name: "WorkForGood",url: `https://www.workforgood.org/search?q=${Q}` },
  { name: "CharityJob", url: `https://www.charityjob.co.uk/jobs?Keywords=${Q}` },
  { name: "UNJobs",     url: `https://unjobs.org/search?keywords=${Q}` },
]

async function probe(src: Source) {
  const t0 = Date.now()
  try {
    const html = await fetchPage(src.url)
    const baseUrl = new URL(src.url).origin
    const listings = extractListings(html, baseUrl)
    const ms = Date.now() - t0
    console.log(`\n=== ${src.name}  (${ms}ms) ===`)
    console.log(`URL:       ${src.url}`)
    console.log(`HTML size: ${html.length} bytes`)
    console.log(`Listings:  ${listings.length}`)
    listings.slice(0, 5).forEach((l, i) => {
      console.log(`  [${i + 1}] ${l.title?.slice(0, 100) || "(no title)"}`)
      if (l.organization) console.log(`        org: ${l.organization}`)
      if (l.location) console.log(`        loc: ${l.location}`)
      console.log(`        url: ${l.url}`)
    })
    return { source: src.name, listings: listings.length, ok: true as const }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`\n=== ${src.name}  (FAIL) ===`)
    console.log(`URL: ${src.url}`)
    console.log(`Error: ${msg}`)
    return { source: src.name, listings: 0, ok: false as const, error: msg }
  }
}

async function main() {
  console.log(`\n>>> Testing scrape for keyword: "${KEYWORD}"\n`)
  const results: Array<Awaited<ReturnType<typeof probe>>> = []
  for (const src of SOURCES) {
    results.push(await probe(src))
    await new Promise((r) => setTimeout(r, 1500))
  }
  console.log("\n\n=========== SUMMARY ===========")
  for (const r of results) {
    const tag = r.ok ? "OK " : "ERR"
    console.log(`[${tag}] ${r.source.padEnd(12)} → ${r.listings} listings`)
  }
  const total = results.reduce((s, r) => s + r.listings, 0)
  console.log(`\nTotal listings across all sources: ${total}`)
}

void main()
