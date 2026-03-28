// ============================================
// Powerful Text Extractor — deep content extraction from any HTML page
// ============================================
// Uses cheerio to intelligently extract structured data from arbitrary pages.
// Handles job boards, NGO pages, and generic content with heuristic parsing.

import * as cheerio from "cheerio"

export interface ExtractedContent {
  title: string
  description: string
  organization: string
  organizationUrl?: string
  location?: string
  deadline?: string
  postedDate?: string
  salary?: string
  duration?: string
  experienceLevel?: string
  tags: string[]
  workMode?: string
  links: { text: string; url: string }[]
  metadata: Record<string, string>
}

export interface ExtractedListing {
  title: string
  url: string
  organization?: string
  location?: string
  snippet?: string
  tags: string[]
  postedDate?: string
  deadline?: string
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
}

/**
 * Fetch a URL and return the raw HTML.
 * Handles timeouts, retries, and common error codes.
 */
export async function fetchPage(url: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000),
        redirect: "follow",
      })

      if (response.status === 429) {
        // Rate limited — wait and retry
        if (attempt < retries) {
          await sleep(5000 * (attempt + 1))
          continue
        }
        throw new Error(`Rate limited (429) after ${retries + 1} attempts`)
      }

      if (response.status === 403 || response.status === 451) {
        throw new Error(`Access denied (${response.status}) — site may block scrapers`)
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }

      return await response.text()
    } catch (err) {
      if (attempt === retries) throw err
      await sleep(2000 * (attempt + 1))
    }
  }
  throw new Error("Unreachable")
}

/**
 * Deep extract structured content from any HTML page.
 * Intelligently pulls titles, descriptions, metadata, tags, and dates
 * using multiple strategies: JSON-LD, Open Graph, meta tags, and DOM heuristics.
 */
export function extractPageContent(html: string, baseUrl: string): ExtractedContent {
  const $ = cheerio.load(html)

  // === Strategy 1: JSON-LD structured data (most reliable) ===
  const jsonLd = extractJsonLd($)

  // === Strategy 2: Open Graph & meta tags ===
  const ogData = extractOpenGraph($)

  // === Strategy 3: DOM heuristics ===
  const domData = extractFromDom($, baseUrl)

  // === Merge all strategies (priority: longest/richest for description, JSON-LD > OG > DOM for metadata) ===
  const title =
    jsonLd.title || ogData.title || domData.title || $("title").text().trim() || ""

  // For description, prefer the longest version — JSON-LD can be truncated on some platforms
  const candidates = [jsonLd.description, ogData.description, domData.description].filter(Boolean)
  const description = candidates.sort((a, b) => (b?.length || 0) - (a?.length || 0))[0] || ""

  const organization =
    jsonLd.organization || ogData.siteName || domData.organization || ""

  return {
    title,
    description: cleanText(description),
    organization,
    organizationUrl: jsonLd.organizationUrl || domData.organizationUrl,
    location: jsonLd.location || domData.location,
    deadline: jsonLd.deadline || domData.deadline,
    postedDate: jsonLd.postedDate || ogData.publishedTime || domData.postedDate,
    salary: jsonLd.salary || domData.salary,
    duration: domData.duration,
    experienceLevel: domData.experienceLevel,
    tags: [...new Set([...(jsonLd.tags || []), ...domData.tags])],
    workMode: domData.workMode,
    links: domData.links,
    metadata: {
      ...ogData.metadata,
      ...domData.metadata,
    },
  }
}

/**
 * Extract a list of opportunity listings from a search/index page.
 * Detects listing patterns (job cards, table rows, link lists) and returns structured items.
 */
export function extractListings(
  html: string,
  baseUrl: string,
  selectors?: {
    container?: string
    item?: string
    title?: string
    link?: string
    org?: string
    location?: string
    date?: string
  }
): ExtractedListing[] {
  const $ = cheerio.load(html)
  const items: ExtractedListing[] = []
  const seenUrls = new Set<string>()

  // If custom selectors are provided, use them directly
  if (selectors?.item) {
    $(selectors.container || "body").find(selectors.item).each((_, el) => {
      const $el = $(el)
      const listing = extractListingFromElement($, $el, baseUrl, selectors)
      if (listing && !seenUrls.has(listing.url)) {
        seenUrls.add(listing.url)
        items.push(listing)
      }
    })
    return items
  }

  // Auto-detect listing patterns
  const patterns = [
    // Job board cards
    'article, [class*="card"], [class*="Card"], [class*="listing"], [class*="Listing"], [class*="job-item"], [class*="JobItem"]',
    // Table rows with links
    "table tbody tr",
    // List items with links
    'ul li, ol li, [role="list"] > *',
  ]

  for (const pattern of patterns) {
    const candidates = $(pattern)
    if (candidates.length < 2) continue // Need at least 2 to be a listing

    // Score candidates — real listings have links, titles, and similar structure
    let score = 0
    const sampleSize = Math.min(5, candidates.length)
    for (let i = 0; i < sampleSize; i++) {
      const $c = $(candidates[i])
      if ($c.find("a").length > 0) score++
      if ($c.text().length > 20 && $c.text().length < 2000) score++
    }

    if (score < sampleSize) continue // Not a listing pattern

    candidates.each((_, el) => {
      const $el = $(el)
      const listing = extractListingFromElement($, $el, baseUrl)
      if (listing && !seenUrls.has(listing.url)) {
        seenUrls.add(listing.url)
        items.push(listing)
      }
    })

    if (items.length > 3) break // Found a good pattern, stop trying
  }

  return items
}

// ============================================
// INTERNAL HELPERS
// ============================================

interface JsonLdData {
  title?: string
  description?: string
  organization?: string
  organizationUrl?: string
  location?: string
  deadline?: string
  postedDate?: string
  salary?: string
  tags?: string[]
}

function extractJsonLd($: cheerio.CheerioAPI): JsonLdData {
  const result: JsonLdData = {}

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html()
      if (!raw) return
      const data = JSON.parse(raw)

      // Handle arrays of JSON-LD objects
      const items = Array.isArray(data) ? data : [data]

      for (const item of items) {
        // JobPosting schema
        if (item["@type"] === "JobPosting") {
          result.title = result.title || item.title
          result.description = result.description || stripHtml(item.description || "")
          result.organization =
            result.organization || item.hiringOrganization?.name
          result.organizationUrl =
            result.organizationUrl || item.hiringOrganization?.sameAs || item.hiringOrganization?.url
          result.location = result.location || formatJobLocation(item.jobLocation)
          result.deadline = result.deadline || item.validThrough
          result.postedDate = result.postedDate || item.datePosted
          result.salary =
            result.salary ||
            formatSalary(item.baseSalary || item.estimatedSalary)
          result.tags = [
            ...(result.tags || []),
            item.employmentType,
            item.occupationalCategory,
            item.industry,
          ].filter(Boolean)
        }

        // Organization schema
        if (item["@type"] === "Organization" && !result.organization) {
          result.organization = item.name
          result.organizationUrl = item.url || item.sameAs
        }

        // Volunteer
        if (item["@type"] === "VolunteerAction") {
          result.title = result.title || item.name
          result.description =
            result.description || stripHtml(item.description || "")
          result.organization =
            result.organization || item.agent?.name || item.organizer?.name
        }
      }
    } catch {
      // malformed JSON-LD, skip
    }
  })

  return result
}

interface OgData {
  title?: string
  description?: string
  siteName?: string
  publishedTime?: string
  metadata: Record<string, string>
}

function extractOpenGraph($: cheerio.CheerioAPI): OgData {
  const meta: Record<string, string> = {}
  $("meta[property], meta[name]").each((_, el) => {
    const key =
      $(el).attr("property") || $(el).attr("name") || ""
    const val = $(el).attr("content") || ""
    if (key && val) meta[key.toLowerCase()] = val
  })

  return {
    title: meta["og:title"],
    description: meta["og:description"] || meta["description"],
    siteName: meta["og:site_name"],
    publishedTime: meta["article:published_time"],
    metadata: meta,
  }
}

interface DomData {
  title: string
  description: string
  organization: string
  organizationUrl?: string
  location?: string
  deadline?: string
  postedDate?: string
  salary?: string
  duration?: string
  experienceLevel?: string
  tags: string[]
  workMode?: string
  links: { text: string; url: string }[]
  metadata: Record<string, string>
}

function extractFromDom($: cheerio.CheerioAPI, baseUrl: string): DomData {
  // Remove noise
  $("script, style, nav, footer, header, iframe, noscript, .sidebar, .cookie-banner, .modal, .ad, .advertisement, .social-share, .share-buttons, .related-jobs, .similar-jobs, .breadcrumb, [class*='newsletter'], [class*='subscribe'], [class*='popup'], [class*='banner'], [class*='cookie'], [class*='alert'], [class*='cta']").remove()

  // === Title ===
  const title =
    $("h1").first().text().trim() ||
    $('[class*="title" i], [class*="Title"]').first().text().trim() ||
    ""

  // === Description / main content — platform-aware deep extraction ===
  let description = ""

  // Strategy A: Look for specific job description containers (most job boards use these)
  const descSelectors = [
    // Common job description sections
    '.job-description', '[class*="job-description"]', '[class*="jobDescription"]',
    '.job-details', '[class*="job-details"]', '[class*="jobDetails"]',
    '.description-content', '[class*="description-content"]',
    '.posting-description', '[class*="posting"]',
    // Impactpool / UN specific
    '[class*="vacancy"]', '[class*="announcement"]',
    '.field-body', '.field--body', '[class*="field-body"]',
    // ReliefWeb specific
    '.rw-article__content', '.rw-report__content',
    // Generic detail content
    '[class*="detail-content"]', '[class*="detailContent"]',
    '.details-body', '[class*="details-body"]',
    '[class*="opportunity-description"]', '[class*="post-content"]',
    // Rich-text containers
    '[class*="rich-text"]', '[class*="richText"]', '[class*="ql-editor"]',
    '.prose', '.entry-content', '.article-body', '.article-content',
  ]

  for (const sel of descSelectors) {
    const el = $(sel).first()
    if (el.length) {
      const text = el.text().trim()
      if (text.length > 200) {
        description = cleanText(text)
        break
      }
    }
  }

  // Strategy B: Collect all substantial <p>, <li>, heading text in main/article
  if (!description || description.length < 300) {
    const mainEl = $("main, article, [role='main'], #content, .content").first()
    if (mainEl.length) {
      const paragraphs: string[] = []
      mainEl.find("h2, h3, h4, p, li, dd, blockquote").each((_, el) => {
        const text = $(el).text().trim()
        if (text.length > 15) paragraphs.push(text)
      })
      const collected = paragraphs.join("\n\n")
      if (collected.length > description.length) {
        description = cleanText(collected)
      }
    }
  }

  // Strategy C: Fallback — grab whole main/body text
  if (!description || description.length < 200) {
    const mainContent =
      $("main, article, [role='main'], .content, #content")
        .first()
        .text()
        .trim() ||
      $("body").text().trim()
    description = cleanText(mainContent)
  }

  description = description.slice(0, 25000)

  // === Organization ===
  let organization = ""
  const orgSelectors = [
    '[class*="company" i]',
    '[class*="org" i]',
    '[class*="employer" i]',
    '[class*="hiring" i]',
    '[itemprop="hiringOrganization"]',
  ]
  for (const sel of orgSelectors) {
    const el = $(sel).first()
    if (el.length) {
      organization = el.text().trim().slice(0, 200)
      break
    }
  }

  // === Location ===
  let location = ""
  const locSelectors = [
    '[class*="location" i]',
    '[class*="Location"]',
    '[itemprop="jobLocation"]',
    '[class*="duty-station" i]',
  ]
  for (const sel of locSelectors) {
    const el = $(sel).first()
    if (el.length) {
      location = el.text().trim().slice(0, 200)
      break
    }
  }
  if (!location) {
    // Regex fallback
    const locMatch = description.match(
      /(?:location|duty station|based in|city)[:\s]+([^.\n]{3,80})/i
    )
    if (locMatch) location = locMatch[1].trim()
  }

  // === Deadline ===
  let deadline = ""
  const deadlineMatch = description.match(
    /(?:deadline|closing date|apply by|due date|expires?)[:\s]+([^.\n]{5,60})/i
  )
  if (deadlineMatch) deadline = deadlineMatch[1].trim()

  // === Posted Date ===
  let postedDate = ""
  const postedMatch = description.match(
    /(?:posted|published|date)[:\s]+(\d{1,2}[\s/.-]\w{3,9}[\s/.-]\d{2,4})/i
  )
  if (postedMatch) postedDate = postedMatch[1].trim()

  // === Salary ===
  let salary = ""
  const salaryMatch = description.match(
    /(?:salary|compensation|stipend|pay)[:\s]+([^.\n]{3,120})/i
  )
  if (salaryMatch) salary = salaryMatch[1].trim()

  // === Tags ===
  const tags: string[] = []
  $(
    '[class*="tag"], [class*="Tag"], [class*="badge"], [class*="Badge"], [class*="category"], [class*="skill"]'
  ).each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 1 && t.length < 80) tags.push(t)
  })

  // === Work Mode detection ===
  let workMode: string | undefined
  const fullText = [title, description, location].join(" ").toLowerCase()
  if (/\bremote\b/.test(fullText)) workMode = "remote"
  else if (/\bhybrid\b/.test(fullText)) workMode = "hybrid"
  else if (/\bon[- ]?site\b|\bin[- ]?person\b|\bon[- ]?location\b/.test(fullText))
    workMode = "onsite"

  // === Duration ===
  let duration = ""
  const durationMatch = description.match(
    /(?:duration|contract|assignment|period|length)[:\s]+([^.\n]{3,80})/i
  )
  if (durationMatch) duration = durationMatch[1].trim()
  if (!duration) {
    const monthMatch = description.match(/(\d+)\s*months?\b/i)
    if (monthMatch) duration = `${monthMatch[1]} months`
  }

  // === Experience Level ===
  let experienceLevel = ""
  const expMatch = description.match(
    /(?:experience|minimum|at least|required)[:\s]*(\d+)\s*(?:\+\s*)?years?/i
  )
  if (expMatch) {
    const y = parseInt(expMatch[1])
    experienceLevel = y <= 2 ? "entry" : y <= 5 ? "mid" : y <= 8 ? "senior" : "expert"
  }

  // === Relevant links ===
  const links: { text: string; url: string }[] = []
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || ""
    const text = $(el).text().trim()
    if (
      href &&
      text.length > 3 &&
      text.length < 200 &&
      !href.startsWith("javascript") &&
      !href.startsWith("#") &&
      !href.includes("login") &&
      !href.includes("signup")
    ) {
      const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString()
      links.push({ text, url: fullUrl })
    }
  })

  return {
    title,
    description,
    organization,
    location,
    deadline,
    postedDate,
    salary,
    duration,
    experienceLevel,
    tags,
    workMode,
    links: links.slice(0, 100),
    metadata: {},
  }
}

function extractListingFromElement(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<any>,
  baseUrl: string,
  selectors?: {
    title?: string
    link?: string
    org?: string
    location?: string
    date?: string
  }
): ExtractedListing | null {
  // Get link
  let href = ""
  let titleText = ""

  if (selectors?.link) {
    const linkEl = $el.find(selectors.link).first()
    href = linkEl.attr("href") || ""
    titleText = selectors?.title
      ? $el.find(selectors.title).first().text().trim()
      : linkEl.text().trim()
  } else {
    // Auto-detect: find the most prominent link
    const links = $el.find("a[href]")
    if (links.length === 0) return null

    // Pick the link with the longest text (likely the title)
    let bestLink = links.first()
    let bestLen = 0
    links.each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > bestLen && text.length < 300) {
        bestLen = text.length
        bestLink = $(el)
      }
    })

    href = bestLink.attr("href") || ""
    titleText =
      $el.find("h2, h3, h4, [class*='title' i], [class*='Title']").first().text().trim() ||
      bestLink.text().trim()
  }

  if (!href || !titleText || titleText.length < 5) return null

  const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString()
  const fullText = $el.text()

  // Organization
  let org: string | undefined
  if (selectors?.org) {
    org = $el.find(selectors.org).first().text().trim()
  } else {
    const orgEl = $el
      .find('[class*="org" i], [class*="company" i], [class*="employer" i]')
      .first()
    org = orgEl.length ? orgEl.text().trim() : undefined
  }

  // Location
  let loc: string | undefined
  if (selectors?.location) {
    loc = $el.find(selectors.location).first().text().trim()
  } else {
    const locEl = $el.find('[class*="location" i], [class*="Location"]').first()
    loc = locEl.length ? locEl.text().trim() : undefined
  }

  // Date
  let dateStr: string | undefined
  if (selectors?.date) {
    dateStr = $el.find(selectors.date).first().text().trim()
  } else {
    const dateEl = $el.find("time, [class*='date' i], [class*='Date']").first()
    dateStr = dateEl.length
      ? dateEl.attr("datetime") || dateEl.text().trim()
      : undefined
  }

  // Tags from badges/pills
  const tags: string[] = []
  $el
    .find('[class*="tag" i], [class*="badge" i], [class*="pill" i], [class*="chip" i]')
    .each((_, el) => {
      const t = $(el).text().trim()
      if (t.length > 1 && t.length < 80) tags.push(t)
    })

  // Snippet
  const snippet = cleanText(
    fullText.replace(titleText, "").replace(org || "", "")
  ).slice(0, 500)

  return {
    title: titleText,
    url: fullUrl,
    organization: org,
    location: loc,
    snippet,
    tags,
    postedDate: dateStr,
  }
}

function formatJobLocation(jobLocation: any): string {
  if (!jobLocation) return ""
  if (typeof jobLocation === "string") return jobLocation
  if (Array.isArray(jobLocation)) {
    return jobLocation.map(formatJobLocation).filter(Boolean).join("; ")
  }
  const addr = jobLocation.address
  if (addr) {
    return [addr.addressLocality, addr.addressRegion, addr.addressCountry]
      .filter(Boolean)
      .join(", ")
  }
  return jobLocation.name || ""
}

function formatSalary(salary: any): string {
  if (!salary) return ""
  if (typeof salary === "string") return salary
  if (salary.value) {
    const val = salary.value
    const curr = salary.currency || ""
    if (typeof val === "object") {
      return `${curr} ${val.minValue || ""}–${val.maxValue || ""} ${val.unitText || ""}`.trim()
    }
    return `${curr} ${val} ${salary.unitText || ""}`.trim()
  }
  return ""
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function cleanText(text: string): string {
  return text
    .replace(/[\t\r]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
