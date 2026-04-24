// ============================================
// Advanced Matching Algorithm for JustBeCause Network
// ============================================
//
// DESIGN GOALS:
// 1. Skills are king — no match without skill relevance
// 2. Category-aware: "HTML/CSS" partially matches "WordPress" (same category)
// 3. Tiebreakers for scale: when 50,000 people have the same skills,
//    differentiate by experience depth, track record, rating, recency
// 4. Must-have skills are hard gates — missing one tanks the score
// 5. Score distribution: avoid clustering everyone at 50-60%
//    → real spread from 0-100% for meaningful ranking
// 6. HONESTY: a 3% match must never be shown. Only genuinely
//    relevant matches (>=25%) should reach users.
//
// ALGORITHM: Two-phase scoring
//   Phase 1: Hard skill filter + deep skill score (0-100)
//   Phase 2: Contextual signals as tiebreakers within skill tiers
//            (location, hours, causes, experience, activity, rating)

import type {
  VolunteerProfile,
  NGOProfile,
  Project,
  MatchScore,
  OpportunityMatchScore,
  PersonalizedOpportunity,
  RequiredSkill,
  VolunteerSkill,
} from "./types"

// ============================================
// SKILL CATEGORY TAXONOMY (for category-aware matching)
// ============================================
// Maps categoryId → related categoryIds with similarity weight
// This allows partial credit when volunteer has skills in a related category
const CATEGORY_SIMILARITY: Record<string, Record<string, number>> = {
  "website": {
    "digital-marketing": 0.25,
    "content-creation": 0.15,
    "data-technology": 0.35,
  },
  "digital-marketing": {
    "website": 0.20,
    "content-creation": 0.30,
    "communication": 0.25,
    "data-technology": 0.15,
  },
  "content-creation": {
    "digital-marketing": 0.25,
    "communication": 0.30,
    "website": 0.10,
  },
  "communication": {
    "content-creation": 0.25,
    "digital-marketing": 0.20,
    "fundraising": 0.15,
  },
  "fundraising": {
    "communication": 0.20,
    "finance": 0.15,
    "planning-support": 0.10,
  },
  "finance": {
    "fundraising": 0.10,
    "planning-support": 0.10,
    "legal": 0.15,
  },
  "planning-support": {
    "communication": 0.15,
    "finance": 0.10,
    "data-technology": 0.10,
  },
  "legal": {
    "finance": 0.15,
    "planning-support": 0.10,
    "communication": 0.10,
  },
  "data-technology": {
    "website": 0.35,
    "digital-marketing": 0.15,
    "planning-support": 0.10,
  },
}

// Experience level numeric value for scoring
const LEVEL_VALUE: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 2.5,
  expert: 3,
}

// ============================================
// PHASE 1: DEEP SKILL SCORING
// ============================================

/**
 * Advanced skill match: exact subskill → category-level → related-category
 * Returns 0-100 with granular differentiation
 *
 * Scoring per required skill:
 *   - Exact subskill match:
 *       expert=100, intermediate=80, beginner=60
 *   - Same category, different subskill:
 *       expert=25, intermediate=18, beginner=10
 *   - Related category:
 *       similarity_weight * 15 (max ~5)
 *   - No match at all: 0
 *
 * Must-have skills have 4x weight; nice-to-have have 1x weight
 * 
 * PHILOSOPHY: Partial credit is minimal. If a project needs React
 * and you know Vue (same category), you get a small nod — not half credit.
 */
function deepSkillMatch(
  requiredSkills: RequiredSkill[],
  volunteerSkills: VolunteerSkill[]
): { score: number; mustHavesMissing: number; matchedCount: number; totalRequired: number } {
  if (requiredSkills.length === 0) {
    return { score: 100, mustHavesMissing: 0, matchedCount: 0, totalRequired: 0 }
  }

  let totalWeightedScore = 0
  let totalWeight = 0
  let mustHavesMissing = 0
  let matchedCount = 0

  for (const required of requiredSkills) {
    const isMustHave = required.priority === "must-have"
    const weight = isMustHave ? 4 : 1
    totalWeight += weight

    // 1. Try exact subskill match (the REAL match)
    const exactMatch = volunteerSkills.find(
      (s) => s.categoryId === required.categoryId && s.subskillId === required.subskillId
    )

    if (exactMatch) {
      const levelMultiplier = { beginner: 0.60, intermediate: 0.80, advanced: 0.90, expert: 1.0 }[exactMatch.level] || 0.70
      totalWeightedScore += weight * levelMultiplier * 100
      matchedCount++
      continue
    }

    // 2. Try same category, different subskill (minimal transferable credit)
    // e.g., knows React but project needs Angular — small nod, NOT half credit
    const sameCategoryMatch = volunteerSkills
      .filter((s) => s.categoryId === required.categoryId)
      .sort((a, b) => (LEVEL_VALUE[b.level] || 0) - (LEVEL_VALUE[a.level] || 0))

    if (sameCategoryMatch.length > 0) {
      const bestLevel = sameCategoryMatch[0].level
      const levelScore = { beginner: 10, intermediate: 18, advanced: 22, expert: 25 }[bestLevel] || 15
      totalWeightedScore += weight * levelScore
      continue
    }

    // 3. Try related category match (tiny credit — barely registers)
    const relatedCategories = CATEGORY_SIMILARITY[required.categoryId] || {}
    let bestRelatedScore = 0
    for (const [relatedCatId, similarity] of Object.entries(relatedCategories)) {
      const relatedMatch = volunteerSkills.find((s) => s.categoryId === relatedCatId)
      if (relatedMatch) {
        const relatedScore = similarity * 15
        bestRelatedScore = Math.max(bestRelatedScore, relatedScore)
      }
    }

    if (bestRelatedScore > 0) {
      totalWeightedScore += weight * bestRelatedScore
      continue
    }

    // 4. No match at all — explicit zero
    if (isMustHave) mustHavesMissing++
    // totalWeightedScore += 0 (implicit)
  }

  const rawScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0

  return {
    score: Math.min(100, rawScore),
    mustHavesMissing,
    matchedCount,
    totalRequired: requiredSkills.length,
  }
}

/**
 * Skill match from volunteer's perspective (seeing jobs)
 * Answers: "How well do my skills fit this project?"
 */
function volunteerSkillFit(
  volunteerSkills: VolunteerSkill[],
  requiredSkills: RequiredSkill[]
): { score: number; mustHavesMet: number; totalMustHaves: number } {
  if (requiredSkills.length === 0) {
    // Project has no skill requirements — give low neutral score,
    // don't inflate match for unspecific projects
    return { score: 30, mustHavesMet: 0, totalMustHaves: 0 }
  }

  const mustHaves = requiredSkills.filter((s) => s.priority === "must-have")
  const niceToHaves = requiredSkills.filter((s) => s.priority !== "must-have")

  let mustHaveScore = 0
  let mustHavesMet = 0
  let niceToHaveScore = 0

  // Score must-have skills (critical — partial credit is minimal)
  for (const req of mustHaves) {
    const exact = volunteerSkills.find(
      (s) => s.categoryId === req.categoryId && s.subskillId === req.subskillId
    )
    if (exact) {
      const levelBonus = { beginner: 0.7, intermediate: 0.85, advanced: 0.93, expert: 1.0 }[exact.level] || 0.75
      mustHaveScore += levelBonus
      mustHavesMet++
    } else {
      // Check same category (transferable) — minimal credit for must-haves
      const sameCategory = volunteerSkills.find((s) => s.categoryId === req.categoryId)
      if (sameCategory) {
        mustHaveScore += 0.15 // Very small credit — you don't actually have the skill
      }
    }
  }

  // Score nice-to-have skills
  for (const req of niceToHaves) {
    const exact = volunteerSkills.find(
      (s) => s.categoryId === req.categoryId && s.subskillId === req.subskillId
    )
    if (exact) {
      niceToHaveScore += 1
    } else {
      const sameCategory = volunteerSkills.find((s) => s.categoryId === req.categoryId)
      if (sameCategory) {
        niceToHaveScore += 0.15
      }
    }
  }

  // Weighted combination: must-haves are 75% of skill score, nice-to-haves 25%
  const mustHavePercent = mustHaves.length > 0
    ? (mustHaveScore / mustHaves.length) * 100
    : 100
  const niceToHavePercent = niceToHaves.length > 0
    ? (niceToHaveScore / niceToHaves.length) * 100
    : 100

  const combinedScore = mustHaves.length > 0 && niceToHaves.length > 0
    ? mustHavePercent * 0.75 + niceToHavePercent * 0.25
    : mustHaves.length > 0
      ? mustHavePercent
      : niceToHavePercent

  return {
    score: Math.min(100, combinedScore),
    mustHavesMet,
    totalMustHaves: mustHaves.length,
  }
}

// ============================================
// PHASE 2: CONTEXTUAL SIGNAL FUNCTIONS
// ============================================

/**
 * Location / work mode compatibility
 * Uses fuzzy city matching + country fallback
 */
function locationScore(
  volunteerWorkMode: string,
  projectWorkMode: string,
  volunteerLocation?: string,
  projectLocation?: string
): number {
  // Remote matches everything
  if (projectWorkMode === "remote") return 100
  if (volunteerWorkMode === "remote") return 95 // Slightly less than project being remote

  // Hybrid is flexible
  if (volunteerWorkMode === "hybrid" && projectWorkMode === "hybrid") return 100
  if (volunteerWorkMode === "hybrid" || projectWorkMode === "hybrid") return 80

  // Both onsite — location matters
  if (projectWorkMode === "onsite" && volunteerWorkMode === "onsite") {
    if (!projectLocation || !volunteerLocation) return 40

    const vLoc = volunteerLocation.toLowerCase().trim()
    const pLoc = projectLocation.toLowerCase().trim()

    // Exact match
    if (vLoc === pLoc) return 100

    // City match (first segment before comma)
    const vCity = vLoc.split(",")[0].trim()
    const pCity = pLoc.split(",")[0].trim()

    if (vCity === pCity) return 100
    // Fuzzy city (one contains the other)
    if (vCity.includes(pCity) || pCity.includes(vCity)) return 90

    // Country match (last segment)
    const vCountry = vLoc.split(",").pop()?.trim()
    const pCountry = pLoc.split(",").pop()?.trim()

    if (vCountry && pCountry && vCountry === pCountry) return 55
    return 15 // Different country + onsite = very poor fit
  }

  // Mismatch (e.g., volunteer is onsite-only, project is onsite in different city)
  return 40
}

/**
 * Hours compatibility — can the volunteer commit enough time?
 */
function hoursScore(volunteerHours: string, projectHours: string): number {
  const hoursMap: Record<string, number> = {
    "1-5": 3,
    "5-10": 7.5,
    "10-15": 12.5,
    "10-20": 15,
    "15-20": 17.5,
    "20-30": 25,
    "20+": 25,
    "30+": 35,
    "full-time": 40,
  }

  const projectMatch = projectHours.match(/(\d+)[-–]?(\d+)?/)
  let projectAvg = 10
  if (projectMatch) {
    const min = parseInt(projectMatch[1])
    const max = projectMatch[2] ? parseInt(projectMatch[2]) : min
    projectAvg = (min + max) / 2
  }

  const volunteerAvg = hoursMap[volunteerHours] || 10

  if (volunteerAvg >= projectAvg) return 100
  if (volunteerAvg >= projectAvg * 0.8) return 85  // Close enough
  if (volunteerAvg >= projectAvg * 0.5) return 60  // Can do half
  return Math.max(10, (volunteerAvg / projectAvg) * 100)
}

/**
 * Cause alignment — shared mission matters
 */
function causeScore(volunteerCauses: string[], projectCauses: string[]): number {
  if (projectCauses.length === 0 || volunteerCauses.length === 0) return 40

  const matched = projectCauses.filter((c) => volunteerCauses.includes(c))
  const ratio = matched.length / projectCauses.length

  // Non-linear: at least 1 matching cause is important, but diminishing returns
  if (ratio >= 1.0) return 100
  if (ratio >= 0.5) return 75 + (ratio - 0.5) * 50  // 75-100
  if (ratio > 0) return 40 + ratio * 70               // 40-75
  return 5 // No cause overlap — minimal score
}

/**
 * Experience fit — does volunteer's level match what's needed?
 * Unlike before, only scores RELEVANT skills (not all skills average)
 */
function experienceFitScore(
  volunteerSkills: VolunteerSkill[],
  requiredSkills: RequiredSkill[],
  requiredLevel: string
): number {
  if (!requiredLevel || requiredLevel === "any") return 80

  const levelOrder = ["beginner", "intermediate", "expert"]
  const requiredIndex = levelOrder.indexOf(requiredLevel)
  if (requiredIndex === -1) return 80

  // Only look at skills that match the project's required skills (or category)
  const relevantVolunteerSkills = volunteerSkills.filter((vs) =>
    requiredSkills.some(
      (rs) => rs.categoryId === vs.categoryId
    )
  )

  if (relevantVolunteerSkills.length === 0) return 30

  // Use the BEST relevant skill level, not average
  const bestLevel = Math.max(
    ...relevantVolunteerSkills.map((s) => LEVEL_VALUE[s.level] || 1)
  )

  const bestIndex = bestLevel - 1 // Convert back to 0-based index

  if (bestIndex >= requiredIndex) return 100
  if (bestIndex === requiredIndex - 1) return 65
  return 30
}

// ============================================
// TIEBREAKER SIGNALS (for differentiating at scale)
// ============================================
// These create micro-differences so that among 50,000 volunteers with the
// same skills, the best ones bubble to the top.

/**
 * Track record score — completed projects + hours + rating
 * This is THE key differentiator when skills are identical
 */
function trackRecordScore(volunteer: VolunteerProfile): number {
  let score = 0

  // Rating (0-5 scale) → 0-35 points
  const rating = volunteer.rating || 0
  const ratingCount = volunteer.totalRatings || 0
  if (ratingCount > 0) {
    // Bayesian average to prevent 1-review-5-star gaming
    // Prior: assume 3.0 average with weight of 3 reviews
    const bayesianRating = (rating * ratingCount + 3.0 * 3) / (ratingCount + 3)
    score += (bayesianRating / 5) * 35
  } else {
    score += 15 // Neutral for unrated
  }

  // Completed projects → 0-30 points (diminishing returns)
  const projects = volunteer.completedProjects || 0
  score += Math.min(30, projects * 6) // 5 projects = max

  // Hours contributed → 0-20 points (diminishing returns)
  const hours = volunteer.hoursContributed || 0
  score += Math.min(20, Math.sqrt(hours) * 2) // ~100 hours = max

  // Profile completeness → 0-15 points
  let completeness = 0
  if (volunteer.bio && volunteer.bio.length > 30) completeness += 3
  if (volunteer.linkedinUrl) completeness += 3
  if (volunteer.portfolioUrl) completeness += 3
  if (volunteer.skills.length >= 3) completeness += 3
  if (volunteer.causes.length >= 2) completeness += 3
  score += completeness

  return Math.min(100, score)
}

/**
 * Availability & freshness score
 */
function availabilityScore(volunteer: VolunteerProfile): number {
  let score = 50

  // Availability status
  const availability = (volunteer as any).availability || "flexible"
  switch (availability) {
    case "flexible":
    case "weekdays":
      score = 90
      break
    case "weekends":
    case "evenings":
      score = 75
      break
    default:
      score = 60
  }

  // Recency bonus: active volunteers are better picks
  const lastActive = (volunteer as any).lastActive || (volunteer as any).updatedAt
  if (lastActive) {
    const days = Math.floor(
      (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days <= 3) score = Math.min(100, score + 10)
    else if (days <= 14) score = Math.min(100, score + 5)
    else if (days > 90) score = Math.max(0, score - 15)
  }

  // Verification bonus
  if (volunteer.isVerified) score = Math.min(100, score + 5)

  return score
}

/**
 * Urgency bonus for projects
 */
function urgencyScore(deadline?: Date | string): number {
  if (!deadline) return 50
  const days = Math.floor(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (days < 0) return 20    // Past deadline
  if (days <= 7) return 100  // Urgent
  if (days <= 14) return 80
  if (days <= 30) return 60
  return 40
}

/**
 * NGO quality score
 */
function ngoQualityScore(project: Project): number {
  let score = 50
  if ((project as any).ngo?.isVerified) score += 30
  if ((project as any).ngo?.rating >= 4) score += 20
  return Math.min(100, score)
}

// ============================================
// FINAL SCORE COMPOSITION
// ============================================

/**
 * Compose final score with skill-gated architecture.
 *
 * The key insight: skills define the TIER, tiebreakers rank WITHIN tiers.
 *
 *   Final = skillScore * 0.65 + contextScore * 0.20 + tiebreakerScore * 0.15
 *
 * Hard gates ensure irrelevant matches NEVER score high:
 *   - skillScore < 5:  cap at 8%  (noise — don't show these)
 *   - skillScore < 15: cap at 18% (barely relevant — don't show these either)
 *   - skillScore < 30: cap at 35% (marginal)
 *   - skillScore < 50: cap at 55% (partial, ok to show)
 *
 * Missing must-have skills compound a 30% penalty EACH.
 */
function composeFinalScore(
  skillScore: number,
  contextScores: { location: number; hours: number; cause: number; experience: number },
  tiebreakerScore: number,
  mustHavesMissing: number
): number {
  // Weighted context score
  const contextScore =
    contextScores.location * 0.25 +
    contextScores.hours * 0.25 +
    contextScores.cause * 0.30 +
    contextScores.experience * 0.20

  // Skills-dominant weighting: 65% skills, 20% context, 15% tiebreaker
  let final = skillScore * 0.65 + contextScore * 0.20 + tiebreakerScore * 0.15

  // Hard penalty for missing must-have skills — 30% reduction each, compounding
  if (mustHavesMissing > 0) {
    const penalty = Math.pow(0.70, mustHavesMissing)
    final *= penalty
  }

  // Hard gate: irrelevant skills = hard cap on final score
  // This is non-negotiable — skill relevance is the foundation
  if (skillScore < 5) {
    final = Math.min(final, 8)   // Complete mismatch — noise
  } else if (skillScore < 15) {
    final = Math.min(final, 18)  // Barely any relevance
  } else if (skillScore < 30) {
    final = Math.min(final, 35)  // Marginal fit
  } else if (skillScore < 50) {
    final = Math.min(final, 55)  // Partial fit
  }

  return Math.round(Math.max(0, Math.min(100, final)) * 100) / 100
}

// ============================================
// MAIN MATCHING FUNCTIONS
// ============================================

/**
 * Match volunteers to a project (for NGO view)
 * Returns sorted list of volunteers with match scores
 *
 * Handles edge case: 50,000+ volunteers with same skills
 * → Track record, rating, recency differentiate them
 */
export function matchVolunteersToProject(
  project: Project,
  volunteers: VolunteerProfile[]
): MatchScore[] {
  const scores: MatchScore[] = []

  for (const volunteer of volunteers) {
    // Skip explicitly deactivated/banned volunteers (isActive === false)
    // Note: undefined isActive is allowed (older accounts without the field)
    if (volunteer.isActive === false) continue
    // Skip volunteers with no skills (incomplete profiles)
    if (!volunteer.skills || volunteer.skills.length === 0) continue

    // Phase 1: Deep skill analysis
    const skill = deepSkillMatch(project.skillsRequired, volunteer.skills)

    // Phase 2: Contextual signals
    const location = locationScore(
      volunteer.workMode,
      project.workMode,
      volunteer.location,
      project.location
    )
    const hours = hoursScore(volunteer.hoursPerWeek, project.timeCommitment)
    const cause = causeScore(volunteer.causes, project.causes)
    const experience = experienceFitScore(
      volunteer.skills,
      project.skillsRequired,
      project.experienceLevel
    )

    // Phase 3: Tiebreaker
    const tiebreaker = trackRecordScore(volunteer) * 0.6 + availabilityScore(volunteer) * 0.4

    // Compose final score
    const score = composeFinalScore(
      skill.score,
      { location, hours, cause, experience },
      tiebreaker,
      skill.mustHavesMissing
    )

    scores.push({
      volunteerId: volunteer.userId,
      volunteerProfile: volunteer,
      score,
      breakdown: {
        skillMatch: Math.round(skill.score * 100) / 100,
        locationMatch: Math.round(location * 100) / 100,
        hoursMatch: Math.round(hours * 100) / 100,
        causeMatch: Math.round(cause * 100) / 100,
        experienceMatch: Math.round(experience * 100) / 100,
      },
    })
  }

  // Sort by score descending, with secondary sort by skill match for tiebreaking
  // Filter out low-quality matches — only return genuinely relevant volunteers
  return scores
    .filter((s) => s.score >= 20) // Hard floor: below 20% is noise
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) < 0.01) {
        return b.breakdown.skillMatch - a.breakdown.skillMatch
      }
      return b.score - a.score
    })
}

/**
 * Match opportunities to a volunteer (for Volunteer view)
 * Returns sorted list of projects with match scores
 */
export function matchOpportunitiesToVolunteer(
  volunteer: VolunteerProfile,
  projects: Project[]
): OpportunityMatchScore[] {
  const scores: OpportunityMatchScore[] = []

  for (const project of projects) {
    if (project.status !== "active") continue

    // Phase 1: How well do my skills fit?
    const skill = volunteerSkillFit(volunteer.skills, project.skillsRequired)

    // Phase 2: Contextual signals
    const location = locationScore(
      volunteer.workMode,
      project.workMode,
      volunteer.location,
      project.location
    )
    const hours = hoursScore(volunteer.hoursPerWeek, project.timeCommitment)
    const cause = causeScore(volunteer.causes, project.causes)
    const experience = experienceFitScore(
      volunteer.skills,
      project.skillsRequired,
      project.experienceLevel
    )

    // Tiebreaker: urgency + NGO quality
    const tiebreaker = urgencyScore(project.deadline) * 0.5 + ngoQualityScore(project) * 0.5

    // Compose final (volunteer view doesn't penalize missing must-haves as hard
    // because the volunteer should still SEE relevant jobs)
    const missedMustHaves = skill.totalMustHaves - skill.mustHavesMet
    const score = composeFinalScore(
      skill.score,
      { location, hours, cause, experience },
      tiebreaker,
      missedMustHaves
    )

    scores.push({
      projectId: project._id?.toString() || "",
      project,
      score,
      breakdown: {
        skillMatch: Math.round(skill.score * 100) / 100,
        workModeMatch: Math.round(location * 100) / 100,
        hoursMatch: Math.round(hours * 100) / 100,
        causeMatch: Math.round(cause * 100) / 100,
      },
    })
  }

  // Filter out irrelevant matches and sort
  return scores
    .filter((s) => s.score >= 15) // Hard floor: below 15% is noise for volunteer view
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) < 0.01) {
        return b.breakdown.skillMatch - a.breakdown.skillMatch
      }
      return b.score - a.score
    })
}

/**
 * Get recommended volunteers for an NGO based on their typical needs
 */
export function getRecommendedVolunteers(
  ngoTypicalSkills: RequiredSkill[],
  ngoCauses: string[],
  volunteers: VolunteerProfile[],
  limit: number = 10
): MatchScore[] {
  const scores: MatchScore[] = []

  for (const volunteer of volunteers) {
    // Skip explicitly deactivated/banned volunteers
    if (volunteer.isActive === false) continue
    if (!volunteer.skills || volunteer.skills.length === 0) continue

    const skill = deepSkillMatch(ngoTypicalSkills, volunteer.skills)
    const cause = causeScore(volunteer.causes, ngoCauses)
    const tiebreaker = trackRecordScore(volunteer)

    // For general recommendations: skills 50%, causes 25%, tiebreaker 25%
    let score = skill.score * 0.50 + cause * 0.25 + tiebreaker * 0.25

    // Skill gate still applies
    if (skill.score < 5) score = Math.min(score, 12)
    else if (skill.score < 15) score = Math.min(score, 25)

    // Must-have penalty
    if (skill.mustHavesMissing > 0) {
      score *= Math.pow(0.75, skill.mustHavesMissing)
    }

    score = Math.round(Math.max(0, Math.min(100, score)) * 100) / 100

    scores.push({
      volunteerId: volunteer.userId,
      volunteerProfile: volunteer,
      score,
      breakdown: {
        skillMatch: Math.round(skill.score * 100) / 100,
        locationMatch: 100,
        hoursMatch: 100,
        causeMatch: Math.round(cause * 100) / 100,
        experienceMatch: 100,
      },
    })
  }

  return scores
    .filter((s) => s.score >= 20) // Only genuinely relevant volunteers
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) < 0.01) {
        return b.breakdown.skillMatch - a.breakdown.skillMatch
      }
      return b.score - a.score
    }).slice(0, limit)
}

/**
 * Get recommended jobs for a volunteer
 */
export function getRecommendedOpportunities(
  volunteer: VolunteerProfile,
  projects: Project[],
  limit: number = 10
): OpportunityMatchScore[] {
  const matches = matchOpportunitiesToVolunteer(volunteer, projects)
  return matches.slice(0, limit)
}

/**
 * Quick filter to check if volunteer meets minimum requirements
 * Default threshold is 30% — below this is not worth showing
 */
export function meetsMinimumRequirements(
  volunteer: VolunteerProfile,
  project: Project,
  minSkillMatch: number = 30
): boolean {
  const skill = volunteerSkillFit(volunteer.skills, project.skillsRequired)
  return skill.score >= minSkillMatch
}

/**
 * Get match percentage label — honest, no inflation
 */
export function getMatchLabel(score: number): string {
  if (score >= 85) return "Excellent Match"
  if (score >= 70) return "Strong Match"
  if (score >= 55) return "Good Match"
  if (score >= 40) return "Fair Match"
  if (score >= 25) return "Weak Match"
  return "Poor Match"
}

/**
 * Get match color class — honest visual feedback
 */
export function getMatchColor(score: number): string {
  if (score >= 85) return "text-green-600 bg-green-100"
  if (score >= 70) return "text-emerald-600 bg-emerald-100"
  if (score >= 55) return "text-blue-600 bg-blue-100"
  if (score >= 40) return "text-yellow-600 bg-yellow-100"
  if (score >= 25) return "text-orange-600 bg-orange-100"
  return "text-red-600 bg-red-100"
}

// ============================================
// GEO-DISTANCE CALCULATION (Haversine)
// ============================================

interface Coordinates {
  lat: number
  lng: number
}

/**
 * Haversine formula — accurate distance between two GPS coordinates
 * Returns distance in kilometers
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

/**
 * Convert a raw distance (km) to a 0-100 score.
 *
 * Scoring curve:
 *   0-25 km    → 100  (same city / neighbourhood)
 *   25-100 km  → 90-100 (nearby cities)
 *   100-300 km → 70-90  (same region)
 *   300-1000 km → 40-70 (same country, far away)
 *   1000-5000 km → 15-40 (different country / continent)
 *   5000+ km   → 5-15 (other side of the world)
 */
function distanceToScore(distanceKm: number): number {
  if (distanceKm <= 25) return 100
  if (distanceKm <= 100) return 90 + (100 - distanceKm) / 75 * 10
  if (distanceKm <= 300) return 70 + (300 - distanceKm) / 200 * 20
  if (distanceKm <= 1000) return 40 + (1000 - distanceKm) / 700 * 30
  if (distanceKm <= 5000) return 15 + (5000 - distanceKm) / 4000 * 25
  return Math.max(5, 15 - (distanceKm - 5000) / 10000 * 10)
}

/**
 * Fuzzy city / country matching as a fallback when coordinates aren't available.
 * Returns estimated distance score based on string matching.
 */
function fuzzyLocationScore(
  volunteerCity?: string,
  volunteerCountry?: string,
  ngoCity?: string,
  ngoCountry?: string,
): number {
  const vCity = volunteerCity?.toLowerCase().trim()
  const vCountry = volunteerCountry?.toLowerCase().trim()
  const nCity = ngoCity?.toLowerCase().trim()
  const nCountry = ngoCountry?.toLowerCase().trim()

  // Both locations unknown
  if ((!vCity && !vCountry) || (!nCity && !nCountry)) return 50 // neutral

  // Same city
  if (vCity && nCity) {
    if (vCity === nCity) return 100
    // Fuzzy city: one contains the other (e.g. "new delhi" vs "delhi")
    if (vCity.includes(nCity) || nCity.includes(vCity)) return 92
  }

  // Same country, different city
  if (vCountry && nCountry && vCountry === nCountry) return 60

  // Different country
  if (vCountry && nCountry && vCountry !== nCountry) return 20

  return 40 // partial info
}

// ============================================
// FRESHNESS + URGENCY SCORING
// ============================================

/**
 * Scores a project based on how recently it was posted and how urgent
 * the deadline is.  Newer + more urgent → higher score.
 */
function freshnessScore(project: Project): number {
  let score = 50

  // Recency: posted recently → bonus
  const createdAt = project.createdAt ? new Date(project.createdAt) : null
  if (createdAt) {
    const daysOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysOld <= 1) score = 100
    else if (daysOld <= 3) score = 92
    else if (daysOld <= 7) score = 80
    else if (daysOld <= 14) score = 68
    else if (daysOld <= 30) score = 55
    else score = Math.max(20, 55 - (daysOld - 30) * 0.3)
  }

  // Deadline urgency bonus
  if (project.deadline) {
    const daysLeft = Math.ceil(
      (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysLeft > 0 && daysLeft <= 3) score = Math.min(100, score + 20)
    else if (daysLeft > 0 && daysLeft <= 7) score = Math.min(100, score + 12)
    else if (daysLeft > 0 && daysLeft <= 14) score = Math.min(100, score + 5)
    else if (daysLeft <= 0) score = Math.max(10, score - 30) // past deadline
  }

  // Low competition bonus — fewer applicants = better chance
  const applicants = project.applicantsCount || 0
  if (applicants === 0) score = Math.min(100, score + 8)
  else if (applicants < 3) score = Math.min(100, score + 4)
  else if (applicants > 20) score = Math.max(0, score - 5)

  return Math.max(0, Math.min(100, score))
}

// ============================================
// PRO-LEVEL PERSONALIZED SCORING
// ============================================

export interface PersonalizedScoringInput {
  volunteer: VolunteerProfile
  project: Project & { ngo?: { name: string; logo?: string; verified: boolean; city?: string; country?: string; coordinates?: Coordinates } }
  ngoProfile?: NGOProfile | null
  volunteerCoords?: Coordinates | null  // From profile or IP geolocation
  ngoCoords?: Coordinates | null         // From NGO profile or IP geolocation
}

/**
 * Master personalized scoring function.
 *
 * Combines 7 signals into a single relevance score:
 *
 * | Signal           | Weight | Why                                              |
 * |------------------|--------|--------------------------------------------------|
 * | Skill match      | 35%    | Skills are the #1 predictor of fit               |
 * | Geo distance     | 20%    | Closer NGOs = easier collaboration               |
 * | Cause alignment  | 15%    | Shared mission = higher motivation               |
 * | Work mode match  | 10%    | Remote vs onsite compatibility                   |
 * | Freshness        | 8%     | Newer & urgent posts get attention               |
 * | NGO quality      | 7%     | Verified NGOs with good track records            |
 * | Experience fit   | 5%     | Beginner/intermediate/expert alignment            |
 */
export function scorePersonalizedOpportunity(
  input: PersonalizedScoringInput
): PersonalizedOpportunity {
  const { volunteer, project, ngoProfile, volunteerCoords, ngoCoords } = input

  // ------- 1. SKILL MATCH (35%) -------
  const skill = volunteerSkillFit(volunteer.skills || [], project.skillsRequired || [])
  const skillScore = skill.score

  // ------- 2. GEO DISTANCE (20%) -------
  let geoScore = 50 // neutral default
  let distanceKm: number | null = null

  if (volunteerCoords && ngoCoords) {
    // Real coordinates available — use haversine
    distanceKm = Math.round(haversineDistance(volunteerCoords, ngoCoords) * 10) / 10
    geoScore = distanceToScore(distanceKm)
  } else {
    // Fallback: fuzzy city/country matching
    const vCity = volunteer.city
    const vCountry = volunteer.country
    const nCity = ngoProfile?.city || (project as any).ngo?.city
    const nCountry = ngoProfile?.country || (project as any).ngo?.country
    geoScore = fuzzyLocationScore(vCity, vCountry, nCity, nCountry)
  }

  // For remote projects, geo matters less — floor the geo score higher
  if (project.workMode === "remote") {
    geoScore = Math.max(geoScore, 85)
  }

  // ------- 3. CAUSE ALIGNMENT (15%) -------
  const causeAlign = causeScore(volunteer.causes || [], project.causes || [])

  // ------- 4. WORK MODE COMPATIBILITY (10%) -------
  const workMode = locationScore(
    volunteer.workMode,
    project.workMode,
    volunteer.location,
    project.location,
  )

  // ------- 5. FRESHNESS + URGENCY (8%) -------
  const freshness = freshnessScore(project)

  // ------- 6. NGO QUALITY (7%) -------
  let ngoQuality = 50
  const ngo = ngoProfile || (project as any).ngo
  if (ngo) {
    if (ngo.isVerified || ngo.verified) ngoQuality += 25
    if ((ngo.projectsCompleted || 0) >= 3) ngoQuality += 10
    if ((ngo.volunteersEngaged || 0) >= 5) ngoQuality += 10
    if ((ngo.projectsPosted || 0) >= 2) ngoQuality += 5
    ngoQuality = Math.min(100, ngoQuality)
  }

  // ------- 7. EXPERIENCE FIT (5%) -------
  const expFit = experienceFitScore(
    volunteer.skills || [],
    project.skillsRequired || [],
    project.experienceLevel,
  )

  // ------- COMPOSITE SCORE -------
  const WEIGHTS = {
    skill: 0.35,
    geo: 0.20,
    cause: 0.15,
    workMode: 0.10,
    freshness: 0.08,
    ngoQuality: 0.07,
    experience: 0.05,
  }

  let composite =
    skillScore * WEIGHTS.skill +
    geoScore * WEIGHTS.geo +
    causeAlign * WEIGHTS.cause +
    workMode * WEIGHTS.workMode +
    freshness * WEIGHTS.freshness +
    ngoQuality * WEIGHTS.ngoQuality +
    expFit * WEIGHTS.experience

  // ------- HARD GATES (skill relevance is non-negotiable) -------
  if (skillScore < 5) composite = Math.min(composite, 12)
  else if (skillScore < 15) composite = Math.min(composite, 22)
  else if (skillScore < 25) composite = Math.min(composite, 35)

  // Missing must-have penalty
  const missedMustHaves = skill.totalMustHaves - skill.mustHavesMet
  if (missedMustHaves > 0) {
    composite *= Math.pow(0.72, missedMustHaves)
  }

  composite = Math.round(Math.max(0, Math.min(100, composite)) * 100) / 100

  // ------- MATCH REASONS (human-readable for the UI) -------
  const reasons: string[] = []

  if (skillScore >= 70) reasons.push("Strong skill match")
  else if (skillScore >= 40) reasons.push("Good skill overlap")
  else if (skillScore >= 20) reasons.push("Some relevant skills")

  if (distanceKm !== null) {
    if (distanceKm <= 25) reasons.push("In your city")
    else if (distanceKm <= 100) reasons.push("Nearby location")
    else if (distanceKm <= 300) reasons.push("In your region")
  } else if (geoScore >= 90) {
    reasons.push("Same city")
  } else if (geoScore >= 60) {
    reasons.push("Same country")
  }

  if (project.workMode === "remote") reasons.push("Remote job")

  if (causeAlign >= 70) reasons.push("Aligned with your causes")
  else if (causeAlign >= 40) reasons.push("Related to your interests")

  if (freshness >= 85) reasons.push("Recently posted")
  if (project.deadline) {
    const daysLeft = Math.ceil(
      (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysLeft > 0 && daysLeft <= 7) reasons.push("Closing soon")
  }

  if ((project.applicantsCount || 0) === 0) reasons.push("Be the first to apply")
  else if ((project.applicantsCount || 0) < 3) reasons.push("Low competition")

  if (ngoQuality >= 75) reasons.push("Verified organization")

  return {
    projectId: project._id?.toString() || "",
    project,
    score: composite,
    distanceKm,
    breakdown: {
      skillMatch: Math.round(skillScore * 100) / 100,
      geoDistance: Math.round(geoScore * 100) / 100,
      causeAlignment: Math.round(causeAlign * 100) / 100,
      workModeMatch: Math.round(workMode * 100) / 100,
      freshness: Math.round(freshness * 100) / 100,
      ngoQuality: Math.round(ngoQuality * 100) / 100,
      experienceFit: Math.round(expFit * 100) / 100,
    },
    matchReasons: reasons.slice(0, 4), // Max 4 reasons for clean UI
  }
}

/**
 * Score and rank all projects for a volunteer — the main entry point for
 * the personalized opportunity feed.
 *
 * Projects are sorted by composite score descending.  Only projects with
 * score >= minScore are returned (default 10 — practically everything
 * except total mismatches).
 */
export function rankPersonalizedOpportunities(
  volunteer: VolunteerProfile,
  projects: (Project & { ngo?: any })[],
  ngoProfileMap: Map<string, NGOProfile>,
  volunteerCoords: { lat: number; lng: number } | null,
  ngoCoordMap: Map<string, { lat: number; lng: number }>,
  minScore: number = 15,
): PersonalizedOpportunity[] {
  const results: PersonalizedOpportunity[] = []

  for (const project of projects) {
    // Only score active / open projects
    const status = (project.status || "").toLowerCase()
    if (status !== "active" && status !== "open") continue

    const ngoId = project.ngoId
    const ngoProfile = ngoProfileMap.get(ngoId) || null
    const ngoCoords = ngoCoordMap.get(ngoId) || null

    const scored = scorePersonalizedOpportunity({
      volunteer,
      project,
      ngoProfile,
      volunteerCoords,
      ngoCoords,
    })

    if (scored.score >= minScore) {
      results.push(scored)
    }
  }

  // Sort: highest score first, skill match as tiebreaker
  results.sort((a, b) => {
    if (Math.abs(b.score - a.score) < 0.01) {
      return b.breakdown.skillMatch - a.breakdown.skillMatch
    }
    return b.score - a.score
  })

  return results
}
