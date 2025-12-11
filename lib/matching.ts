// ============================================
// Matching Algorithm for JustBecause.Asia
// ============================================

import type {
  VolunteerProfile,
  Project,
  MatchScore,
  OpportunityMatchScore,
  RequiredSkill,
  VolunteerSkill,
} from "./types"

// ============================================
// WEIGHTS FOR SCORING
// ============================================
const VOLUNTEER_MATCH_WEIGHTS = {
  skillMatch: 0.40,      // 40% - Most important
  locationMatch: 0.15,   // 15%
  hoursMatch: 0.15,      // 15%
  causeMatch: 0.15,      // 15%
  experienceMatch: 0.15, // 15%
}

const OPPORTUNITY_MATCH_WEIGHTS = {
  skillMatch: 0.40,      // 40%
  workModeMatch: 0.20,   // 20%
  hoursMatch: 0.20,      // 20%
  causeMatch: 0.20,      // 20%
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate skill match percentage
 * Compares required skills with volunteer skills
 */
function calculateSkillMatch(
  requiredSkills: RequiredSkill[],
  volunteerSkills: VolunteerSkill[]
): number {
  if (requiredSkills.length === 0) return 100

  let totalScore = 0
  let maxScore = 0

  for (const required of requiredSkills) {
    const weight = required.priority === "must-have" ? 2 : 1
    maxScore += weight * 100

    const volunteerSkill = volunteerSkills.find(
      (s) => s.categoryId === required.categoryId && s.subskillId === required.subskillId
    )

    if (volunteerSkill) {
      // Skill found - score based on experience level
      const levelScore = {
        beginner: 60,
        intermediate: 80,
        expert: 100,
      }[volunteerSkill.level] || 70

      totalScore += weight * levelScore
    }
  }

  return maxScore > 0 ? (totalScore / maxScore) * 100 : 0
}

/**
 * Calculate skill match for volunteer looking at opportunity
 */
function calculateVolunteerSkillMatch(
  volunteerSkills: VolunteerSkill[],
  requiredSkills: RequiredSkill[]
): number {
  if (requiredSkills.length === 0) return 50 // Neutral if no skills required

  const matchedSkills = requiredSkills.filter((required) =>
    volunteerSkills.some(
      (s) => s.categoryId === required.categoryId && s.subskillId === required.subskillId
    )
  )

  // Bonus for must-have skills
  const mustHaveSkills = requiredSkills.filter((s) => s.priority === "must-have")
  const matchedMustHave = mustHaveSkills.filter((required) =>
    volunteerSkills.some(
      (s) => s.categoryId === required.categoryId && s.subskillId === required.subskillId
    )
  )

  const baseScore = (matchedSkills.length / requiredSkills.length) * 100
  const mustHaveBonus = mustHaveSkills.length > 0
    ? (matchedMustHave.length / mustHaveSkills.length) * 20
    : 0

  return Math.min(100, baseScore + mustHaveBonus)
}

/**
 * Calculate location/work mode match
 */
function calculateLocationMatch(
  volunteerWorkMode: string,
  projectWorkMode: string,
  volunteerLocation?: string,
  projectLocation?: string
): number {
  // Remote matches everything
  if (projectWorkMode === "remote" || volunteerWorkMode === "remote") {
    return 100
  }

  // Hybrid is flexible
  if (projectWorkMode === "hybrid" || volunteerWorkMode === "hybrid") {
    return 80
  }

  // Both onsite - check location
  if (projectWorkMode === "onsite" && volunteerWorkMode === "onsite") {
    if (!projectLocation || !volunteerLocation) return 50

    // Simple location match (could be enhanced with geo-distance)
    const volunteerCity = volunteerLocation.toLowerCase().split(",")[0].trim()
    const projectCity = projectLocation.toLowerCase().split(",")[0].trim()

    if (volunteerCity === projectCity) return 100

    // Same country check (simple)
    const volunteerCountry = volunteerLocation.toLowerCase().split(",").pop()?.trim()
    const projectCountry = projectLocation.toLowerCase().split(",").pop()?.trim()

    if (volunteerCountry === projectCountry) return 60

    return 20
  }

  return 50
}

/**
 * Calculate hours compatibility
 */
function calculateHoursMatch(
  volunteerHours: string,
  projectHours: string
): number {
  const hoursMap: Record<string, number> = {
    "1-5": 3,
    "5-10": 7.5,
    "10-15": 12.5,
    "15-20": 17.5,
    "20-30": 25,
    "30+": 35,
    "full-time": 40,
  }

  // Extract number from project hours (e.g., "10-15 hours" -> 12.5)
  const projectMatch = projectHours.match(/(\d+)[-–]?(\d+)?/)
  let projectAvg = 10 // Default
  if (projectMatch) {
    const min = parseInt(projectMatch[1])
    const max = projectMatch[2] ? parseInt(projectMatch[2]) : min
    projectAvg = (min + max) / 2
  }

  const volunteerAvg = hoursMap[volunteerHours] || 10

  // Check if volunteer can commit enough hours
  if (volunteerAvg >= projectAvg) {
    return 100
  }

  // Partial match based on how close
  const ratio = volunteerAvg / projectAvg
  return Math.max(0, ratio * 100)
}

/**
 * Calculate cause alignment
 */
function calculateCauseMatch(
  volunteerCauses: string[],
  projectCauses: string[]
): number {
  if (projectCauses.length === 0 || volunteerCauses.length === 0) return 50

  const matchedCauses = projectCauses.filter((cause) =>
    volunteerCauses.includes(cause)
  )

  return (matchedCauses.length / projectCauses.length) * 100
}

/**
 * Calculate experience level match
 */
function calculateExperienceMatch(
  volunteerSkills: VolunteerSkill[],
  requiredLevel: string
): number {
  if (!requiredLevel || requiredLevel === "any") return 100

  const levelOrder = ["beginner", "intermediate", "expert"]
  const requiredIndex = levelOrder.indexOf(requiredLevel)

  // Get average volunteer skill level
  if (volunteerSkills.length === 0) return 50

  const avgIndex = volunteerSkills.reduce((sum, skill) => {
    return sum + levelOrder.indexOf(skill.level)
  }, 0) / volunteerSkills.length

  if (avgIndex >= requiredIndex) return 100
  if (avgIndex >= requiredIndex - 1) return 70

  return 40
}

// ============================================
// MAIN MATCHING FUNCTIONS
// ============================================

/**
 * Match volunteers to a project (for NGO view)
 * Returns sorted list of volunteers with match scores
 */
export function matchVolunteersToProject(
  project: Project,
  volunteers: VolunteerProfile[]
): MatchScore[] {
  const scores: MatchScore[] = []

  for (const volunteer of volunteers) {
    // Skip inactive volunteers
    if (!volunteer.isActive) continue

    const breakdown = {
      skillMatch: calculateSkillMatch(project.skillsRequired, volunteer.skills),
      locationMatch: calculateLocationMatch(
        volunteer.workMode,
        project.workMode,
        volunteer.location,
        project.location
      ),
      hoursMatch: calculateHoursMatch(volunteer.hoursPerWeek, project.timeCommitment),
      causeMatch: calculateCauseMatch(volunteer.causes, project.causes),
      experienceMatch: calculateExperienceMatch(volunteer.skills, project.experienceLevel),
    }

    const score =
      breakdown.skillMatch * VOLUNTEER_MATCH_WEIGHTS.skillMatch +
      breakdown.locationMatch * VOLUNTEER_MATCH_WEIGHTS.locationMatch +
      breakdown.hoursMatch * VOLUNTEER_MATCH_WEIGHTS.hoursMatch +
      breakdown.causeMatch * VOLUNTEER_MATCH_WEIGHTS.causeMatch +
      breakdown.experienceMatch * VOLUNTEER_MATCH_WEIGHTS.experienceMatch

    scores.push({
      volunteerId: volunteer.userId,
      volunteerProfile: volunteer,
      score: Math.round(score * 100) / 100,
      breakdown,
    })
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score)
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
    // Skip non-active projects
    if (project.status !== "active") continue

    const breakdown = {
      skillMatch: calculateVolunteerSkillMatch(volunteer.skills, project.skillsRequired),
      workModeMatch: calculateLocationMatch(
        volunteer.workMode,
        project.workMode,
        volunteer.location,
        project.location
      ),
      hoursMatch: calculateHoursMatch(volunteer.hoursPerWeek, project.timeCommitment),
      causeMatch: calculateCauseMatch(volunteer.causes, project.causes),
    }

    const score =
      breakdown.skillMatch * OPPORTUNITY_MATCH_WEIGHTS.skillMatch +
      breakdown.workModeMatch * OPPORTUNITY_MATCH_WEIGHTS.workModeMatch +
      breakdown.hoursMatch * OPPORTUNITY_MATCH_WEIGHTS.hoursMatch +
      breakdown.causeMatch * OPPORTUNITY_MATCH_WEIGHTS.causeMatch

    scores.push({
      projectId: project._id?.toString() || "",
      project,
      score: Math.round(score * 100) / 100,
      breakdown,
    })
  }

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score)
}

/**
 * Get recommended volunteers for an NGO based on their typical needs
 * (Not for a specific project, but general recommendations)
 */
export function getRecommendedVolunteers(
  ngoTypicalSkills: RequiredSkill[],
  ngoCauses: string[],
  volunteers: VolunteerProfile[],
  limit: number = 10
): MatchScore[] {
  const scores: MatchScore[] = []

  for (const volunteer of volunteers) {
    if (!volunteer.isActive) continue

    const breakdown = {
      skillMatch: calculateSkillMatch(ngoTypicalSkills, volunteer.skills),
      locationMatch: 100, // Not location-specific for general recommendations
      hoursMatch: 100, // Not hours-specific
      causeMatch: calculateCauseMatch(volunteer.causes, ngoCauses),
      experienceMatch: 100, // Not experience-specific
    }

    const score =
      breakdown.skillMatch * 0.6 +
      breakdown.causeMatch * 0.4

    scores.push({
      volunteerId: volunteer.userId,
      volunteerProfile: volunteer,
      score: Math.round(score * 100) / 100,
      breakdown,
    })
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Get recommended opportunities for a volunteer
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
 */
export function meetsMinimumRequirements(
  volunteer: VolunteerProfile,
  project: Project,
  minSkillMatch: number = 30
): boolean {
  const skillMatch = calculateVolunteerSkillMatch(volunteer.skills, project.skillsRequired)
  return skillMatch >= minSkillMatch
}

/**
 * Get match percentage label
 */
export function getMatchLabel(score: number): string {
  if (score >= 80) return "Excellent Match"
  if (score >= 60) return "Good Match"
  if (score >= 40) return "Moderate Match"
  return "Low Match"
}

/**
 * Get match color class
 */
export function getMatchColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-100"
  if (score >= 60) return "text-blue-600 bg-blue-100"
  if (score >= 40) return "text-yellow-600 bg-yellow-100"
  return "text-gray-600 bg-gray-100"
}
