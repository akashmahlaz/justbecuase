// DevNetJobs + Impactpool detailed structure
import * as cheerio from "cheerio"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
}

// DevNetJobs — inspect the job columns
console.log("=== DevNetJobs standardJobCol ===")
{
  const res = await fetch("https://www.devnetjobs.org", { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  // standardJobCol has the actual job listings
  const col = $(".standardJobCol")
  console.log(`standardJobCol children: ${col.children().length}`)

  // Get links inside
  const links = col.find("a")
  console.log(`Links in standardJobCol: ${links.length}`)

  links.slice(0, 5).each((i, el) => {
    const $el = $(el)
    const href = $el.attr("href") || ""
    const text = $el.text().trim().replace(/\s+/g, " ")
    console.log(`\n  #${i + 1}: ${text.slice(0, 100)}`)
    console.log(`  href: ${href}`)
    console.log(`  parent: ${$el.parent().prop("tagName")} class: ${$el.parent().attr("class")?.slice(0, 40)}`)
  })

  // Check highlightedJobs too
  const hl = $("#highlightedJobs")
  const hlLinks = hl.find("a")
  console.log(`\nhighlightedJobs links: ${hlLinks.length}`)
  hlLinks.slice(0, 3).each((i, el) => {
    const $el = $(el)
    console.log(`  ${$el.text().trim().replace(/\s+/g, " ").slice(0, 80)} → ${$el.attr("href")}`)
  })
}

// Impactpool — look at .job div structure
console.log("\n=== Impactpool .job divs ===")
{
  const res = await fetch("https://www.impactpool.org/jobs", { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  const jobDivs = $("div.job")
  console.log(`div.job count: ${jobDivs.length}`)

  jobDivs.slice(0, 3).each((i, el) => {
    const $el = $(el)
    const link = $el.find("a").first()
    const href = link.attr("href") || ""
    const fullText = $el.text().trim().replace(/\s+/g, " ")
    console.log(`\n  #${i + 1}:`)
    console.log(`  href: ${href}`)
    console.log(`  text: ${fullText.slice(0, 200)}`)

    // Find org, location, etc.
    const children = $el.children()
    children.each((ci, child) => {
      const tag = $(child).prop("tagName")
      const cls = $(child).attr("class") || ""
      const txt = $(child).text().trim().replace(/\s+/g, " ").slice(0, 80)
      if (txt) console.log(`    child ${ci}: <${tag}> class="${cls.slice(0, 40)}" "${txt}"`)
    })
  })
}

// ReliefWeb — try POST method with JSON body
console.log("\n=== ReliefWeb POST API ===")
{
  const res = await fetch("https://api.reliefweb.int/v1/jobs?appname=justbecausenetwork", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      limit: 2,
      preset: "latest",
      fields: { include: ["title", "url", "source", "country", "date"] },
    }),
  })
  const data = await res.json()
  console.log(`Status: ${res.status}`)
  console.log(`Jobs: ${data.data?.length || 0}`)
  if (data.data?.[0]) {
    console.log(`First: ${JSON.stringify(data.data[0].fields).slice(0, 200)}`)
  }
  if (data.error) console.log(`Error: ${JSON.stringify(data.error)}`)
}
