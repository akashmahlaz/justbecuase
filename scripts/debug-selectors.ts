// Focused analysis on specific selectors

import * as cheerio from "cheerio"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
}

// === Idealist ===
console.log("=== IDEALIST ===")
{
  const res = await fetch("https://www.idealist.org/en/volunteer-opportunities?page=1&q=&type=VOLOP&remote=TRUE", { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  // Found the class: sc-9gxixl-5 lkvxDd
  const links = $('a[href*="/volunteer-opportunity/"]')
  console.log(`Links with /volunteer-opportunity/: ${links.length}`)

  links.slice(0, 3).each((i, el) => {
    const $el = $(el)
    const href = $el.attr("href") || ""
    // Get the card parent
    const parent = $el.parent()
    const grandparent = parent.parent()
    console.log(`\n  #${i + 1}:`)
    console.log(`  href: ${href}`)
    console.log(`  link text (50ch): ${$el.text().trim().slice(0, 50)}`)
    console.log(`  parent tag: ${parent.prop("tagName")} class: ${parent.attr("class")?.slice(0, 60)}`)
    console.log(`  grandparent tag: ${grandparent.prop("tagName")} class: ${grandparent.attr("class")?.slice(0, 60)}`)
    // Find title within or around
    const h3 = $el.find("h3, h4").first().text().trim()
    const h3Near = grandparent.find("h3, h4").first().text().trim()
    console.log(`  h3 inside link: "${h3.slice(0, 60)}"`)
    console.log(`  h3 near: "${h3Near.slice(0, 60)}"`)
    console.log(`  full text (200ch): ${$el.text().trim().replace(/\s+/g, " ").slice(0, 200)}`)
  })
}

// === UNJobs ===
console.log("\n=== UNJOBS ===")
{
  const res = await fetch("https://unjobs.org", { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  const vacancyLinks = $('a[href*="/vacancies/"]')
  console.log(`Vacancy links: ${vacancyLinks.length}`)

  vacancyLinks.slice(0, 5).each((i, el) => {
    const $el = $(el)
    const href = $el.attr("href") || ""
    const text = $el.text().trim()
    const parent = $el.parent()
    console.log(`\n  #${i + 1}: ${text.slice(0, 80)}`)
    console.log(`  href: ${href}`)
    console.log(`  parent: ${parent.prop("tagName")} style: ${parent.attr("style")?.slice(0, 50) || "none"}`)

    // Check what org is near this link
    const siblings = parent.children()
    siblings.each((_, sib) => {
      const sibText = $(sib).text().trim().slice(0, 60)
      if (sibText && sibText !== text.slice(0, 60)) {
        console.log(`  sibling: "${sibText}"`)
      }
    })
  })
}

// === Impactpool ===
console.log("\n=== IMPACTPOOL ===")
{
  const res = await fetch("https://www.impactpool.org/jobs", { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  const jobLinks = $('a[href*="/jobs/"]').filter((_, el) => {
    const href = $(el).attr("href") || ""
    return /\/jobs\/\d+/.test(href)
  })
  console.log(`Job links matching /jobs/ID: ${jobLinks.length}`)

  jobLinks.slice(0, 5).each((i, el) => {
    const $el = $(el)
    const href = $el.attr("href") || ""
    const text = $el.text().trim().replace(/\s+/g, " ")
    const parent = $el.parent()
    const gp = parent.parent()
    console.log(`\n  #${i + 1}: ${text.slice(0, 80)}`)
    console.log(`  href: ${href}`)
    console.log(`  parent: ${parent.prop("tagName")} class: ${parent.attr("class")?.slice(0, 60)}`)
    console.log(`  grandparent: ${gp.prop("tagName")} class: ${gp.attr("class")?.slice(0, 60)}`)
  })
}

// === DevNetJobs ===
console.log("\n=== DEVNETJOBS ===")
{
  const res = await fetch("https://www.devnetjobs.org", { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  // Look for job-specific links
  const jobLinks = $("a").filter((_, el) => {
    const href = $(el).attr("href") || ""
    const text = $(el).text().trim()
    return text.length > 15 && text.length < 200 &&
      !href.includes("aspx") &&
      !href.includes("javascript") &&
      !href.startsWith("#") &&
      (text.includes("Consultant") || text.includes("Officer") || text.includes("Specialist") ||
       text.includes("Manager") || text.includes("Coordinator") || text.includes("Director") ||
       text.includes("Advisor") || text.includes("Analyst"))
  })
  console.log(`Job-title links: ${jobLinks.length}`)

  jobLinks.slice(0, 5).each((i, el) => {
    const $el = $(el)
    console.log(`\n  #${i + 1}: ${$el.text().trim().slice(0, 80)}`)
    console.log(`  href: ${$el.attr("href")}`)
    console.log(`  parent: ${$el.parent().prop("tagName")} class: ${$el.parent().attr("class")?.slice(0, 60)}`)
  })

  // Check for job cards or containers
  const jobCards = $('[class*="job-card"], [class*="jobCard"], [class*="card-body"]')
  console.log(`\nJob card elements: ${jobCards.length}`)

  // Check for data in table structure
  const rows = $("table.table tbody tr, .table-striped tr")
  console.log(`Table rows: ${rows.length}`)

  // Check for a job index
  const jobIdx = $('a[href*="job_detail"], a[href*="jobdetail"], a[href*="job-detail"]')
  console.log(`Job detail links: ${jobIdx.length}`)

  // Jobs are likely in a specific container — check divs with many links
  $("div").each((_, el) => {
    const links = $(el).find("a").length
    if (links > 20 && links < 100) {
      const cls = $(el).attr("class") || "no-class"
      const id = $(el).attr("id") || "no-id"
      if (cls !== "no-class" || id !== "no-id") {
        console.log(`Div with ${links} links: class="${cls.slice(0, 40)}" id="${id}"`)
      }
    }
  })
}

// === WorkForGood actual URL ===
console.log("\n=== WORKFORGOOD ===")
{
  const res = await fetch("https://www.workforgood.co.uk", { headers: HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)

  // Check all nav links
  $("a").each((_, el) => {
    const href = $(el).attr("href") || ""
    const text = $(el).text().trim()
    if (text.length > 2 && text.length < 30 && /job|career|vacanc|recruit|role|opportunit|hire|search/i.test(text)) {
      console.log(`  "${text}" → ${href}`)
    }
  })
}
