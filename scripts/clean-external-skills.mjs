import { MongoClient } from "mongodb"
import { existsSync, readFileSync } from "fs"

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue
  const envContent = readFileSync(file, "utf-8")
  for (const line of envContent.split("\n")) {
    const eqIdx = line.indexOf("=")
    if (eqIdx > 0 && !line.trimStart().startsWith("#")) {
      const key = line.substring(0, eqIdx).trim()
      if (!process.env[key]) process.env[key] = line.substring(eqIdx + 1).trim()
    }
  }
}

const MONGO_URI = process.env.MONGODB_URI
const apply = process.argv.includes("--apply")

if (!MONGO_URI) throw new Error("MONGODB_URI is not set")

function addSkill(skills, categoryId, subskillId) {
  if (!subskillId) return
  if (!skills.some((skill) => skill.categoryId === categoryId && skill.subskillId === subskillId)) {
    skills.push({ categoryId, subskillId, priority: "nice-to-have" })
  }
}

function inferWebsiteSubskill(text) {
  const lower = text.toLowerCase()
  if (/\bwordpress\b/.test(lower)) return "wordpress-development"
  if (/\b(react|next\.?js)\b/.test(lower)) return "react-nextjs"
  if (/\bnode\.?js\b/.test(lower)) return "nodejs-backend"
  if (/\b(shopify|e-?commerce)\b/.test(lower)) return "shopify-ecommerce"
  if (/\bwebflow\b/.test(lower)) return "webflow-nocode"
  if (/\bmobile\s+app\b|\bapp\s+(developer|development)\b/.test(lower)) return "mobile-app-development"
  if (/\bux\b|\bui\b/.test(lower)) return "ux-ui"
  if (/\bhtml\b|\bcss\b/.test(lower)) return "html-css"
  if (/\b(web\s*(developer|development|application|app|platform|portal|site|design)|website|front\s*-?\s*end|back\s*-?\s*end|full\s*-?\s*stack)\b/.test(lower)) return "react-nextjs"
  return null
}

function mapTheirStackSkills(opp) {
  const titleAndTags = [opp.title, ...(opp.skillTags || [])].filter(Boolean).join(" ").toLowerCase()
  const description = [opp.description, opp.shortDescription].filter(Boolean).join(" ").toLowerCase()
  const text = `${titleAndTags} ${description}`
  const skills = []
  if (/\b(react|next\.?js)\b/.test(titleAndTags)) addSkill(skills, "website", "react-nextjs")
  if (/\bnode\.?js\b/.test(titleAndTags)) addSkill(skills, "website", "nodejs-backend")
  if (/\b(web\s*(developer|development|application|app|platform|portal|site|design)|website|front\s*-?\s*end|back\s*-?\s*end|full\s*-?\s*stack)\b/.test(titleAndTags)) addSkill(skills, "website", "react-nextjs")
  if (/\b(data\s*(analysis|analytics?|analyst)|analytics?|data-analytics|data-analysis|data-analyst|data-science)\b/.test(titleAndTags)) addSkill(skills, "data-technology", "data-analysis")
  if (/\b(data\s*visualization|tableau|power\s*bi|looker)\b/.test(titleAndTags)) addSkill(skills, "data-technology", "data-visualization")
  if (/\b(ai-ml|artificial-intelligence|machine-learning|machine\s+learning|\bai\b|\bml\b)\b/.test(titleAndTags)) addSkill(skills, "data-technology", "ai-ml")
  if (/\bchatbot\b/.test(text)) addSkill(skills, "data-technology", "chatbot-development")
  if (/\b(it\s*support|information\s*technology|helpdesk|technical\s+support)\b/.test(titleAndTags)) addSkill(skills, "data-technology", "it-support")
  if (/\bcybersecurity\b/.test(titleAndTags) || /\bcybersecurity\b/.test(description)) addSkill(skills, "data-technology", "cybersecurity")
  if (/\bgoogle\s*workspace\b|\bworkspace\b/.test(text)) addSkill(skills, "data-technology", "google-workspace")
  if (/\bzapier\b|\bn8n\b/.test(text)) addSkill(skills, "data-technology", "automation-zapier")
  return skills
}

const IDEALIST_SKILL = {
  ACCOUNTING: ["finance", "bookkeeping"],
  ADMIN: ["planning-support", "data-entry"],
  ADVOCACY: ["communication", "press-release"],
  BOARD_MEMBER: ["planning-support", "project-management"],
  COMMUNICATIONS: ["communication", "donor-communications"],
  COMMUNITY_OUTREACH: ["digital-marketing", "community-management"],
  COMPUTERS_TECHNOLOGY: ["data-technology", "it-support"],
  COUNSELING: ["communication", "public-speaking"],
  CURRICULUM_DESIGN: ["content-creation", "presentation-design"],
  DATA_MANAGEMENT: ["data-technology", "data-analysis"],
  DEVELOPMENT_FUNDRAISING: ["fundraising", "grant-writing"],
  EDUCATION: ["planning-support", "training-facilitation"],
  ENVIRONMENTAL: ["planning-support", "research-surveys"],
  EVENTS: ["planning-support", "event-planning"],
  FINANCE: ["finance", "financial-reporting"],
  GENERAL: ["planning-support", "data-entry"],
  GRANT_WRITING: ["fundraising", "grant-writing"],
  GRAPHIC_DESIGN: ["content-creation", "graphic-design"],
  HEALTH: ["planning-support", "research-surveys"],
  HR: ["planning-support", "hr-recruitment"],
  LEGAL: ["legal", "legal-advisory"],
  MANAGEMENT: ["planning-support", "project-management"],
  MARKETING: ["digital-marketing", "social-media-strategy"],
  MEDIA: ["content-creation", "video-editing"],
  OTHER: ["planning-support", "data-entry"],
  PR: ["communication", "press-release"],
  PROGRAM: ["planning-support", "project-management"],
  PROJECT_MGMT: ["planning-support", "project-management"],
  RESEARCH: ["planning-support", "research-surveys"],
  SOCIAL_MEDIA: ["digital-marketing", "social-media-strategy"],
  SOCIAL_WORK: ["planning-support", "volunteer-recruitment"],
  TRANSLATION: ["communication", "translation-localization"],
  VOLUNTEER_MGMT: ["planning-support", "volunteer-recruitment"],
  WRITING_EDITING: ["communication", "blog-article-writing"],
}

function mapIdealistSkills(opp) {
  const text = [opp.title, opp.description, opp.shortDescription].filter(Boolean).join(" ")
  const skills = []
  for (const tag of opp.skillTags || []) {
    const key = String(tag).trim().toUpperCase().replace(/\s+/g, "_")
    if (key === "ENGINEERING" || key === "IT") {
      const websiteSubskill = inferWebsiteSubskill(text)
      if (websiteSubskill) addSkill(skills, "website", websiteSubskill)
      else addSkill(skills, "data-technology", "it-support")
      continue
    }
    const mapped = IDEALIST_SKILL[key]
    if (mapped) addSkill(skills, mapped[0], mapped[1])
  }
  return skills
}

function cleanSkills(opp) {
  if (opp.sourceplatform === "theirstack") return mapTheirStackSkills(opp)
  if (opp.sourceplatform === "idealist-api") return mapIdealistSkills(opp)
  return opp.skillsRequired || []
}

function sameSkills(left = [], right = []) {
  const normalize = (skills) => skills.map((skill) => `${skill.categoryId}:${skill.subskillId}`).sort().join("|")
  return normalize(left) === normalize(right)
}

const mongo = await MongoClient.connect(MONGO_URI)
try {
  const collection = mongo.db("justbecause").collection("externalOpportunities")
  const cursor = collection.find({ sourceplatform: { $in: ["theirstack", "idealist-api"] } })
  let scanned = 0
  let changed = 0
  let updated = 0
  const examples = []

  for await (const opp of cursor) {
    scanned += 1
    const skillsRequired = cleanSkills(opp)
    if (sameSkills(opp.skillsRequired, skillsRequired)) continue
    changed += 1
    if (examples.length < 8) {
      examples.push({ title: opp.title, platform: opp.sourceplatform, before: opp.skillsRequired || [], after: skillsRequired })
    }
    if (apply) {
      await collection.updateOne({ _id: opp._id }, { $set: { skillsRequired, updatedAt: new Date() } })
      updated += 1
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned, changed, updated, examples }, null, 2))
} finally {
  await mongo.close()
}