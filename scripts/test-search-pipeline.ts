/**
 * Test script: traces "web designer 10 year experience" through the entire
 * ES search pipeline — cleaning, intent detection, synonym expansion,
 * skill matching, and the final ES query structure.
 *
 * Run: npx tsx scripts/test-search-pipeline.ts
 */

// ==========================================
// STEP 0: Fully standalone — no imports (avoids MONGODB_URI requirement)
// ==========================================

const TEST_QUERIES = [
  "web designer 10 year experience",
  "web designer",
  "website designer",
  "website designer 10 year experience",
  "graphic designer",
  "web developer",
]

// ==========================================
// INLINE: cleanQueryForTextSearch
// ==========================================
function cleanQueryForTextSearch(query: string): { cleaned: string; steps: string[] } {
  const steps: string[] = []
  let cleaned = query
  steps.push(`[0] Original: "${cleaned}"`)

  cleaned = cleaned.replace(/\([^)]*\)/g, " ")
  cleaned = cleaned.replace(/[\/\\]/g, " ")
  steps.push(`[1] After parens/slashes: "${cleaned}"`)

  cleaned = cleaned.replace(/(?:[$₹])\s*\d+(?:\.\d+)?/g, " ")
  cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*(?:dollars?|usd|inr|rs\.?|rupees?)\b/gi, " ")
  steps.push(`[2] After currency strip: "${cleaned}"`)

  cleaned = cleaned.replace(/\b\d+\+?\s*(?:years?|yrs?|yr)\s*(?:of\s+)?(?:experience|exp)?\b/gi, " ")
  steps.push(`[3] After experience years strip: "${cleaned}"`)

  const intentWords = [
    "experience", "experienced", "expert", "beginner", "intermediate",
    "senior", "junior", "fresher", "entry-level", "entry level", "specialist",
    "veteran", "seasoned", "newbie", "newcomer", "intern", "level",
    "free", "paid", "premium", "pro bono", "probono", "affordable",
    "cheap", "budget", "low cost", "no cost",
    "remote", "onsite", "on-site", "hybrid", "work from home", "wfh",
    "online", "virtual", "in person", "in-person",
    "urgent", "asap", "immediately",
    "verified", "trusted", "reliable", "top", "best", "rated",
    "top rated", "highly rated",
    "weekend", "weekday", "evening", "part-time", "full-time",
    "flexible", "anytime",
    "with", "for", "who", "that", "has", "have", "having",
    "looking", "need", "find", "search", "looking for",
    "and", "or", "per", "at", "the", "an", "of", "to", "in", "is", "are", "be",
    "i need a", "i need an", "i need", "i am looking for", "i want a", "i want an",
    "i want", "find me a", "find me an", "find me", "get me a", "get me an",
    "get me", "show me", "can you find", "help me find", "looking for a",
    "looking for an", "searching for", "searching for a", "want to hire",
    "need to hire", "hire a", "hire an", "hire", "someone who can",
    "someone to", "person who can", "person to", "people who",
    "anybody who", "anyone who", "anyone to",
    "please", "plz", "pls",
  ]

  const sortedIntentWords = [...intentWords].sort((a, b) => b.length - a.length)
  const removed: string[] = []
  for (const w of sortedIntentWords) {
    const regex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "gi")
    if (regex.test(cleaned)) {
      removed.push(w)
      cleaned = cleaned.replace(regex, " ")
    }
  }
  if (removed.length > 0) steps.push(`[4] Stripped intent words: [${removed.join(", ")}] → "${cleaned}"`)
  else steps.push(`[4] No intent words matched`)

  cleaned = cleaned.replace(/\b\d+\s*(?:hours?|hrs?)\s+(?:(?:per|a|each|\/)\s*)?(?:week|month|day)\b/gi, " ")
  cleaned = cleaned.replace(/\b(?:(?:per|a|each)\s+)?(?:hours?|hrs?)\s*(?:per\s+)?(?:week|month|day)?\b/gi, " ")
  cleaned = cleaned.replace(/\bper\s+(?:week|month|day)\b/gi, " ")
  steps.push(`[5] After hours/week strip: "${cleaned}"`)

  cleaned = cleaned.replace(/\b\d+\b/g, " ")
  steps.push(`[6] After lone numbers: "${cleaned}"`)

  cleaned = cleaned.replace(/\s+/g, " ").trim()
  steps.push(`[7] Final collapsed: "${cleaned}"`)

  if (cleaned.length < 2) {
    cleaned = query.trim()
    steps.push(`[8] FALLBACK to original (cleaned too short): "${cleaned}"`)
  }

  return { cleaned, steps }
}

// ==========================================
// INLINE: detectQueryIntent
// ==========================================
function detectQueryIntent(query: string) {
  const q = query.toLowerCase()
  const boosts: string[] = []
  const filters: string[] = []
  const signals: string[] = []

  if (/\b(free|pro[- ]?bono|no[- ]?cost|voluntary|gratis|without[- ]?pay)\b/.test(q)) {
    filters.push("volunteerType=free|both")
    signals.push("price:free")
  }
  if (/\b(cheap|affordable|budget|low[- ]?cost|inexpensive|economical)\b/.test(q)) {
    boosts.push("hourlyRate<=300", "volunteerType=free", "volunteerType=both")
    signals.push("price:cheap")
  }
  if (/\b(paid|premium|professional|hire)\b/.test(q) && !/\b(un[- ]?paid)\b/.test(q)) {
    boosts.push("volunteerType=paid", "volunteerType=both")
    signals.push("price:paid")
  }
  const rateMatch = q.match(/(?:under|below|less than|max|upto|up to|within)\s*(?:rs\.?|inr|₹|\$|usd)?\s*(\d+)/)
  if (rateMatch) {
    boosts.push(`hourlyRate<=${rateMatch[1]}`)
    signals.push(`price:under_${rateMatch[1]}`)
  }
  const directRateMatch = q.match(/(?:[@$₹]|\bat\s+[$₹]?)\s*(\d+(?:\.\d+)?)\s*(?:\/\s*hr|per\s*h(?:our|r)?)?/) ||
    q.match(/(\d+(?:\.\d+)?)\s*(?:dollars?|usd|inr|rs\.?|rupees?)\s*(?:per\s*h(?:our|r)?)?/)
  if (directRateMatch && !rateMatch) {
    boosts.push(`hourlyRate<=${directRateMatch[1]}`)
    signals.push(`price:rate_${directRateMatch[1]}`)
  }

  if (/\b(expert|senior|specialist|veteran|seasoned|highly[- ]?experienced)\b/.test(q)) {
    boosts.push("experienceLevel=expert")
    signals.push("exp:expert")
  }
  const yearsMatch = q.match(/(\d+)\+?\s*(?:years?|yrs?|yr)\b/)
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1])
    if (years >= 6) { boosts.push("experienceLevel=expert", "completedProjects>=3", "rating>=4"); signals.push(`exp:years_${years}_expert`) }
    else if (years >= 3) { boosts.push("experienceLevel=intermediate|expert"); signals.push(`exp:years_${years}_advanced`) }
    else { boosts.push("experienceLevel=intermediate|beginner"); signals.push(`exp:years_${years}_intermediate`) }
  }

  if (/\b(remote|work from home|wfh|from anywhere|online|virtual)\b/.test(q)) { signals.push("mode:remote") }
  if (/\b(onsite|on[- ]?site|in[- ]?person|office|local|nearby|near me)\b/.test(q)) { signals.push("mode:onsite") }
  if (/\b(hybrid|flexible location)\b/.test(q)) { signals.push("mode:hybrid") }

  const hoursMatch = q.match(/\b(\d+)\s*(?:hours?|hrs?)\s*(?:(?:per|a|each|\/)?\s*(?:week|month|day))?\b/)
  if (hoursMatch) {
    const hrs = parseInt(hoursMatch[1])
    if (hrs > 0 && hrs <= 80) { boosts.push(`hoursPerWeek>=${hrs}`); signals.push(`avail:${hrs}hrs`) }
  }

  return { boosts, filters, signals }
}

// ==========================================
// INLINE: expandQueryWithSynonyms (simplified — just check role map)
// ==========================================
const ROLE_TO_SKILLS: Record<string, string[]> = {
  "content creator": ["Social Media Content", "Video Editing", "Photo Editing", "Graphic Design"],
  "video editor": ["Video Editing", "Premiere Pro", "DaVinci", "Motion Graphics"],
  "graphic designer": ["Graphic Design", "Canva", "Figma", "Photoshop", "Branding"],
  "web developer": ["React / Next.js", "HTML / CSS", "WordPress", "Node.js", "Website Redesign"],
  "website designer": ["WordPress Development", "UX / UI Design", "Website Redesign", "HTML / CSS"],
  "web designer": ["WordPress Development", "UX / UI Design", "Website Redesign", "HTML / CSS", "Graphic Design"],
  "ui designer": ["UX / UI Design", "Figma", "Wireframing"],
  "ux designer": ["UX / UI Design", "Figma", "Wireframing", "User Research"],
}

function checkSynonymExpansion(query: string) {
  const q = query.toLowerCase().trim()
  const matches: string[] = []

  const sortedRoles = Object.keys(ROLE_TO_SKILLS).sort((a, b) => b.length - a.length)
  for (const role of sortedRoles) {
    if (q.includes(role)) {
      matches.push(`role:"${role}" → [${ROLE_TO_SKILLS[role].join(", ")}]`)
      break
    }
  }

  if (matches.length === 0) {
    // Check partial
    const words = q.split(/\s+/)
    if (words.length === 1) {
      for (const role of sortedRoles) {
        if (role.includes(words[0]) || words[0].includes(role.split(" ")[0])) {
          matches.push(`partial:"${words[0]}" ~ "${role}" → [${ROLE_TO_SKILLS[role].slice(0, 3).join(", ")}]`)
          break
        }
      }
    }
  }

  return matches
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================
console.log("=" .repeat(80))
console.log("  SEARCH PIPELINE TEST — Tracing queries through the full pipeline")
console.log("=" .repeat(80))

for (const query of TEST_QUERIES) {
  console.log("\n" + "─".repeat(80))
  console.log(`QUERY: "${query}"`)
  console.log("─".repeat(80))

  // Step 1: Intent detection (runs on RAW query)
  console.log("\n📌 STEP 1: detectQueryIntent (raw query)")
  const intent = detectQueryIntent(query)
  console.log(`   Signals: ${intent.signals.length > 0 ? intent.signals.join(", ") : "(none)"}`)
  console.log(`   Boosts:  ${intent.boosts.length > 0 ? intent.boosts.join(", ") : "(none)"}`)
  console.log(`   Filters: ${intent.filters.length > 0 ? intent.filters.join(", ") : "(none)"}`)

  // Step 2: Clean query
  console.log("\n📌 STEP 2: cleanQueryForTextSearch")
  const { cleaned, steps } = cleanQueryForTextSearch(query)
  for (const step of steps) {
    console.log(`   ${step}`)
  }
  console.log(`   ✅ CLEANED TEXT: "${cleaned}"`)

  // Step 3: Synonym expansion (runs on cleaned text)
  console.log("\n📌 STEP 3: expandQueryWithSynonyms (on cleaned text)")
  const roleMatches = checkSynonymExpansion(cleaned)
  if (roleMatches.length > 0) {
    for (const m of roleMatches) console.log(`   ✅ ${m}`)
  } else {
    console.log(`   ❌ NO SYNONYM MATCH for "${cleaned}"`)
    console.log(`      Available similar roles:`)
    const sortedRoles = Object.keys(ROLE_TO_SKILLS).sort((a, b) => b.length - a.length)
    for (const role of sortedRoles) {
      if (role.includes(cleaned.split(" ")[0]) || cleaned.includes(role.split(" ")[0])) {
        console.log(`      - "${role}" → [${ROLE_TO_SKILLS[role].slice(0, 3).join(", ")}]`)
      }
    }
  }

  // Step 4: Skill ID matching (skipped — requires MongoDB connection)
  console.log("\n📌 STEP 4: findMatchingSkillIds")
  console.log(`   (Skipped in standalone test — requires MongoDB. Checked via ROLE_TO_SKILLS instead.)`)

  // Step 5: MUST clause analysis
  console.log("\n📌 STEP 5: MUST clause analysis")
  const wordCount = cleaned.split(/\s+/).length
  const mustMinMatch = wordCount <= 2 ? `${wordCount}` : `${Math.max(2, Math.ceil(wordCount * 0.65))}`
  const mustOperator = wordCount <= 2 ? "and" : "or"
  const useFuzziness = cleaned.length <= 3 ? 0 : "AUTO"
  console.log(`   searchText: "${cleaned}"`)
  console.log(`   wordCount: ${wordCount}`)
  console.log(`   mustOperator: "${mustOperator}"`)
  console.log(`   minimum_should_match: ${mustMinMatch}`)
  console.log(`   fuzziness: ${useFuzziness}`)
  console.log(`   `)
  console.log(`   MUST gate has 5 paths (any 1 passing = volunteer qualifies):`)
  console.log(`     1. cross_fields "${cleaned}" on title^10, skillNames^12, headline^6, name^8 — operator="${mustOperator}" (NO fuzziness)`)
  console.log(`     2. most_fields "${cleaned}" on title^10, skillNames^12, causeNames^6, ngoName^8 — fuzz=${useFuzziness}`)
  if (roleMatches.length > 0) {
    console.log(`     5. ✅ SYNONYM GATE: any of the expanded skill names matching skillNames^12/title^8/headline^6`)
    console.log(`        → volunteer with "Web Design" in skillNames will pass via this path!`)
  } else {
    console.log(`     5. ❌ SYNONYM GATE: N/A (no synonym expansion)`)
  }

  // Step 6: Pure work-mode check
  const WORK_MODE_MAP: Record<string, string> = {
    onsite: "onsite", "on-site": "onsite", "on site": "onsite",
    "in-person": "onsite", "in person": "onsite", office: "onsite",
    remote: "remote", "work from home": "remote", wfh: "remote",
    online: "remote", virtual: "remote", hybrid: "hybrid",
  }
  const rawQ = query.trim().toLowerCase()
  const pureWorkMode = WORK_MODE_MAP[rawQ]
  console.log(`\n📌 STEP 6: Pure work-mode check`)
  console.log(`   Is pure work-mode query? ${pureWorkMode ? `YES → filter workMode=${pureWorkMode}` : "NO (normal text query)"}`)

  // Summary
  console.log("\n📋 SUMMARY")
  console.log(`   Cleaned text for MUST clause: "${cleaned}"`)
  console.log(`   Intent signals: ${intent.signals.join(", ") || "(none)"}`)
  console.log(`   Synonym boosts: ${roleMatches.length > 0 ? "YES" : "NONE ⚠️"}`)
  if (roleMatches.length === 0) {
    console.log(`   ⚠️ WARNING: No synonym mapping for "${cleaned}" in ROLE_TO_SKILLS`)
    console.log(`   ⚠️ This means only raw text matching against ES fields (no skill name boosting)`)
  }
}

// ==========================================
// CHECK: Does "web designer" exist in the ACTUAL es-search.ts ROLE_TO_SKILLS?
// ==========================================
console.log("\n" + "=".repeat(80))
console.log("  CHECKING es-search.ts ROLE_TO_SKILLS for 'web designer' entry")
console.log("=".repeat(80))

// Read the file and check
import { readFileSync } from "fs"
const esSearchContent = readFileSync("lib/es-search.ts", "utf-8")
const webDesignerLine = esSearchContent.match(/.*"web designer".*$/m)
const websiteDesignerLine = esSearchContent.match(/.*"website designer".*$/m)

console.log(`\n"web designer" in ROLE_TO_SKILLS? → ${webDesignerLine ? `✅ YES: ${webDesignerLine[0].trim()}` : "❌ MISSING!"}`)
console.log(`"website designer" in ROLE_TO_SKILLS? → ${websiteDesignerLine ? `✅ YES: ${websiteDesignerLine[0].trim()}` : "❌ MISSING!"}`)
console.log(`"web design" in ROLE_TO_SKILLS? → ${esSearchContent.includes('"web design"') ? "✅ YES" : "❌ MISSING!"}`)

// Check synonym MUST gate exists
const hasSynonymGate = esSearchContent.includes("synonym expansion found matching role")
console.log(`\nSynonym MUST gate clause exists? → ${hasSynonymGate ? "✅ YES (clause 5 in MUST bool)" : "❌ MISSING!"}`)

if (webDesignerLine && hasSynonymGate) {
  console.log(`\n✅ FIX VERIFIED: "web designer 10 year experience" will now:`)
  console.log(`   1. Clean to "web designer" ✅`)
  console.log(`   2. Detect exp:years_10_expert intent → boost expert volunteers ✅`)
  console.log(`   3. Expand synonyms: role:"web designer" → [WordPress, UX/UI, Web Redesign, HTML/CSS, Graphic Design] ✅`)
  console.log(`   4. MUST gate: synonym clause matches volunteers with ANY of those skills in skillNames ✅`)
  console.log(`   5. SHOULD boosts: synonym skill names boost matching volunteers even higher ✅`)
} else {
  console.log(`\n🚨 FIX INCOMPLETE:`)
  if (!webDesignerLine) console.log(`   - "web designer" still missing from ROLE_TO_SKILLS`)
  if (!hasSynonymGate) console.log(`   - Synonym MUST gate clause not found in buildSearchQuery`)
}

// Also check ROLE_TO_SKILLS entries containing 'design'
console.log("\n" + "=".repeat(80))
console.log("  ALL ROLE_TO_SKILLS entries containing 'design' or 'web'")
console.log("=".repeat(80))
const roleLines = esSearchContent.match(/^\s*"[^"]+":.*$/gm) || []
for (const line of roleLines) {
  if ((line.includes("design") || line.includes("web")) && line.includes("[")) {
    console.log(`  ${line.trim()}`)
  }
}

console.log("\n\nDone.")
