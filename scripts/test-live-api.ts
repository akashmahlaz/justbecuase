/**
 * Test the LIVE unified-search API endpoint to debug what's actually returned
 * for "web designer 10 year experience"
 * 
 * Run: bunx tsx scripts/test-live-api.ts
 */

const BASE_URL = "https://justbecausenetwork.com"
const QUERY = "web designer 10 year experience"

async function main() {
  console.log("=" .repeat(80))
  console.log("  LIVE API DEBUG — unified-search endpoint")
  console.log("=".repeat(80))
  console.log(`  URL: ${BASE_URL}/api/unified-search`)
  console.log(`  Query: "${QUERY}"`)
  console.log()

  // 1. Call the API
  const url = `${BASE_URL}/api/unified-search?q=${encodeURIComponent(QUERY)}&types=volunteer&limit=30`
  console.log(`📡 Fetching: ${url}\n`)
  
  const resp = await fetch(url)
  const status = resp.status
  console.log(`  Status: ${status}`)
  
  if (status !== 200) {
    console.log(`  ❌ Non-200 status. Body:`)
    console.log(await resp.text())
    return
  }

  const data = await resp.json()
  
  // 2. Inspect top-level structure
  console.log(`\n📦 Response structure:`)
  console.log(`  Keys: ${Object.keys(data).join(", ")}`)
  
  const volunteers = data.results?.volunteer || data.volunteers || data.results || []
  console.log(`  Volunteer results count: ${Array.isArray(volunteers) ? volunteers.length : "N/A (not array)"}`)
  
  if (data.meta) {
    console.log(`\n📋 Meta:`)
    console.log(JSON.stringify(data.meta, null, 2))
  }
  
  if (data.debug) {
    console.log(`\n🔍 Debug info from server:`)
    console.log(JSON.stringify(data.debug, null, 2))
  }

  // 3. Inspect each volunteer result
  if (Array.isArray(volunteers) && volunteers.length > 0) {
    console.log(`\n${"─".repeat(80)}`)
    console.log(`  VOLUNTEER RESULTS (${volunteers.length} total)`)
    console.log(`${"─".repeat(80)}`)
    
    for (let i = 0; i < volunteers.length; i++) {
      const v = volunteers[i]
      console.log(`\n  [${i + 1}] ${v.name || v.title || "Unknown"}`)
      console.log(`      ID: ${v.id || "N/A"} | mongoId: ${v.mongoId || "N/A"} | userId: ${v.userId || "N/A"}`)
      console.log(`      Score: ${v.score ?? v._score ?? "N/A"}`)
      console.log(`      Title: ${v.title || "N/A"}`)
      console.log(`      Headline: ${v.headline || "N/A"}`)
      console.log(`      Skills: ${(v.skillNames || v.skills || []).join(", ") || "N/A"}`)
      console.log(`      Experience: ${v.experienceLevel || "N/A"}`)
      console.log(`      Rate: ${v.hourlyRate || v.rate || "N/A"}`)
      console.log(`      Pricing: ${v.pricingType || "N/A"}`)
      
      // Check if this person is actually a web designer
      const allText = [
        v.title, v.headline, v.description,
        ...(v.skillNames || v.skills || [])
      ].filter(Boolean).join(" ").toLowerCase()
      
      const isRelevant = /web|design|wordpress|html|css|figma|ux|ui|website/.test(allText)
      console.log(`      Relevant to "web designer"? ${isRelevant ? "✅ YES" : "❌ NO — WHY IS THIS HERE?"}`)
    }
  }

  // 4. Also test what the raw ES query might look like by checking the debug endpoint if exists
  console.log(`\n${"─".repeat(80)}`)
  console.log(`  RAW RESPONSE DUMP (first 3 results, all fields)`)
  console.log(`${"─".repeat(80)}`)
  
  if (Array.isArray(volunteers)) {
    for (let i = 0; i < Math.min(3, volunteers.length); i++) {
      console.log(`\n  [${i + 1}] ALL FIELDS:`)
      console.log(JSON.stringify(volunteers[i], null, 4))
    }
  }
  
  // 5. Check if there's an ES-specific result set vs MongoDB fallback
  if (data.source) {
    console.log(`\n⚡ Data source: ${data.source}`)
  }
  
  // 6. Count: how many volunteers BIG PICTURE have web design skills
  if (Array.isArray(volunteers)) {
    const webDesignRelated = volunteers.filter((v: any) => {
      const allText = [
        v.title, v.headline, v.description,
        ...(v.skillNames || v.skills || [])
      ].filter(Boolean).join(" ").toLowerCase()
      return /web|design|wordpress|html|css|figma|ux|ui|website/.test(allText)
    })
    
    console.log(`\n📊 RELEVANCE SUMMARY:`)
    console.log(`   Total results: ${volunteers.length}`)
    console.log(`   Relevant to "web designer": ${webDesignRelated.length}`)
    console.log(`   Irrelevant: ${volunteers.length - webDesignRelated.length}`)
    
    if (volunteers.length - webDesignRelated.length > 0) {
      console.log(`\n   ⚠️ IRRELEVANT RESULTS:`)
      for (const v of volunteers) {
        const allText = [
          v.title, v.headline, v.description,
          ...(v.skillNames || v.skills || [])
        ].filter(Boolean).join(" ").toLowerCase()
        const isRelevant = /web|design|wordpress|html|css|figma|ux|ui|website/.test(allText)
        if (!isRelevant) {
          console.log(`     - ${v.name || v.title}: skills=[${(v.skillNames || v.skills || []).join(", ")}]`)
        }
      }
    }
  }

  console.log("\n\nDone.")
}

main().catch(console.error)
