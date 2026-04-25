/**
 * Algolia Full Sync — CLI
 *
 * Run: npx tsx scripts/algolia-sync.ts
 *
 * Requires env: NEXT_PUBLIC_ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY,
 * NEXT_PUBLIC_ALGOLIA_SEARCH_KEY, MONGODB_URI.
 *
 * The actual sync logic lives in lib/algolia-sync-runner.ts so the
 * CLI and the daily Vercel cron stay in lock-step.
 */

import { runAlgoliaFullSync } from "../lib/algolia-sync-runner"

async function main() {
  console.log("🚀 Algolia Full Sync (atomic replaceAllObjects)")
  console.log(`   App ID: ${process.env.NEXT_PUBLIC_ALGOLIA_APP_ID}`)

  if (!process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || !process.env.ALGOLIA_WRITE_KEY) {
    console.error("❌ Algolia credentials not set (NEXT_PUBLIC_ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY)")
    process.exit(1)
  }

  try {
    const result = await runAlgoliaFullSync()
    console.log("\n✅ Sync complete")
    console.log(`   Volunteers:    ${result.volunteers}`)
    console.log(`   NGOs:          ${result.ngos}`)
    console.log(`   Opportunities: ${result.opportunities}`)
    console.log(`   Duration:      ${(result.durationMs / 1000).toFixed(1)}s`)
    process.exit(0)
  } catch (err) {
    console.error("\n❌ Sync failed:", err)
    process.exit(1)
  }
}

main()
