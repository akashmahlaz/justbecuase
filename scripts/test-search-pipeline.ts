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
  "content creator",
  "video creator for youtube",
  "social media expert",
  "teacher for kids",
  "grant writer",
  "someone who can edit videos",
  "react developer",
  "fundraising help",
  "logo maker",
  "data entry",
  "mentor",
  "wordpress expert",
  "social worker",
  "excel expert for reports",
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
// INLINE: expandQueryWithSynonyms — reads from actual es-search.ts
// ==========================================
const esSearchPath = require("path").join(__dirname, "..", "lib", "es-search.ts")
const esSearchContent = require("fs").readFileSync(esSearchPath, "utf-8")

// Parse ROLE_TO_SKILLS from the real file
function parseRoleToSkills(): Record<string, string[]> {
  const match = esSearchContent.match(/const ROLE_TO_SKILLS[^{]*\{([\s\S]*?)\n\}/)
  if (!match) return {}
  const map: Record<string, string[]> = {}
  const lineRegex = /"([^"]+)":\s*\[([^\]]*)\]/g
  let m: RegExpExecArray | null
  while ((m = lineRegex.exec(match[1])) !== null) {
    const role = m[1]
    const skills = m[2].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) || []
    map[role] = skills
  }
  return map
}
const ROLE_TO_SKILLS = parseRoleToSkills()

function checkSynonymExpansion(query: string) {
  const q = query.toLowerCase().trim()
  const words = q.split(/\s+/)
  const matches: string[] = []

  // Step 2: Exact key match (longest first)
  const sortedRoles = Object.keys(ROLE_TO_SKILLS).sort((a, b) => b.length - a.length)
  let roleMatched = false
  for (const role of sortedRoles) {
    if (q.includes(role)) {
      matches.push(`role:"${role}" → [${ROLE_TO_SKILLS[role].join(", ")}]`)
      roleMatched = true
      break
    }
  }

  // Step 2b: Fuzzy word-overlap fallback
  if (!roleMatched && words.length >= 1) {
    const queryWords = q.split(/\s+/).filter(w => w.length > 2)
    let bestScore = 0
    let bestRole = ""
    let bestSkills: string[] = []

    for (const role of sortedRoles) {
      const roleWords = role.split(/\s+/)
      let score = 0
      for (const rw of roleWords) {
        for (const qw of queryWords) {
          if (qw === rw) { score += 2; continue }
          if (qw.length >= 4 && rw.length >= 4) {
            const shorter = qw.length <= rw.length ? qw : rw
            const longer = qw.length > rw.length ? qw : rw
            if (longer.startsWith(shorter.slice(0, Math.max(4, shorter.length - 2)))) {
              score += 1.5
            }
          }
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestRole = role
        bestSkills = ROLE_TO_SKILLS[role]
      }
    }

    if (bestScore >= 1.5 && bestSkills.length > 0) {
      matches.push(`fuzzy-role:"${bestRole}" (score=${bestScore}) → [${bestSkills.join(", ")}]`)
      roleMatched = true
    }
  }

  // Step 4: Single-word partial match
  if (!roleMatched && words.length === 1) {
    for (const role of sortedRoles) {
      if (role.includes(words[0]) || words[0].includes(role.split(" ")[0])) {
        matches.push(`partial:"${words[0]}" ~ "${role}" → [${ROLE_TO_SKILLS[role].slice(0, 3).join(", ")}]`)
        break
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
// SUMMARY: Role map coverage stats
// ==========================================
console.log("\n" + "=".repeat(80))
console.log("  ROLE_TO_SKILLS COVERAGE SUMMARY")
console.log("=".repeat(80))

const totalRoles = Object.keys(ROLE_TO_SKILLS).length
console.log(`\n  Total roles in map: ${totalRoles}`)

// Check synonym MUST gate and fuzzy fallback exist
const hasSynonymGate = esSearchContent.includes("synonym expansion found matching role")
const hasFuzzyFallback = esSearchContent.includes("Fuzzy word-overlap fallback")
console.log(`  Synonym MUST gate clause: ${hasSynonymGate ? "✅ YES" : "❌ MISSING"}`)
console.log(`  Fuzzy word-overlap fallback: ${hasFuzzyFallback ? "✅ YES" : "❌ MISSING"}`)

// Sample category counts
const categories = { design: 0, dev: 0, marketing: 0, writing: 0, finance: 0, operations: 0, ngo: 0, other: 0 }
for (const role of Object.keys(ROLE_TO_SKILLS)) {
  if (/design|graphic|logo|illustr|ux|ui|brand|creat|anim|photo|video/i.test(role)) categories.design++
  else if (/develop|dev|code|program|react|node|python|web\s|app\s|mobile|software|full.?stack|frontend|backend|wordpress|shopify|webflow/i.test(role)) categories.dev++
  else if (/market|seo|ads|social|email|analytics|crm|influencer|growth|whatsapp|instagram/i.test(role)) categories.marketing++
  else if (/writ|blog|copy|edit|translat|newsletter|speak|trainer|communic|pr\s|story|report/i.test(role)) categories.writing++
  else if (/account|book|financ|audit|tax|payroll|ca$|chartered/i.test(role)) categories.finance++
  else if (/event|project|recrui|hr|operations|volunteer|research|data entry|telecall|customer|outreach|field|program/i.test(role)) categories.operations++
  else if (/teach|tutor|mentor|coach|counsel|social worker|ngo|impact|m&e|monitor|campaign|activ|health|doctor|nurse/i.test(role)) categories.ngo++
  else categories.other++
}
console.log(`\n  By category:`)
for (const [cat, count] of Object.entries(categories)) {
  if (count > 0) console.log(`    ${cat}: ${count} roles`)
}

console.log("\n\nDone.")
