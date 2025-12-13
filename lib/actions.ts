"use server"

// ============================================
// Server Actions for JustBecause.Asia
// ============================================

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "./auth"
import {
  volunteerProfilesDb,
  ngoProfilesDb,
  projectsDb,
  applicationsDb,
  profileUnlocksDb,
  transactionsDb,
  notificationsDb,
  adminSettingsDb,
  subscriptionPlansDb,
  conversationsDb,
  messagesDb,
  getDb,
} from "./database"
import {
  matchVolunteersToProject,
  matchOpportunitiesToVolunteer,
  getRecommendedVolunteers,
  getRecommendedOpportunities,
} from "./matching"
import type {
  VolunteerProfile,
  NGOProfile,
  Project,
  Application,
  VolunteerProfileView,
  ApiResponse,
  AdminSettings,
} from "./types"

// ============================================
// AUTH HELPERS
// ============================================

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session?.user || null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/signin")
  }
  return user
}

export async function requireRole(roles: string[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role as string)) {
    redirect("/")
  }
  return user
}

// Secure role selection - only allows volunteer or ngo roles (not admin)
// This prevents users from self-assigning admin role
export async function selectRole(role: "volunteer" | "ngo"): Promise<ApiResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    
    // If no user session, return error (don't redirect - let client handle it)
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }
    
    // Security: Only allow volunteer or ngo roles, never admin
    if (role !== "volunteer" && role !== "ngo") {
      return { success: false, error: "Invalid role" }
    }
    
    // Don't allow role change if user already has a valid role (volunteer/ngo) AND is onboarded
    // Allow role change if user has "user" (default from admin plugin) or no role
    const currentRole = user.role as string | undefined
    const hasValidRole = currentRole === "volunteer" || currentRole === "ngo" || currentRole === "admin"
    
    if (hasValidRole && user.isOnboarded) {
      return { success: false, error: "Cannot change role after onboarding" }
    }
    
    // Prevent changing away from admin role
    if (currentRole === "admin") {
      return { success: false, error: "Admin users cannot change their role" }
    }
    
    // Update role in the database
    const db = await getDb()
    const usersCollection = db.collection("user")
    
    // Try to update by 'id' field (better-auth default)
    let result = await usersCollection.updateOne(
      { id: user.id },
      { $set: { role: role, updatedAt: new Date() } }
    )
    
    // If not found by 'id', try by email as fallback
    if (result.matchedCount === 0 && user.email) {
      result = await usersCollection.updateOne(
        { email: user.email },
        { $set: { role: role, updatedAt: new Date() } }
      )
    }
    
    // Check if document was found (matchedCount) - modifiedCount may be 0 if same role
    if (result.matchedCount === 0) {
      console.error("User not found in database:", { userId: user.id, email: user.email })
      return { success: false, error: "User not found" }
    }
    
    revalidatePath("/")
    return { success: true, data: true }
  } catch (error) {
    console.error("Error selecting role:", error)
    return { success: false, error: "An error occurred" }
  }
}

// Mark user as onboarded - called after profile is saved
export async function completeOnboarding(): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireAuth()
    
    const db = await getDb()
    const usersCollection = db.collection("user")
    
    // Try to update by 'id' field (better-auth default)
    let result = await usersCollection.updateOne(
      { id: user.id },
      { $set: { isOnboarded: true, updatedAt: new Date() } }
    )
    
    // If not found by 'id', try by email as fallback
    if (result.matchedCount === 0 && user.email) {
      result = await usersCollection.updateOne(
        { email: user.email },
        { $set: { isOnboarded: true, updatedAt: new Date() } }
      )
    }
    
    if (result.matchedCount === 0) {
      console.error("User not found in database:", { userId: user.id, email: user.email })
      return { success: false, error: "User not found" }
    }
    
    revalidatePath("/")
    return { success: true, data: true }
  } catch (error) {
    console.error("Error completing onboarding:", error)
    return { success: false, error: "An error occurred" }
  }
}

// ============================================
// VOLUNTEER PROFILE ACTIONS
// ============================================

export async function saveVolunteerOnboarding(data: {
  profile: {
    phone: string
    location: string
    bio: string
    linkedinUrl?: string
    portfolioUrl?: string
  }
  skills: { categoryId: string; subskillId: string; level: string }[]
  causes: string[]
  workPreferences: {
    volunteerType: string
    workMode: string
    hoursPerWeek: string
    availability: string
    hourlyRate?: number
  }
}): Promise<ApiResponse<string>> {
  try {
    const user = await requireAuth()

    // Check if profile already exists
    const existing = await volunteerProfilesDb.findByUserId(user.id)
    
    const profileData: Omit<VolunteerProfile, "_id"> = {
      // Copy display name and avatar from auth user for easier display elsewhere
      name: (user as any).name || "",
      avatar: (user as any).image || undefined,
      userId: user.id,
      phone: data.profile.phone,
      location: data.profile.location,
      city: data.profile.location.split(",")[0]?.trim() || "",
      country: data.profile.location.split(",").pop()?.trim() || "India",
      bio: data.profile.bio,
      linkedinUrl: data.profile.linkedinUrl,
      portfolioUrl: data.profile.portfolioUrl,
      skills: data.skills.map((s) => ({
        categoryId: s.categoryId,
        subskillId: s.subskillId,
        level: s.level as "beginner" | "intermediate" | "expert",
      })),
      causes: data.causes,
      volunteerType: data.workPreferences.volunteerType as "free" | "paid" | "both",
      hourlyRate: data.workPreferences.hourlyRate,
      currency: "INR",
      workMode: data.workPreferences.workMode as "remote" | "onsite" | "hybrid",
      hoursPerWeek: data.workPreferences.hoursPerWeek,
      availability: data.workPreferences.availability as "weekdays" | "weekends" | "evenings" | "flexible",
      completedProjects: 0,
      hoursContributed: 0,
      rating: 0,
      totalRatings: 0,
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (existing) {
      await volunteerProfilesDb.update(user.id, profileData)
    } else {
      await volunteerProfilesDb.create(profileData)
    }

    // Update user's onboarded status via Better Auth
    // This would be done through Better Auth's user update

    revalidatePath("/volunteer/dashboard")
    return { success: true, data: "Profile saved successfully" }
  } catch (error) {
    console.error("Error saving volunteer onboarding:", error)
    return { success: false, error: "Failed to save profile" }
  }
}

export async function getVolunteerProfile(userId?: string): Promise<VolunteerProfile | null> {
  const targetUserId = userId || (await getCurrentUser())?.id
  if (!targetUserId) return null
  return volunteerProfilesDb.findByUserId(targetUserId)
}

// Allowed fields for volunteer profile updates - filters out sensitive fields
const ALLOWED_VOLUNTEER_UPDATE_FIELDS = [
  "name", "avatar", "phone", "location", "city", "country", "bio", "linkedinUrl", "portfolioUrl",
  "resumeUrl", "skills", "causes", "volunteerType", "hourlyRate", "currency",
  "workMode", "hoursPerWeek", "availability"
] as const

export async function updateVolunteerProfile(
  updates: Partial<VolunteerProfile>
): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireAuth()
    
    // Filter to only allowed fields - prevent modification of userId, isVerified, rating, etc.
    const filteredUpdates: Partial<VolunteerProfile> = {}
    for (const key of ALLOWED_VOLUNTEER_UPDATE_FIELDS) {
      if (key in updates) {
        (filteredUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key]
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return { success: false, error: "No valid fields to update" }
    }
    
    const result = await volunteerProfilesDb.update(user.id, filteredUpdates)
    revalidatePath("/volunteer/profile")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to update profile" }
  }
}

// ============================================
// NGO PROFILE ACTIONS
// ============================================

export async function saveNGOOnboarding(data: {
  orgDetails: {
    orgName: string
    registrationNumber?: string
    website?: string
    phone: string
    address: string
    city: string
    country: string
    description: string
    mission: string
    yearFounded?: string
    teamSize?: string
  }
  causes: string[]
  requiredSkills: { categoryId: string; subskillId: string; priority: string }[]
}): Promise<ApiResponse<string>> {
  try {
    const user = await requireAuth()

    const existing = await ngoProfilesDb.findByUserId(user.id)

    const profileData: Omit<NGOProfile, "_id"> = {
      // Save contact person name and contact email from auth user by default
      contactPersonName: (user as any).name || "",
      contactEmail: user.email || undefined,
      userId: user.id,
      orgName: data.orgDetails.orgName,
      registrationNumber: data.orgDetails.registrationNumber,
      website: data.orgDetails.website,
      phone: data.orgDetails.phone,
      address: data.orgDetails.address,
      city: data.orgDetails.city,
      country: data.orgDetails.country,
      description: data.orgDetails.description,
      mission: data.orgDetails.mission,
      yearFounded: data.orgDetails.yearFounded,
      teamSize: data.orgDetails.teamSize,
      causes: data.causes,
      typicalSkillsNeeded: data.requiredSkills.map((s) => ({
        categoryId: s.categoryId,
        subskillId: s.subskillId,
        priority: s.priority as "must-have" | "nice-to-have",
      })),
      acceptRemoteVolunteers: true,
      acceptOnsiteVolunteers: true,
      projectsPosted: 0,
      projectsCompleted: 0,
      volunteersEngaged: 0,
      isVerified: false,
      isActive: true,
      subscriptionTier: "free",
      profileUnlocksRemaining: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (existing) {
      await ngoProfilesDb.update(user.id, profileData)
    } else {
      await ngoProfilesDb.create(profileData)
    }

    revalidatePath("/ngo/dashboard")
    return { success: true, data: "NGO profile saved successfully" }
  } catch (error) {
    console.error("Error saving NGO onboarding:", error)
    return { success: false, error: "Failed to save profile" }
  }
}

export async function getNGOProfile(userId?: string): Promise<NGOProfile | null> {
  const targetUserId = userId || (await getCurrentUser())?.id
  if (!targetUserId) return null
  return ngoProfilesDb.findByUserId(targetUserId)
}

// Allowed fields for NGO profile updates - filters out sensitive fields
const ALLOWED_NGO_UPDATE_FIELDS = [
  "orgName", "organizationName", "registrationNumber", "website", "phone",
  "address", "city", "country", "description", "mission", "yearFounded",
  "teamSize", "logo", "socialLinks", "causes", "typicalSkillsNeeded",
  "acceptRemoteVolunteers", "acceptOnsiteVolunteers", "contactPersonName", "contactEmail", "contactPhone"
] as const

export async function updateNGOProfile(
  updates: Partial<NGOProfile>
): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireAuth()
    
    // Filter to only allowed fields - prevent modification of userId, isVerified, subscriptionTier, etc.
    const filteredUpdates: Partial<NGOProfile> = {}
    for (const key of ALLOWED_NGO_UPDATE_FIELDS) {
      if (key in updates) {
        (filteredUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key]
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return { success: false, error: "No valid fields to update" }
    }
    
    const result = await ngoProfilesDb.update(user.id, filteredUpdates)
    revalidatePath("/ngo/profile")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to update profile" }
  }
}

// ============================================
// PROJECT ACTIONS
// ============================================

import { validateProjectData, validateSkills, sanitizeString, isValidObjectId } from "./validation"

export async function createProject(data: {
  title: string
  description: string
  skillsRequired: { categoryId: string; subskillId: string; priority: string }[]
  experienceLevel: string
  timeCommitment: string
  duration: string
  projectType: string
  workMode: string
  location?: string
  causes: string[]
  startDate?: Date
  deadline?: Date
}): Promise<ApiResponse<string>> {
  try {
    const user = await requireRole(["ngo", "admin"])
    const ngoProfile = await ngoProfilesDb.findByUserId(user.id)

    if (!ngoProfile) {
      return { success: false, error: "NGO profile not found. Please complete onboarding." }
    }

    // Input validation
    const projectValidation = validateProjectData({
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      deadline: data.deadline,
    })
    if (!projectValidation.valid) {
      return { success: false, error: projectValidation.errors.join(", ") }
    }

    const skillsValidation = validateSkills(data.skillsRequired)
    if (!skillsValidation.valid) {
      return { success: false, error: skillsValidation.errors.join(", ") }
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(data.title, 200)
    const sanitizedDescription = sanitizeString(data.description, 10000)
    const sanitizedLocation = data.location ? sanitizeString(data.location, 200) : undefined

    const projectData: Omit<Project, "_id"> = {
      ngoId: user.id,
      ngoProfileId: ngoProfile._id?.toString() || "",
      title: sanitizedTitle,
      description: sanitizedDescription,
      skillsRequired: data.skillsRequired.map((s) => ({
        categoryId: s.categoryId,
        subskillId: s.subskillId,
        priority: s.priority as "must-have" | "nice-to-have",
      })),
      experienceLevel: data.experienceLevel as "beginner" | "intermediate" | "expert",
      timeCommitment: data.timeCommitment,
      duration: data.duration,
      projectType: data.projectType as "short-term" | "long-term" | "consultation" | "ongoing",
      workMode: data.workMode as "remote" | "onsite" | "hybrid",
      location: sanitizedLocation,
      causes: data.causes,
      startDate: data.startDate,
      deadline: data.deadline,
      status: "active",
      applicantsCount: 0,
      viewsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const projectId = await projectsDb.create(projectData)
    await ngoProfilesDb.incrementStat(user.id, "projectsPosted")

    revalidatePath("/ngo/projects")
    revalidatePath("/projects")
    return { success: true, data: projectId }
  } catch (error) {
    console.error("Error creating project:", error)
    return { success: false, error: "Failed to create project" }
  }
}

export async function getProject(id: string): Promise<Project | null> {
  return projectsDb.findById(id)
}

// Alias for getProject
export async function getProjectById(id: string): Promise<Project | null> {
  return projectsDb.findById(id)
}

// Get NGO by user ID or profile ID
export async function getNGOById(userId: string): Promise<NGOProfile | null> {
  return ngoProfilesDb.findByUserId(userId)
}

export async function getActiveProjects(limit?: number): Promise<Project[]> {
  return projectsDb.findActive({}, { limit, sort: { createdAt: -1 } as any })
}

export async function getNGOProjects(): Promise<Project[]> {
  const user = await getCurrentUser()
  if (!user) return []
  return projectsDb.findByNgoId(user.id)
}

// Alias for getNGOProjects
export async function getMyProjectsAsNGO(): Promise<Project[]> {
  return getNGOProjects()
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireRole(["ngo", "admin"])
    const project = await projectsDb.findById(id)

    if (!project || (project.ngoId !== user.id && user.role !== "admin")) {
      return { success: false, error: "Project not found or unauthorized" }
    }

    const result = await projectsDb.update(id, updates)
    revalidatePath(`/projects/${id}`)
    revalidatePath("/ngo/projects")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to update project" }
  }
}

export async function deleteProject(id: string): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireRole(["ngo", "admin"])
    const project = await projectsDb.findById(id)

    if (!project || (project.ngoId !== user.id && user.role !== "admin")) {
      return { success: false, error: "Project not found or unauthorized" }
    }

    const result = await projectsDb.delete(id)
    revalidatePath("/ngo/projects")
    revalidatePath("/projects")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to delete project" }
  }
}

// ============================================
// APPLICATION ACTIONS
// ============================================

export async function applyToProject(
  projectId: string,
  coverMessage?: string
): Promise<ApiResponse<string>> {
  try {
    const user = await requireRole(["volunteer"])
    const volunteerProfile = await volunteerProfilesDb.findByUserId(user.id)

    if (!volunteerProfile) {
      return { success: false, error: "Please complete your profile before applying" }
    }

    const project = await projectsDb.findById(projectId)
    if (!project) {
      return { success: false, error: "Project not found" }
    }

    if (project.status !== "active" && project.status !== "open") {
      return { success: false, error: "This project is no longer accepting applications" }
    }

    const applicationData: Omit<Application, "_id"> = {
      projectId,
      volunteerId: user.id,
      volunteerProfileId: volunteerProfile._id?.toString() || "",
      ngoId: project.ngoId,
      coverMessage,
      status: "pending",
      isProfileUnlocked: volunteerProfile.volunteerType !== "free", // Auto-unlock for paid volunteers
      appliedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Use atomic create-if-not-exists to prevent race condition duplicates
    const result = await applicationsDb.createIfNotExists(applicationData)
    
    if (!result.created) {
      return { success: false, error: "You have already applied to this project" }
    }

    const applicationId = result.id!
    
    // Best effort: increment applicants count and create notification
    // These are non-critical and won't fail the application
    try {
      await projectsDb.incrementApplicants(projectId)
    } catch (e) {
      console.error("Failed to increment applicants count:", e)
    }

    try {
      await notificationsDb.create({
        userId: project.ngoId,
        type: "new_application",
        title: "New Application Received",
        message: `A volunteer has applied to "${project.title}"`,
        referenceId: applicationId,
        referenceType: "application",
        isRead: false,
        createdAt: new Date(),
      })
    } catch (e) {
      console.error("Failed to create notification:", e)
    }

    revalidatePath("/volunteer/applications")
    revalidatePath("/ngo/applications")
    return { success: true, data: applicationId }
  } catch (error) {
    console.error("Error applying to project:", error)
    return { success: false, error: "Failed to submit application" }
  }
}

export async function getMyApplications(): Promise<Application[]> {
  const user = await getCurrentUser()
  if (!user) return []
  return applicationsDb.findByVolunteerId(user.id)
}

export async function getProjectApplications(projectId: string): Promise<Application[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const project = await projectsDb.findById(projectId)
  if (!project || (project.ngoId !== user.id && user.role !== "admin")) {
    return []
  }

  return applicationsDb.findByProjectId(projectId)
}

export async function getNGOApplications(): Promise<Application[]> {
  const user = await getCurrentUser()
  if (!user) return []
  return applicationsDb.findByNgoId(user.id)
}

export async function updateApplicationStatus(
  applicationId: string,
  status: Application["status"],
  notes?: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireRole(["ngo", "admin"])
    const application = await applicationsDb.findById(applicationId)

    if (!application || (application.ngoId !== user.id && user.role !== "admin")) {
      return { success: false, error: "Application not found or unauthorized" }
    }

    const result = await applicationsDb.updateStatus(applicationId, status, notes)

    // Create notification for volunteer
    await notificationsDb.create({
      userId: application.volunteerId,
      type: status === "accepted" ? "application_accepted" : "application_rejected",
      title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your application has been ${status}`,
      referenceId: applicationId,
      referenceType: "application",
      isRead: false,
      createdAt: new Date(),
    })

    revalidatePath("/ngo/applications")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to update application" }
  }
}

// ============================================
// PROFILE VISIBILITY & UNLOCK ACTIONS
// ============================================

/**
 * Get volunteer profile with visibility rules applied
 */
export async function getVolunteerProfileView(
  volunteerId: string
): Promise<VolunteerProfileView | null> {
  const currentUser = await getCurrentUser()
  const volunteerProfile = await volunteerProfilesDb.findByUserId(volunteerId)

  if (!volunteerProfile) return null

  // Determine if profile should be unlocked
  let isUnlocked = false

  // If volunteer is "paid" type, always show full profile
  if (volunteerProfile.volunteerType === "paid") {
    isUnlocked = true
  }
  // If viewing own profile
  else if (currentUser?.id === volunteerId) {
    isUnlocked = true
  }
  // If current user is admin
  else if (currentUser?.role === "admin") {
    isUnlocked = true
  }
  // If NGO has unlocked this profile
  else if (currentUser && currentUser.role === "ngo") {
    isUnlocked = await profileUnlocksDb.isUnlocked(currentUser.id, volunteerId)
  }

  // Build the view based on unlock status
  const view: VolunteerProfileView = {
    id: volunteerProfile.userId,
    location: volunteerProfile.city || volunteerProfile.location,
    skills: volunteerProfile.skills,
    causes: volunteerProfile.causes,
    workMode: volunteerProfile.workMode,
    hoursPerWeek: volunteerProfile.hoursPerWeek,
    volunteerType: volunteerProfile.volunteerType,
    completedProjects: volunteerProfile.completedProjects,
    hoursContributed: volunteerProfile.hoursContributed,
    rating: volunteerProfile.rating,
    isVerified: volunteerProfile.isVerified,
    isUnlocked,
    canMessage: isUnlocked,

    // Conditional fields (locked for free volunteers until unlocked)
    name: isUnlocked ? (volunteerProfile.name || "Volunteer") : null,
    avatar: isUnlocked ? volunteerProfile.avatar : null,
    bio: isUnlocked ? volunteerProfile.bio : null,
    phone: isUnlocked ? volunteerProfile.phone : null,
    linkedinUrl: isUnlocked ? volunteerProfile.linkedinUrl : null,
    portfolioUrl: isUnlocked ? volunteerProfile.portfolioUrl : null,
    resumeUrl: isUnlocked ? volunteerProfile.resumeUrl : null,
    hourlyRate: isUnlocked ? volunteerProfile.hourlyRate : null,
  }

  return view
}

/**
 * Unlock a volunteer profile (NGO pays)
 */
export async function unlockVolunteerProfile(
  volunteerId: string,
  paymentId?: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireRole(["ngo"])
    const ngoProfile = await ngoProfilesDb.findByUserId(user.id)

    if (!ngoProfile) {
      return { success: false, error: "NGO profile not found" }
    }

    const volunteerProfile = await volunteerProfilesDb.findByUserId(volunteerId)
    if (!volunteerProfile) {
      return { success: false, error: "Volunteer not found" }
    }

    // If volunteer is paid type, no unlock needed
    if (volunteerProfile.volunteerType === "paid") {
      return { success: true, data: true, message: "Profile is already accessible" }
    }

    // Get unlock price from settings
    const settings = await adminSettingsDb.get()
    const unlockPrice = settings?.singleProfileUnlockPrice || 499

    // Atomically try to create unlock record - prevents double charging
    const unlockResult = await profileUnlocksDb.createIfNotExists({
      ngoId: user.id,
      volunteerId,
      amountPaid: unlockPrice,
      currency: settings?.currency || "INR",
      paymentId,
      unlockedAt: new Date(),
    })

    if (!unlockResult.created) {
      // Already unlocked - return success but don't charge
      return { success: true, data: true, message: "Profile already unlocked" }
    }

    // Only process payment/decrement if unlock was newly created
    if (ngoProfile.profileUnlocksRemaining > 0) {
      // Use subscription unlock
      try {
        await ngoProfilesDb.decrementUnlocks(user.id)
      } catch (e) {
        console.error("Failed to decrement unlocks:", e)
      }
    } else {
      // Create transaction record
      // NOTE: In production, verify payment with Razorpay BEFORE creating unlock record
      try {
        await transactionsDb.create({
          userId: user.id,
          type: "profile_unlock",
          referenceId: volunteerId,
          referenceType: "volunteer",
          amount: unlockPrice,
          currency: settings?.currency || "INR",
          paymentGateway: "razorpay",
          paymentId,
          status: "completed",
          paymentStatus: "completed",
          createdAt: new Date(),
        })
      } catch (e) {
        console.error("Failed to create transaction:", e)
      }
    }

    // Best effort: Notify volunteer
    try {
      await notificationsDb.create({
        userId: volunteerId,
        type: "profile_unlocked",
        title: "Profile Viewed",
        message: `${ngoProfile.orgName} has unlocked your profile`,
        isRead: false,
        createdAt: new Date(),
      })
    } catch (e) {
      console.error("Failed to create notification:", e)
    }

    revalidatePath(`/volunteers/${volunteerId}`)
    return { success: true, data: true }
  } catch (error) {
    console.error("Error unlocking profile:", error)
    return { success: false, error: "Failed to unlock profile" }
  }
}

// ============================================
// MATCHING ACTIONS
// ============================================

export async function getMatchedVolunteersForProject(
  projectId: string
): Promise<{ volunteerId: string; score: number; profile: VolunteerProfileView }[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const project = await projectsDb.findById(projectId)
  if (!project) return []

  const volunteers = await volunteerProfilesDb.findMany({ isActive: true })
  const matches = matchVolunteersToProject(project, volunteers)

  // Convert to profile views
  const results = await Promise.all(
    matches.slice(0, 20).map(async (match) => {
      const profileView = await getVolunteerProfileView(match.volunteerId)
      return {
        volunteerId: match.volunteerId,
        score: match.score,
        profile: profileView!,
      }
    })
  )

  return results.filter((r) => r.profile !== null)
}

export async function getMatchedOpportunitiesForVolunteer(): Promise<
  { projectId: string; score: number; project: Project }[]
> {
  const user = await getCurrentUser()
  if (!user) return []

  const volunteerProfile = await volunteerProfilesDb.findByUserId(user.id)
  if (!volunteerProfile) return []

  const projects = await projectsDb.findActive()
  const matches = matchOpportunitiesToVolunteer(volunteerProfile, projects)

  return matches.slice(0, 20).map((m) => ({
    projectId: m.projectId,
    score: m.score,
    project: m.project,
  }))
}

// ============================================
// NOTIFICATION ACTIONS
// ============================================

export async function getNotifications() {
  const user = await getCurrentUser()
  if (!user) return []
  return notificationsDb.findByUserId(user.id)
}

export async function markNotificationRead(id: string): Promise<boolean> {
  return notificationsDb.markAsRead(id)
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return notificationsDb.markAllAsRead(user.id)
}

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) return 0
  return notificationsDb.countUnread(user.id)
}

// ============================================
// ADMIN ACTIONS
// ============================================

export async function getAdminSettings(): Promise<AdminSettings | null> {
  const user = await requireRole(["admin"])
  return adminSettingsDb.get()
}

export async function updateAdminSettings(
  settings: Partial<AdminSettings>
): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireRole(["admin"])
    const result = await adminSettingsDb.update(settings, user.id)
    revalidatePath("/admin/settings")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to update settings" }
  }
}

export async function getAdminStats(): Promise<{
  totalVolunteers: number
  totalNGOs: number
  totalProjects: number
  totalApplications: number
  totalRevenue: number
}> {
  await requireRole(["admin"])

  const [totalVolunteers, totalNGOs, totalProjects, totalApplications, totalRevenue] =
    await Promise.all([
      volunteerProfilesDb.count(),
      ngoProfilesDb.count(),
      projectsDb.count(),
      applicationsDb.count({}),
      transactionsDb.sumAmount({ paymentStatus: "completed" }),
    ])

  return {
    totalVolunteers,
    totalNGOs,
    totalProjects,
    totalApplications,
    totalRevenue,
  }
}

export async function getAllVolunteers(page: number = 1, limit: number = 20) {
  await requireRole(["admin"])
  const skip = (page - 1) * limit
  const [volunteers, total] = await Promise.all([
    volunteerProfilesDb.findMany({}, { skip, limit } as any),
    volunteerProfilesDb.count(),
  ])
  return { data: volunteers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAllNGOs(page: number = 1, limit: number = 20) {
  await requireRole(["admin"])
  const skip = (page - 1) * limit
  const [ngos, total] = await Promise.all([
    ngoProfilesDb.findMany({}, { skip, limit } as any),
    ngoProfilesDb.count(),
  ])
  return { data: ngos, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAllProjects(page: number = 1, limit: number = 20) {
  await requireRole(["admin"])
  const skip = (page - 1) * limit
  const [projects, total] = await Promise.all([
    projectsDb.findMany({}, { skip, limit } as any),
    projectsDb.count(),
  ])
  return { data: projects, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function verifyNGO(userId: string, isVerified: boolean): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    const result = await ngoProfilesDb.update(userId, { isVerified })
    revalidatePath("/admin/ngos")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to update verification status" }
  }
}

export async function verifyVolunteer(userId: string, isVerified: boolean): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    const result = await volunteerProfilesDb.update(userId, { isVerified })
    revalidatePath("/admin/volunteers")
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Failed to update verification status" }
  }
}

export async function suspendUser(
  userId: string,
  userType: "volunteer" | "ngo"
): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    
    if (userType === "volunteer") {
      await volunteerProfilesDb.update(userId, { isActive: false })
      revalidatePath("/admin/volunteers")
    } else {
      await ngoProfilesDb.update(userId, { isActive: false })
      revalidatePath("/admin/ngos")
    }
    
    revalidatePath("/admin/users")
    return { success: true, data: true }
  } catch (error) {
    console.error("Suspend user error:", error)
    return { success: false, error: "Failed to suspend user" }
  }
}

export async function reactivateUser(
  userId: string,
  userType: "volunteer" | "ngo"
): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    
    if (userType === "volunteer") {
      await volunteerProfilesDb.update(userId, { isActive: true })
      revalidatePath("/admin/volunteers")
    } else {
      await ngoProfilesDb.update(userId, { isActive: true })
      revalidatePath("/admin/ngos")
    }
    
    revalidatePath("/admin/users")
    return { success: true, data: true }
  } catch (error) {
    console.error("Reactivate user error:", error)
    return { success: false, error: "Failed to reactivate user" }
  }
}

export async function adminDeleteUser(
  userId: string,
  userType: "volunteer" | "ngo"
): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    
    const db = await getDb()
    
    // Delete user data based on type
    if (userType === "volunteer") {
      await Promise.all([
        db.collection("volunteer_profiles").deleteOne({ userId }),
        db.collection("applications").deleteMany({ volunteerId: userId }),
      ])
    } else {
      await Promise.all([
        db.collection("ngo_profiles").deleteOne({ userId }),
        db.collection("projects").deleteMany({ ngoId: userId }),
        db.collection("applications").deleteMany({ ngoId: userId }),
      ])
    }
    
    // Delete common data
    await Promise.all([
      db.collection("conversations").deleteMany({ participants: userId }),
      db.collection("messages").deleteMany({ 
        $or: [{ senderId: userId }, { receiverId: userId }] 
      }),
      db.collection("notifications").deleteMany({ userId }),
      db.collection("profile_unlocks").deleteMany({ 
        $or: [{ ngoId: userId }, { volunteerId: userId }] 
      }),
      db.collection("transactions").deleteMany({ userId }),
      // Delete user account
      db.collection("user").deleteOne({ id: userId }),
      db.collection("session").deleteMany({ userId }),
      db.collection("account").deleteMany({ userId }),
    ])
    
    revalidatePath("/admin/users")
    revalidatePath("/admin/volunteers")
    revalidatePath("/admin/ngos")
    
    return { success: true, data: true }
  } catch (error) {
    console.error("Admin delete user error:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

export async function verifyUser(
  userId: string,
  userType: "volunteer" | "ngo",
  isVerified: boolean
): Promise<ApiResponse<boolean>> {
  if (userType === "volunteer") {
    return verifyVolunteer(userId, isVerified)
  } else {
    return verifyNGO(userId, isVerified)
  }
}

// ============================================
// BROWSE & SEARCH ACTIONS
// ============================================

export async function browseVolunteers(filters?: {
  skills?: string[]
  causes?: string[]
  workMode?: string
  volunteerType?: string
  location?: string
}) {
  const query: any = { isActive: true }

  if (filters?.skills?.length) {
    query["skills.subskillId"] = { $in: filters.skills }
  }
  if (filters?.causes?.length) {
    query.causes = { $in: filters.causes }
  }
  if (filters?.workMode) {
    query.workMode = filters.workMode
  }
  if (filters?.volunteerType) {
    query.volunteerType = filters.volunteerType
  }

  const volunteers = await volunteerProfilesDb.findMany(query, { limit: 50 } as any)
  
  // Convert to profile views for proper visibility
  const views = await Promise.all(
    volunteers.map((v) => getVolunteerProfileView(v.userId))
  )
  
  return views.filter((v) => v !== null)
}

export async function browseProjects(filters?: {
  skills?: string[]
  causes?: string[]
  workMode?: string
  projectType?: string
}) {
  const query: any = { status: "active" }

  if (filters?.skills?.length) {
    query["skillsRequired.subskillId"] = { $in: filters.skills }
  }
  if (filters?.causes?.length) {
    query.causes = { $in: filters.causes }
  }
  if (filters?.workMode) {
    query.workMode = filters.workMode
  }
  if (filters?.projectType) {
    query.projectType = filters.projectType
  }

  return projectsDb.findMany(query, { limit: 50, sort: { createdAt: -1 } } as any)
}

export async function browseNGOs(filters?: {
  causes?: string[]
  location?: string
  isVerified?: boolean
}) {
  const query: any = { isActive: true }

  if (filters?.causes?.length) {
    query.causes = { $in: filters.causes }
  }
  if (filters?.isVerified !== undefined) {
    query.isVerified = filters.isVerified
  }

  return ngoProfilesDb.findMany(query, { limit: 50 } as any)
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

export async function getMyConversations() {
  const user = await getCurrentUser()
  if (!user) return []
  
  return conversationsDb.findByUserId(user.id)
}

export async function getConversation(conversationId: string) {
  const user = await getCurrentUser()
  if (!user) return null
  
  const conversations = await conversationsDb.findByUserId(user.id)
  return conversations.find(c => c._id?.toString() === conversationId) || null
}

export async function getConversationMessages(conversationId: string, limit = 50) {
  const user = await getCurrentUser()
  if (!user) return []
  
  // Verify user is part of conversation
  const conversations = await conversationsDb.findByUserId(user.id)
  const conversation = conversations.find(c => c._id?.toString() === conversationId)
  if (!conversation) return []
  
  // Mark messages as read
  await messagesDb.markAsRead(conversationId, user.id)
  
  return messagesDb.findByConversationId(conversationId, limit)
}

export async function sendMessage(
  receiverId: string,
  content: string,
  projectId?: string
): Promise<ApiResponse<string>> {
  try {
    const user = await requireAuth()
    
    if (!content.trim()) {
      return { success: false, error: "Message cannot be empty" }
    }
    
    // Find or create conversation
    const conversation = await conversationsDb.findOrCreate([user.id, receiverId], projectId)
    
    // Create message
    const messageId = await messagesDb.create({
      conversationId: conversation._id!.toString(),
      senderId: user.id,
      receiverId,
      content: content.trim(),
      isRead: false,
      createdAt: new Date(),
    })
    
    // Update conversation last message
    await conversationsDb.updateLastMessage(
      conversation._id!.toString(),
      content.length > 50 ? content.substring(0, 50) + "..." : content
    )
    
    // Create notification for receiver
    try {
      await notificationsDb.create({
        userId: receiverId,
        type: "new_message",
        title: "New Message",
        message: `You have a new message`,
        referenceId: conversation._id!.toString(),
        referenceType: "conversation",
        isRead: false,
        createdAt: new Date(),
      })
    } catch (e) {
      console.error("Failed to create notification:", e)
    }
    
    revalidatePath("/volunteer/messages")
    revalidatePath("/ngo/messages")
    return { success: true, data: messageId }
  } catch (error) {
    console.error("Error sending message:", error)
    return { success: false, error: "Failed to send message" }
  }
}

export async function startConversation(
  receiverId: string,
  projectId?: string,
  initialMessage?: string
): Promise<ApiResponse<string>> {
  try {
    const user = await requireAuth()
    
    // Find or create conversation
    const conversation = await conversationsDb.findOrCreate([user.id, receiverId], projectId)
    
    // If initial message provided, send it
    if (initialMessage?.trim()) {
      await sendMessage(receiverId, initialMessage, projectId)
    }
    
    return { success: true, data: conversation._id!.toString() }
  } catch (error) {
    console.error("Error starting conversation:", error)
    return { success: false, error: "Failed to start conversation" }
  }
}

export async function getUnreadMessageCount(): Promise<number> {
  const user = await getCurrentUser()
  if (!user) return 0
  return messagesDb.countUnread(user.id)
}

export async function getMyNotifications() {
  const user = await getCurrentUser()
  if (!user) return []
  
  return notificationsDb.findByUserId(user.id)
}

// ============================================
// PROFILE UNLOCKS & TRANSACTIONS
// ============================================

export async function getUnlockedProfiles() {
  const user = await getCurrentUser()
  if (!user) return []
  
  return profileUnlocksDb.findByNgoId(user.id)
}

export async function getMyTransactions() {
  const user = await getCurrentUser()
  if (!user) return []
  
  return transactionsDb.findByUserId(user.id)
}

export async function getAllTransactions(page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const [transactions, total] = await Promise.all([
    transactionsDb.findMany({}, { skip, limit, sort: { createdAt: -1 } }),
    transactionsDb.count({}),
  ])
  
  return {
    data: transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getPaymentStats() {
  const [totalRevenue, profileUnlockRevenue, totalTransactions, completedTransactions] = await Promise.all([
    transactionsDb.sumAmount({ paymentStatus: "completed" }),
    transactionsDb.sumAmount({ type: "profile_unlock", paymentStatus: "completed" }),
    transactionsDb.count({}),
    transactionsDb.count({ paymentStatus: "completed" }),
  ])
  
  return {
    totalRevenue,
    profileUnlockRevenue,
    totalTransactions,
    completedTransactions,
  }
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // For OAuth users, password change might not be applicable
    // Better Auth handles password separately - we need to use auth client
    // This is a placeholder - actual implementation depends on Better Auth config
    
    // Validate new password
    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" }
    }

    // Note: Better Auth uses auth.api.changePassword which requires proper setup
    // For now, return an informative error for OAuth-only users
    return { 
      success: false, 
      error: "Password change is only available for email/password accounts. OAuth users should manage passwords through their provider." 
    }
  } catch (error) {
    console.error("Change password error:", error)
    return { success: false, error: "Failed to change password" }
  }
}

export async function deleteAccount(): Promise<ApiResponse<boolean>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const db = await getDb()

    // Delete all user data
    await Promise.all([
      // Delete volunteer profile
      db.collection("volunteer_profiles").deleteOne({ userId: user.id }),
      // Delete NGO profile
      db.collection("ngo_profiles").deleteOne({ userId: user.id }),
      // Delete user's projects (for NGOs)
      db.collection("projects").deleteMany({ ngoId: user.id }),
      // Delete user's applications (for volunteers)
      db.collection("applications").deleteMany({ volunteerId: user.id }),
      // Delete user's conversations
      db.collection("conversations").deleteMany({ participants: user.id }),
      // Delete user's messages
      db.collection("messages").deleteMany({ 
        $or: [{ senderId: user.id }, { receiverId: user.id }] 
      }),
      // Delete user's notifications
      db.collection("notifications").deleteMany({ userId: user.id }),
      // Delete profile unlocks related to user
      db.collection("profile_unlocks").deleteMany({ 
        $or: [{ ngoId: user.id }, { volunteerId: user.id }] 
      }),
      // Delete user's transactions
      db.collection("transactions").deleteMany({ userId: user.id }),
      // Finally, delete the user account
      db.collection("user").deleteOne({ id: user.id }),
      db.collection("session").deleteMany({ userId: user.id }),
      db.collection("account").deleteMany({ userId: user.id }),
    ])

    return { success: true, data: true }
  } catch (error) {
    console.error("Delete account error:", error)
    return { success: false, error: "Failed to delete account" }
  }
}

// ============================================
// INITIALIZATION
// ============================================

export async function initializePlatform(): Promise<void> {
  // Initialize subscription plans
  await subscriptionPlansDb.initializeDefaults()
  
  // Initialize admin settings with a system user
  await adminSettingsDb.initialize("system")
}
