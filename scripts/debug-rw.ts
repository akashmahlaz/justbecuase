// Quick debug: what links does reliefweb.int/updates?list=Jobs actually have?
const res = await fetch("https://reliefweb.int/updates?list=Jobs&view=reports", {
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; JustBeCauseBot/1.0)",
    "Accept": "text/html",
  },
})
console.log("Status:", res.status)
const html = await res.text()
console.log("Length:", html.length)

// Find all href patterns
const hrefRegex = /href="([^"]+)"/g
const links: string[] = []
let match
while ((match = hrefRegex.exec(html)) !== null) {
  links.push(match[1])
}
console.log("Total links:", links.length)

// Group by path prefix
const prefixes = new Map<string, number>()
for (const link of links) {
  try {
    const url = new URL(link, "https://reliefweb.int")
    const prefix = url.pathname.split("/").slice(0, 3).join("/")
    prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1)
  } catch {}
}
console.log("\nLink path prefixes (count):")
Array.from(prefixes.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([prefix, count]) => console.log(`  ${count}x ${prefix}`))

// Show links containing "job"
const jobLinks = links.filter(l => l.includes("/job"))
console.log("\nLinks containing '/job':", jobLinks.length)
jobLinks.slice(0, 10).forEach(l => console.log("  ", l))

// Show links that look like listing items
const listingLinks = links.filter(l => /\/node\/\d+/.test(l))
console.log("\nLinks with /node/ID:", listingLinks.length)
listingLinks.slice(0, 10).forEach(l => console.log("  ", l))

// Check for article tags
const articleCount = (html.match(/<article/g) || []).length
console.log("\n<article> tags:", articleCount)

// Check for common listing patterns
const headingLinks = html.match(/<h[23][^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>/g) || []
console.log("\nLinks inside h2/h3:", headingLinks.length)
headingLinks.slice(0, 5).forEach(h => {
  const hrefMatch = h.match(/href="([^"]+)"/)
  const textMatch = h.match(/>([^<]+)<\/a/)
  console.log("  ", hrefMatch?.[1], "→", textMatch?.[1]?.slice(0, 60))
})

// Show a chunk of the HTML around the first interesting content area
const bodyStart = html.indexOf('<main') || html.indexOf('<div id="content"') || html.indexOf('<body')
if (bodyStart > -1) {
  console.log("\nHTML near main content (first 2000 chars):")
  console.log(html.slice(bodyStart, bodyStart + 2000))
}
