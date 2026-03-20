// Quick debug: what links does reliefweb.int/jobs actually have?
const urls = [
  "https://reliefweb.int/jobs",
  "https://reliefweb.int/jobs?page=1",
]

for (const testUrl of urls) {
  console.log("\n--- Testing:", testUrl, "---")
  const res = await fetch(testUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JustBeCauseBot/1.0)",
      "Accept": "text/html",
    },
    redirect: "follow",
  })
  console.log("Status:", res.status, "Final URL:", res.url)
  const html = await res.text()
  console.log("Length:", html.length)

  // Count article tags
  const articleCount = (html.match(/<article/g) || []).length
  console.log("Articles:", articleCount)

  // Find all href values
  const hrefRegex = /href="([^"]+)"/g
  const links: string[] = []
  let match
  while ((match = hrefRegex.exec(html)) !== null) {
    links.push(match[1])
  }

  // Filter for job-like links
  const jobLinks = links.filter(l => l.includes("/job/"))
  console.log("Links with /job/:", jobLinks.length)
  jobLinks.slice(0, 5).forEach(l => console.log("  ", l))

  const nodeLinks = links.filter(l => /\/node\/\d+/.test(l))
  console.log("Links with /node/:", nodeLinks.length)
  nodeLinks.slice(0, 5).forEach(l => console.log("  ", l))

  // Show all unique path prefixes
  const prefixes = new Map<string, number>()
  for (const link of links) {
    try {
      const url = new URL(link, "https://reliefweb.int")
      const prefix = url.pathname.split("/").slice(0, 3).join("/")
      prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1)
    } catch {}
  }
  console.log("Top path prefixes:")
  Array.from(prefixes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([prefix, count]) => console.log(`  ${count}x ${prefix}`))

  // Show article contents
  if (articleCount > 0) {
    const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/g
    let artMatch
    let artIdx = 0
    while ((artMatch = articleRegex.exec(html)) !== null && artIdx < 3) {
      const artHtml = artMatch[1]
      // Extract links from article
      const artLinks: string[] = []
      const artHrefRegex = /href="([^"]+)"/g
      let m
      while ((m = artHrefRegex.exec(artHtml)) !== null) {
        artLinks.push(m[1])
      }
      // Extract text
      const text = artHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      console.log(`\nArticle ${artIdx + 1}:`)
      console.log("  Text:", text.slice(0, 200))
      console.log("  Links:", artLinks)
      artIdx++
    }
  }

  break // Only test first URL
}
