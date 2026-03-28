import { scrapeIdealist } from "../lib/scraper/platforms/idealist"
import { scrapeUNJobs } from "../lib/scraper/platforms/unjobs"
import { scrapeImpactpool } from "../lib/scraper/platforms/impactpool"
import { MongoClient } from "mongodb"

const uri = "mongodb+srv://admin:ewXAu2Gg19YZbFn2@justbecause.rjzpnln.mongodb.net/?appName=justbecause"

async function run() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db("justbecause")
  const col = db.collection("externalOpportunities")
  
  let total = 0, newCount = 0
  
  const scrapers = [
    { name: "Idealist", fn: scrapeIdealist, settings: { maxPages: "25" } },
    { name: "UN Jobs", fn: scrapeUNJobs, settings: { maxPages: "15" } },
    { name: "Impactpool", fn: scrapeImpactpool, settings: { maxPages: "15" } },
  ]
  
  for (const scraper of scrapers) {
    console.log(`\n=== Scraping ${scraper.name} (${scraper.settings.maxPages} pages) ===`)
    let count = 0
    try {
      for await (const item of scraper.fn(scraper.settings)) {
        const result = await col.updateOne(
          { externalId: item.externalId },
          { $set: { ...item, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        )
        count++
        total++
        if (result.upsertedCount > 0) newCount++
        if (count % 20 === 0) process.stdout.write(`  ${count} scraped...\r`)
      }
    } catch (e: any) {
      console.error(`  Error: ${e.message}`)
    }
    console.log(`  ${scraper.name}: ${count} total scraped`)
  }
  
  const finalCount = await col.countDocuments()
  console.log(`\n=== DONE ===`)
  console.log(`Scraped: ${total} | New: ${newCount}`)
  console.log(`Total in DB: ${finalCount}`)
  
  await client.close()
}

run().catch(console.error)
