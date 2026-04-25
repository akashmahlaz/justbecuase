// Quick debug script to check platform HTML structures
const platforms = [
  { name: "ReliefWeb API", url: "https://api.reliefweb.int/v1/jobs?appname=justbecausenetwork&limit=2&preset=latest&fields[include][]=title&fields[include][]=url&fields[include][]=source&fields[include][]=country&fields[include][]=date", isJson: true },
  { name: "UNJobs", url: "https://unjobs.org" },
  { name: "Idealist", url: "https://www.idealist.org/en/volunteer-opportunities?page=1&q=&type=VOLOP&remote=TRUE" },
  { name: "Devex", url: "https://www.devex.com/jobs/search" },
  { name: "Impactpool", url: "https://www.impactpool.org/jobs" },
  { name: "WorkForGood", url: "https://www.workforgood.co.uk/jobs" },
  { name: "DevNetJobs", url: "https://www.devnetjobs.org" },
]

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

for (const p of platforms) {
  console.log(`\n=== ${p.name} ===`)
  console.log(`URL: ${p.url}`)
  try {
    const res = await fetch(p.url, { headers: p.isJson ? { Accept: "application/json" } : HEADERS, signal: AbortSignal.timeout(15000) })
    console.log(`Status: ${res.status}`)
    const text = await res.text()
    console.log(`Size: ${text.length} bytes`)

    if (p.isJson) {
      const json = JSON.parse(text)
      console.log(`Jobs: ${json.data?.length || 0}`)
      if (json.data?.[0]) {
        console.log(`First: ${JSON.stringify(json.data[0].fields?.title || json.data[0]).slice(0, 120)}`)
      }
      if (json.error) console.log(`Error: ${JSON.stringify(json.error)}`)
    } else {
      // Count job-like links
      const allLinks = text.match(/href="[^"]+"/g) || []
      console.log(`Total links: ${allLinks.length}`)

      // Look for vacancy/job patterns
      const jobLinks = allLinks.filter(l =>
        /vacanc|job|position|opportunit|career|posting|listing/i.test(l)
      )
      console.log(`Job-like links: ${jobLinks.length}`)
      jobLinks.slice(0, 5).forEach(l => console.log(`  ${l}`))

      // Check for common listing patterns
      const hasCards = /class="[^"]*card/i.test(text)
      const hasTable = /<table/i.test(text)
      const hasArticles = /<article/i.test(text)
      console.log(`Structure: cards=${hasCards} table=${hasTable} articles=${hasArticles}`)

      // Show title
      const titleMatch = text.match(/<title>([^<]+)<\/title>/i)
      console.log(`Title: ${titleMatch?.[1]?.trim() || "none"}`)
    }
  } catch (err: any) {
    console.log(`Error: ${err.message}`)
  }
}
