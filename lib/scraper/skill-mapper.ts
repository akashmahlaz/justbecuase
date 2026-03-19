// ============================================
// Skill Mapping — maps raw external tags to our platform skill taxonomy
// ============================================

import { skillCategories, causes as causesList } from "../skills-data"

// Build lookup maps once at module load
const SKILL_KEYWORD_MAP: Map<string, { categoryId: string; subskillId: string }> = new Map()
const CAUSE_KEYWORD_MAP: Map<string, string> = new Map()

// Build skill map from skill categories
for (const cat of skillCategories) {
  for (const sub of cat.subskills) {
    // Map exact skill name (lowered)
    SKILL_KEYWORD_MAP.set(sub.name.toLowerCase(), { categoryId: cat.id, subskillId: sub.id })
    // Map skill id
    SKILL_KEYWORD_MAP.set(sub.id, { categoryId: cat.id, subskillId: sub.id })
    // Map individual words from skill name (3+ chars)
    for (const word of sub.name.toLowerCase().split(/[\s/&()+,.-]+/).filter(w => w.length >= 4)) {
      if (!SKILL_KEYWORD_MAP.has(word)) {
        SKILL_KEYWORD_MAP.set(word, { categoryId: cat.id, subskillId: sub.id })
      }
    }
  }
  // Map category name
  SKILL_KEYWORD_MAP.set(cat.name.toLowerCase(), { categoryId: cat.id, subskillId: cat.subskills[0]?.id || cat.id })
}

// Common keyword → skill mappings for external platforms
const EXTERNAL_KEYWORD_MAP: Record<string, { categoryId: string; subskillId: string }> = {
  "marketing": { categoryId: "digital-marketing", subskillId: "social-media-strategy" },
  "social media": { categoryId: "digital-marketing", subskillId: "social-media-strategy" },
  "communications": { categoryId: "digital-marketing", subskillId: "content-marketing" },
  "web development": { categoryId: "web-development", subskillId: "frontend-react" },
  "web design": { categoryId: "design-creative", subskillId: "web-design" },
  "graphic design": { categoryId: "design-creative", subskillId: "graphic-design" },
  "ui/ux": { categoryId: "design-creative", subskillId: "ui-ux-design" },
  "data analysis": { categoryId: "data-research", subskillId: "data-analysis" },
  "data science": { categoryId: "data-research", subskillId: "data-analysis" },
  "project management": { categoryId: "operations-management", subskillId: "project-management" },
  "fundraising": { categoryId: "fundraising", subskillId: "grant-writing" },
  "grant writing": { categoryId: "fundraising", subskillId: "grant-writing" },
  "finance": { categoryId: "finance-accounting", subskillId: "bookkeeping" },
  "accounting": { categoryId: "finance-accounting", subskillId: "bookkeeping" },
  "legal": { categoryId: "legal-advisory", subskillId: "legal-advisory" },
  "translation": { categoryId: "communications-content", subskillId: "translation" },
  "writing": { categoryId: "communications-content", subskillId: "content-writing" },
  "photography": { categoryId: "design-creative", subskillId: "photography" },
  "video": { categoryId: "design-creative", subskillId: "video-editing" },
  "education": { categoryId: "education-training", subskillId: "curriculum-design" },
  "teaching": { categoryId: "education-training", subskillId: "curriculum-design" },
  "training": { categoryId: "education-training", subskillId: "workshop-facilitation" },
  "healthcare": { categoryId: "healthcare-wellness", subskillId: "health-camps" },
  "medical": { categoryId: "healthcare-wellness", subskillId: "health-camps" },
  "counseling": { categoryId: "healthcare-wellness", subskillId: "mental-health" },
  "mental health": { categoryId: "healthcare-wellness", subskillId: "mental-health" },
  "engineering": { categoryId: "web-development", subskillId: "backend-node" },
  "software": { categoryId: "web-development", subskillId: "backend-node" },
  "python": { categoryId: "web-development", subskillId: "backend-python" },
  "javascript": { categoryId: "web-development", subskillId: "frontend-react" },
  "react": { categoryId: "web-development", subskillId: "frontend-react" },
  "mobile": { categoryId: "web-development", subskillId: "mobile-react-native" },
  "android": { categoryId: "web-development", subskillId: "mobile-react-native" },
  "ios": { categoryId: "web-development", subskillId: "mobile-react-native" },
  "devops": { categoryId: "web-development", subskillId: "devops-cloud" },
  "cloud": { categoryId: "web-development", subskillId: "devops-cloud" },
  "monitoring": { categoryId: "operations-management", subskillId: "monitoring-evaluation" },
  "evaluation": { categoryId: "operations-management", subskillId: "monitoring-evaluation" },
  "logistics": { categoryId: "operations-management", subskillId: "logistics-management" },
  "hr": { categoryId: "operations-management", subskillId: "hr-management" },
  "human resources": { categoryId: "operations-management", subskillId: "hr-management" },
  "advocacy": { categoryId: "legal-advisory", subskillId: "policy-drafting" },
  "policy": { categoryId: "legal-advisory", subskillId: "policy-drafting" },
  "research": { categoryId: "data-research", subskillId: "research" },
  "environmental": { categoryId: "environment-sustainability", subskillId: "environmental-audits" },
  "sustainability": { categoryId: "environment-sustainability", subskillId: "sustainability-reporting" },
  "climate": { categoryId: "environment-sustainability", subskillId: "climate-action" },
}

// Build cause map
for (const cause of causesList) {
  CAUSE_KEYWORD_MAP.set(cause.name.toLowerCase(), cause.id)
  CAUSE_KEYWORD_MAP.set(cause.id, cause.id)
  for (const word of cause.name.toLowerCase().split(/[\s&-]+/).filter(w => w.length >= 4)) {
    if (!CAUSE_KEYWORD_MAP.has(word)) {
      CAUSE_KEYWORD_MAP.set(word, cause.id)
    }
  }
}

// Additional cause keyword mappings
const EXTERNAL_CAUSE_MAP: Record<string, string> = {
  "humanitarian": "disaster-relief",
  "disaster": "disaster-relief",
  "refugee": "disaster-relief",
  "education": "education",
  "health": "healthcare",
  "healthcare": "healthcare",
  "medical": "healthcare",
  "environment": "environment",
  "climate": "environment",
  "children": "children-youth",
  "youth": "children-youth",
  "women": "gender-equality",
  "gender": "gender-equality",
  "poverty": "poverty-alleviation",
  "food": "food-security",
  "hunger": "food-security",
  "water": "clean-water",
  "sanitation": "clean-water",
  "human rights": "human-rights",
  "rights": "human-rights",
  "animal": "animal-welfare",
  "disability": "disability-inclusion",
  "rural": "rural-development",
  "community": "community-development",
  "arts": "arts-culture",
  "culture": "arts-culture",
  "elderly": "elderly-care",
  "senior": "elderly-care",
  "technology": "digital-literacy",
  "digital": "digital-literacy",
  "mental health": "mental-health",
}

/**
 * Match raw tags/keywords from an external platform to our skill taxonomy.
 * Returns deduplicated skill objects.
 */
export function mapSkillTags(
  tags: string[]
): { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[] {
  const seen = new Set<string>()
  const results: { categoryId: string; subskillId: string; priority: "must-have" | "nice-to-have" }[] = []

  for (const rawTag of tags) {
    const tag = rawTag.toLowerCase().trim()
    if (!tag) continue

    // Try exact match from our taxonomy
    const exact = SKILL_KEYWORD_MAP.get(tag) || EXTERNAL_KEYWORD_MAP[tag]
    if (exact && !seen.has(exact.subskillId)) {
      seen.add(exact.subskillId)
      results.push({ ...exact, priority: "must-have" })
      continue
    }

    // Try partial matching: check if any keyword appears in the tag
    for (const [keyword, skill] of Object.entries(EXTERNAL_KEYWORD_MAP)) {
      if (tag.includes(keyword) && !seen.has(skill.subskillId)) {
        seen.add(skill.subskillId)
        results.push({ ...skill, priority: "nice-to-have" })
        break
      }
    }
  }

  return results
}

/**
 * Match raw tags/text to our cause taxonomy.
 * Returns deduplicated cause IDs.
 */
export function mapCauseTags(tags: string[]): string[] {
  const seen = new Set<string>()

  for (const rawTag of tags) {
    const tag = rawTag.toLowerCase().trim()
    if (!tag) continue

    const exact = CAUSE_KEYWORD_MAP.get(tag) || EXTERNAL_CAUSE_MAP[tag]
    if (exact && !seen.has(exact)) {
      seen.add(exact)
      continue
    }

    for (const [keyword, causeId] of Object.entries(EXTERNAL_CAUSE_MAP)) {
      if (tag.includes(keyword) && !seen.has(causeId)) {
        seen.add(causeId)
        break
      }
    }
  }

  return Array.from(seen)
}

/**
 * Detect work mode from text (title, description, location fields).
 */
export function detectWorkMode(text: string): "remote" | "onsite" | "hybrid" {
  const lower = text.toLowerCase()
  if (/\b(remote|virtual|work.?from.?home|telecommut|wfh|online.?based|home.?based)\b/.test(lower)) {
    if (/\b(hybrid|sometimes.?on.?site|partial.?remote|flexible.?location)\b/.test(lower)) {
      return "hybrid"
    }
    return "remote"
  }
  if (/\b(hybrid|flexible.?location)\b/.test(lower)) return "hybrid"
  return "onsite"
}

/**
 * Infer experience level from text.
 */
export function detectExperienceLevel(text: string): "beginner" | "intermediate" | "advanced" | "expert" {
  const lower = text.toLowerCase()
  if (/\b(senior|expert|lead|principal|10\+|15\+|director|head of)\b/.test(lower)) return "expert"
  if (/\b(mid.?senior|advanced|8\+|7\+|experienced)\b/.test(lower)) return "advanced"
  if (/\b(junior|entry.?level|intern|trainee|0.?2|1.?3|beginner|fresh)\b/.test(lower)) return "beginner"
  return "intermediate"
}
