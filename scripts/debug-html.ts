// Deep HTML analysis of platforms that need fixing

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
}

async function analyze(name: string, url: string, patterns: string[]) {
  console.log(`\n=== ${name} ===`)
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) })
    const html = await res.text()

    for (const p of patterns) {
      const regex = new RegExp(p, "gi")
      const matches = html.match(regex)
      console.log(`"${p}": ${matches?.length || 0} matches`)
      if (matches) {
        matches.slice(0, 3).forEach(m => console.log(`  ${m.slice(0, 200)}`))
      }
    }
  } catch (err: any) {
    console.log(`Error: ${err.message}`)
  }
}

// ReliefWeb — try different appnames
console.log("=== ReliefWeb API appname test ===")
for (const name of ["rwint-user-0", "rw-user-0", "apidoc", "test"]) {
  const res = await fetch(`https://api.reliefweb.int/v1/jobs?appname=${name}&limit=1&preset=latest`, {
    headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000)
  })
  const data = await res.json()
  console.log(`appname="${name}": status=${res.status} jobs=${data.data?.length || 0} ${data.error ? 'ERROR: ' + data.error.message?.slice(0, 80) : 'OK'}`)
  if (data.data?.length > 0) break
}

// Idealist — find the actual listing selectors
await analyze("Idealist", "https://www.idealist.org/en/volunteer-opportunities?page=1&q=&type=VOLOP&remote=TRUE", [
  '<a[^>]*href="[^"]*volunteer-opp[^"]*"',
  'data-[a-z]+="[^"]*listing[^"]*"',
  'class="[^"]*listing[^"]*"',
  'class="[^"]*search-result[^"]*"',
  'class="[^"]*result-card[^"]*"',
  '<script[^>]*type="application/ld\\+json"',
  'window\\.__NEXT_DATA__',
  'window\\.__INITIAL',
])

// UNJobs — check article structure
await analyze("UNJobs", "https://unjobs.org", [
  '<article[^>]*>',
  'href="[^"]*vacancies/[^"]*"',
  'class="[^"]*vacancy[^"]*"',
  '<td[^>]*>.*?</td>',
])

// Impactpool — find job link patterns
await analyze("Impactpool", "https://www.impactpool.org/jobs", [
  '<article[^>]*>',
  'href="[^"]*jobs/[0-9]+[^"]*"',
  'href="/jobs/[^"]*"',
  'class="[^"]*job[^"]*"',
  'data-[a-z]+="[^"]*job[^"]*"',
  'turbo-frame',
])

// WorkForGood — find correct URL
await analyze("WorkForGood", "https://www.workforgood.co.uk", [
  'href="[^"]*job[^"]*"',
  'href="[^"]*search[^"]*"',
  'href="[^"]*vacanc[^"]*"',
  'href="[^"]*role[^"]*"',
  'href="[^"]*opportunit[^"]*"',
])

// DevNetJobs — find actual job links
await analyze("DevNetJobs", "https://www.devnetjobs.org", [
  'href="[^"]*jobDetail[^"]*"',
  'href="[^"]*search_jobs[^"]*"',
  'class="[^"]*job[^"]*"',
  'href="[^"]*aspx[^"]*"',
])

// Try correct devnetjobs job search page
await analyze("DevNetJobs Search", "https://www.devnetjobs.org/search_jobs.aspx", [
  'href="[^"]*jobDetail[^"]*"',
  'class="[^"]*job[^"]*"',
  'class="[^"]*card[^"]*"',
  '<article[^>]*>',
])
