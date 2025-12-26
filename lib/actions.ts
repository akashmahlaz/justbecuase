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
  banRecordsDb,
  teamMembersDb,
  getDb,
} from "./database"
import { getUserInfo, getUsersInfo } from "./user-utils"
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
  BanRecord,
  TeamMember,
} from "./types"

// ============================================
// SERIALIZATION HELPERS
// ============================================
// MongoDB returns objects with ObjectId and Date that can't be passed to client components
// These helpers convert them to plain JSON-serializable objects

function serializeDocument<T>(doc: T | null): T | null {
  if (!doc) return null
  return JSON.parse(JSON.stringify(doc))
}

function serializeDocuments<T>(docs: T[]): T[] {
  return JSON.parse(JSON.stringify(docs))
}

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
    coordinates?: { lat: number; lng: number } | null
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
      // Store exact coordinates if available
      coordinates: data.profile.coordinates || undefined,
      skills: data.skills.map((s) => ({
        categoryId: s.categoryId,
        subskillId: s.subskillId,
        level: s.level as "beginner" | "intermediate" | "expert",
      })),
      causes: data.causes,
      languages: [],
      interests: [],
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
      // Subscription defaults
      subscriptionPlan: "free",
      monthlyApplicationsUsed: 0,
      subscriptionResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
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
  const profile = await volunteerProfilesDb.findByUserId(targetUserId)
  return serializeDocument(profile)
}

// Get volunteer subscription status with limits
export async function getVolunteerSubscriptionStatus(): Promise<{
  plan: "free" | "pro"
  applicationsUsed: number
  applicationsLimit: number
  canApply: boolean
  expiryDate?: Date
} | null> {
  const user = await getCurrentUser()
  if (!user || user.role !== "volunteer") return null
  
  const profile = await volunteerProfilesDb.findByUserId(user.id)
  if (!profile) return null

  const plan = profile.subscriptionPlan || "free"
  const applicationsUsed = profile.monthlyApplicationsUsed || 0
  const FREE_LIMIT = 3
  const applicationsLimit = plan === "pro" ? 999999 : FREE_LIMIT
  
  // Check if reset needed
  const now = new Date()
  const resetDate = profile.subscriptionResetDate ? new Date(profile.subscriptionResetDate) : null
  
  let currentUsed = applicationsUsed
  if (resetDate && now >= resetDate) {
    currentUsed = 0
  }

  return {
    plan,
    applicationsUsed: currentUsed,
    applicationsLimit,
    canApply: plan === "pro" || currentUsed < FREE_LIMIT,
    expiryDate: profile.subscriptionExpiry,
  }
}

// Get NGO subscription status with limits
export async function getNGOSubscriptionStatus(): Promise<{
  plan: "free" | "pro"
  unlocksUsed: number
  unlocksLimit: number
  canUnlock: boolean
  expiryDate?: Date
} | null> {
  const user = await getCurrentUser()
  if (!user || user.role !== "ngo") return null
  
  const profile = await ngoProfilesDb.findByUserId(user.id)
  if (!profile) return null

  const plan = profile.subscriptionPlan || "free"
  const unlocksUsed = profile.monthlyUnlocksUsed || 0
  const FREE_LIMIT = 0 // Free plan = no unlocks
  const unlocksLimit = plan === "pro" ? 999999 : FREE_LIMIT
  
  // Check if reset needed
  const now = new Date()
  const resetDate = profile.subscriptionResetDate ? new Date(profile.subscriptionResetDate) : null
  
  let currentUsed = unlocksUsed
  if (resetDate && now >= resetDate) {
    currentUsed = 0
  }

  return {
    plan,
    unlocksUsed: currentUsed,
    unlocksLimit,
    canUnlock: plan === "pro", // Free plan cannot unlock at all
    expiryDate: profile.subscriptionExpiry,
  }
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
    
    // Auto-sync name/avatar to auth table (single source of truth)
    const syncData: { name?: string; image?: string } = {}
    if (filteredUpdates.name) syncData.name = filteredUpdates.name
    if (filteredUpdates.avatar) syncData.image = filteredUpdates.avatar
    
    if (Object.keys(syncData).length > 0) {
      const { syncUserDataToProfile } = await import("./user-utils")
      await syncUserDataToProfile(user.id, syncData)
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
    coordinates?: { lat: number; lng: number } | null
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
      // Store exact coordinates if available
      coordinates: data.orgDetails.coordinates || undefined,
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
      // Subscription defaults (new simplified system)
      subscriptionPlan: "free",
      monthlyUnlocksUsed: 0,
      monthlyUnlocksLimit: 0, // Free plan = no unlocks, must upgrade
      monthlyProjectsPosted: 0, // Track projects posted this month
      subscriptionResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      // Legacy fields (keeping for backwards compatibility)
      subscriptionTier: "free",
      profileUnlocksRemaining: 5,
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
  const profile = await ngoProfilesDb.findByUserId(targetUserId)
  return serializeDocument(profile)
}

// Allowed fields for NGO profile updates - filters out sensitive fields
const ALLOWED_NGO_UPDATE_FIELDS = [
  "orgName", "organizationName", "registrationNumber", "website", "phone",
  "address", "city", "country", "description", "mission", "yearFounded",
  "teamSize", "logo", "socialLinks", "causes", "typicalSkillsNeeded",
  "acceptRemoteVolunteers", "acceptOnsiteVolunteers", "contactPersonName", "contactEmail", "contactPhone",
  "coordinates"
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
    
    // Auto-sync logo to auth table (single source of truth for images)
    if (filteredUpdates.logo) {
      const { syncUserDataToProfile } = await import("./user-utils")
      await syncUserDataToProfile(user.id, { image: filteredUpdates.logo })
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
  documents?: Array<{ name: string; url: string; type: string }>
}): Promise<ApiResponse<string>> {
  try {
    const user = await requireRole(["ngo", "admin"])
    const ngoProfile = await ngoProfilesDb.findByUserId(user.id)

    if (!ngoProfile) {
      return { success: false, error: "NGO profile not found. Please complete onboarding." }
    }

    // Get admin settings for project limits
    const settings = await adminSettingsDb.get()
    const FREE_PLAN_PROJECT_LIMIT = settings?.ngoFreeProjectsPerMonth ?? 3

    // Check project posting limits for free plan NGOs
    const subscriptionPlan = ngoProfile.subscriptionPlan || "free"
    const monthlyProjectsPosted = ngoProfile.monthlyProjectsPosted || 0
    
    // Check if we need to reset monthly counter
    const now = new Date()
    const resetDate = ngoProfile.subscriptionResetDate ? new Date(ngoProfile.subscriptionResetDate) : null
    
    let shouldResetCounter = false
    if (resetDate && now >= resetDate) {
      // Reset the counter - it's a new month
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      await ngoProfilesDb.update(user.id, {
        monthlyProjectsPosted: 0,
        subscriptionResetDate: nextResetDate,
      })
      shouldResetCounter = true
    } else if (subscriptionPlan === "free" && !shouldResetCounter && monthlyProjectsPosted >= FREE_PLAN_PROJECT_LIMIT) {
      // Free plan limit reached
      return { 
        success: false, 
        error: `You've reached your monthly limit of ${FREE_PLAN_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited projects!`,
      }
    }

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
      documents: data.documents,
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

    // Increment monthly project counter for free plan NGOs
    if (subscriptionPlan === "free") {
      try {
        await ngoProfilesDb.update(user.id, {
          monthlyProjectsPosted: (monthlyProjectsPosted || 0) + 1,
          // Set reset date if not set
          ...(ngoProfile.subscriptionResetDate ? {} : { subscriptionResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1) }),
        })
      } catch (e) {
        console.error("Failed to increment monthly project count:", e)
      }
    }

    revalidatePath("/ngo/projects")
    revalidatePath("/projects")
    return { success: true, data: projectId }
  } catch (error) {
    console.error("Error creating project:", error)
    return { success: false, error: "Failed to create project" }
  }
}

export async function getProject(id: string): Promise<Project | null> {
  const project = await projectsDb.findById(id)
  return serializeDocument(project)
}

// Alias for getProject
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await projectsDb.findById(id)
  return serializeDocument(project)
}

// Get NGO by user ID or profile ID
export async function getNGOById(userId: string): Promise<NGOProfile | null> {
  const profile = await ngoProfilesDb.findByUserId(userId)
  return serializeDocument(profile)
}

export async function getActiveProjects(limit?: number): Promise<Project[]> {
  const projects = await projectsDb.findActive({}, { limit, sort: { createdAt: -1 } as any })
  return serializeDocuments(projects)
}

export async function getNGOProjects(): Promise<Project[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const projects = await projectsDb.findByNgoId(user.id)
  return serializeDocuments(projects)
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

    // Get admin settings for application limits
    const settings = await adminSettingsDb.get()
    const FREE_PLAN_LIMIT = settings?.volunteerFreeApplicationsPerMonth ?? 3

    // Check application limits for free plan volunteers
    const subscriptionPlan = volunteerProfile.subscriptionPlan || "free"
    const monthlyApplicationsUsed = volunteerProfile.monthlyApplicationsUsed || 0
    
    // Check if we need to reset monthly counter
    const now = new Date()
    const resetDate = volunteerProfile.subscriptionResetDate ? new Date(volunteerProfile.subscriptionResetDate) : null
    
    if (resetDate && now >= resetDate) {
      // Reset the counter - it's a new month
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      await volunteerProfilesDb.update(user.id, {
        monthlyApplicationsUsed: 0,
        subscriptionResetDate: nextResetDate,
      })
    } else if (subscriptionPlan === "free" && monthlyApplicationsUsed >= FREE_PLAN_LIMIT) {
      // Free plan limit reached
      return { 
        success: false, 
        error: `You've reached your monthly limit of ${FREE_PLAN_LIMIT} applications. Upgrade to Pro for unlimited applications!`,
        data: "LIMIT_REACHED" as any
      }
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
    
    // Increment application counter for free plan users
    if (subscriptionPlan === "free") {
      try {
        await volunteerProfilesDb.incrementApplicationCount(user.id)
      } catch (e) {
        console.error("Failed to increment application count:", e)
      }
    }
    
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

export async function hasAppliedToProject(projectId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return applicationsDb.exists(projectId, user.id)
}

// ============================================
// SAVE/BOOKMARK PROJECTS
// ============================================

export async function toggleSaveProject(projectId: string): Promise<ApiResponse<{ isSaved: boolean }>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const profile = await volunteerProfilesDb.findByUserId(user.id)
    if (!profile) {
      return { success: false, error: "Volunteer profile not found" }
    }

    const savedProjects = profile.savedProjects || []
    const isCurrentlySaved = savedProjects.includes(projectId)

    let newSavedProjects: string[]
    if (isCurrentlySaved) {
      // Unsave
      newSavedProjects = savedProjects.filter((id) => id !== projectId)
    } else {
      // Save
      newSavedProjects = [...savedProjects, projectId]
    }

    // Update profile
    await volunteerProfilesDb.update(user.id, {
      savedProjects: newSavedProjects,
    } as any)

    revalidatePath("/volunteer/opportunities")
    revalidatePath(`/projects/${projectId}`)

    return { success: true, data: { isSaved: !isCurrentlySaved } }
  } catch (error) {
    console.error("Error toggling save project:", error)
    return { success: false, error: "Failed to save project" }
  }
}

export async function isProjectSaved(projectId: string): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  const profile = await volunteerProfilesDb.findByUserId(user.id)
  if (!profile) return false
  
  return (profile.savedProjects || []).includes(projectId)
}

export async function getSavedProjects(): Promise<Project[]> {
  const user = await getCurrentUser()
  if (!user) return []
  
  const profile = await volunteerProfilesDb.findByUserId(user.id)
  if (!profile || !profile.savedProjects?.length) return []
  
  const projects = await Promise.all(
    profile.savedProjects.map((id) => projectsDb.findById(id))
  )
  
  return serializeDocuments(projects.filter(Boolean) as Project[])
}

export async function getMyApplications(): Promise<Application[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const applications = await applicationsDb.findByVolunteerId(user.id)
  return serializeDocuments(applications)
}

export async function getProjectApplications(projectId: string): Promise<Application[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const project = await projectsDb.findById(projectId)
  if (!project || (project.ngoId !== user.id && user.role !== "admin")) {
    return []
  }

  const applications = await applicationsDb.findByProjectId(projectId)
  return serializeDocuments(applications)
}

export async function getNGOApplications(): Promise<Application[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const applications = await applicationsDb.findByNgoId(user.id)
  return serializeDocuments(applications)
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
  
  // Also get user info for name fallback
  const db = await import("@/lib/database").then(m => m.getDb())
  const volunteerUser = await (await db).collection("user").findOne({ id: volunteerId })

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

  // Get the best name available
  const displayName = volunteerProfile.name || volunteerUser?.name || "Volunteer"

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
    name: isUnlocked ? displayName : null,
    avatar: isUnlocked ? (volunteerProfile.avatar || volunteerUser?.image) : null,
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
 * Unlock a volunteer profile (NGO pays or uses subscription)
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

    // Check subscription plan and limits
    const subscriptionPlan = ngoProfile.subscriptionPlan || "free"
    const monthlyUnlocksUsed = ngoProfile.monthlyUnlocksUsed || 0
    const monthlyUnlocksLimit = ngoProfile.monthlyUnlocksLimit || 0
    const FREE_PLAN_LIMIT = 0 // Free plan = no unlocks

    // Check if we need to reset monthly counter
    const now = new Date()
    const resetDate = ngoProfile.subscriptionResetDate ? new Date(ngoProfile.subscriptionResetDate) : null
    
    let currentUnlocksUsed = monthlyUnlocksUsed
    if (resetDate && now >= resetDate) {
      // Reset the counter - it's a new month
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      await ngoProfilesDb.update(user.id, {
        monthlyUnlocksUsed: 0,
        subscriptionResetDate: nextResetDate,
      })
      currentUnlocksUsed = 0
    }

    // Check if limit reached (only for free plan)
    if (subscriptionPlan === "free" && !paymentId) {
      return { 
        success: false, 
        error: `Free plan cannot unlock profiles. Upgrade to Pro for unlimited unlocks or pay ₹499 per unlock.`,
        data: "LIMIT_REACHED" as any
      }
    }

    // Get unlock price from settings
    const settings = await adminSettingsDb.get()
    const unlockPrice = settings?.singleProfileUnlockPrice || 499

    // Atomically try to create unlock record - prevents double charging
    const unlockResult = await profileUnlocksDb.createIfNotExists({
      ngoId: user.id,
      volunteerId,
      amountPaid: paymentId ? unlockPrice : 0, // Free if using subscription
      currency: settings?.currency || "INR",
      paymentId,
      unlockedAt: new Date(),
    })

    if (!unlockResult.created) {
      // Already unlocked - return success but don't charge
      return { success: true, data: true, message: "Profile already unlocked" }
    }

    // Increment monthly unlock count
    if (subscriptionPlan === "pro" || currentUnlocksUsed < FREE_PLAN_LIMIT) {
      // Using subscription unlock
      try {
        await ngoProfilesDb.incrementMonthlyUnlocks(user.id)
      } catch (e) {
        console.error("Failed to increment unlocks:", e)
      }
    }
    
    // If paid unlock, create transaction record
    if (paymentId) {
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
          description: "Profile Unlock",
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
  if (!user) {
    console.log('[Matching] No user found')
    return []
  }

  const volunteerProfile = await volunteerProfilesDb.findByUserId(user.id)
  if (!volunteerProfile) {
    console.log('[Matching] No volunteer profile found for user:', user.id)
    return []
  }

  const projects = await projectsDb.findActive()
  console.log('[Matching] Found', projects.length, 'active projects')
  
  if (projects.length === 0) {
    console.log('[Matching] No active projects available')
    return []
  }

  const matches = matchOpportunitiesToVolunteer(volunteerProfile, projects)
  console.log('[Matching] Generated', matches.length, 'matches')

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
  const notifications = await notificationsDb.findByUserId(user.id)
  return serializeDocuments(notifications)
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
  let settings = await adminSettingsDb.get()
  
  // Auto-initialize settings if they don't exist
  if (!settings) {
    await adminSettingsDb.initialize(user.id)
    settings = await adminSettingsDb.get()
  }
  
  return settings
}

// Public settings getter - no auth required
export async function getPublicSettings(): Promise<Partial<AdminSettings> | null> {
  let settings = await adminSettingsDb.get()
  
  if (!settings) {
    return {
      platformName: "JustBecause.Asia",
      platformDescription: "Connecting NGOs with skilled volunteers",
      supportEmail: "support@justbecause.asia",
      currency: "INR",
      singleProfileUnlockPrice: 499,
      volunteerFreeApplicationsPerMonth: 3,
      volunteerProPrice: 999,
      ngoFreeProjectsPerMonth: 3,
      ngoFreeProfileUnlocksPerMonth: 0,
      ngoProPrice: 2999,
      enablePayments: true,
      enableMessaging: true,
    }
  }
  
  // Return only public settings
  return {
    platformName: settings.platformName,
    platformDescription: settings.platformDescription,
    supportEmail: settings.supportEmail,
    platformLogo: settings.platformLogo,
    currency: settings.currency,
    singleProfileUnlockPrice: settings.singleProfileUnlockPrice,
    volunteerFreeApplicationsPerMonth: settings.volunteerFreeApplicationsPerMonth,
    volunteerProPrice: settings.volunteerProPrice,
    volunteerProFeatures: settings.volunteerProFeatures,
    ngoFreeProjectsPerMonth: settings.ngoFreeProjectsPerMonth,
    ngoFreeProfileUnlocksPerMonth: settings.ngoFreeProfileUnlocksPerMonth,
    ngoProPrice: settings.ngoProPrice,
    ngoProFeatures: settings.ngoProFeatures,
    enablePayments: settings.enablePayments,
    enableMessaging: settings.enableMessaging,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    socialLinks: settings.socialLinks,
  }
}

export async function updateAdminSettings(
  settings: Partial<AdminSettings>
): Promise<ApiResponse<boolean>> {
  try {
    const user = await requireRole(["admin"])
    
    // Remove _id field if present to avoid MongoDB errors
    const { _id, ...settingsWithoutId } = settings as any
    
    const result = await adminSettingsDb.update(settingsWithoutId, user.id)
    revalidatePath("/admin/settings")
    return { success: true, data: result }
  } catch (error) {
    console.error("Update admin settings error:", error)
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

// Enhanced analytics for admin dashboard
export async function getAdminAnalytics() {
  await requireRole(["admin"])
  
  const db = await getDb()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // Get counts
  const [
    totalVolunteers,
    totalNGOs,
    totalProjects,
    totalApplications,
    activeProjects,
    completedProjects,
    pendingApplications,
    acceptedApplications,
    verifiedNGOs,
    verifiedVolunteers,
  ] = await Promise.all([
    volunteerProfilesDb.count(),
    ngoProfilesDb.count(),
    projectsDb.count(),
    applicationsDb.count({}),
    projectsDb.count({ status: "active" }),
    projectsDb.count({ status: "completed" }),
    applicationsDb.count({ status: "pending" }),
    applicationsDb.count({ status: "accepted" }),
    ngoProfilesDb.count({ isVerified: true }),
    volunteerProfilesDb.count({ isVerified: true }),
  ])
  
  // Get recent signups (last 30 days)
  const recentVolunteers = await db.collection("volunteerProfiles").countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  })
  const recentNGOs = await db.collection("ngoProfiles").countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  })
  
  // Get recent projects
  const recentProjects = await db.collection("projects").countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  })
  
  // Get recent applications
  const recentApplications = await db.collection("applications").countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  })
  
  // Revenue stats
  const totalRevenue = await transactionsDb.sumAmount({ paymentStatus: "completed" })
  const monthlyRevenue = await db.collection("transactions").aggregate([
    { $match: { paymentStatus: "completed", createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]).toArray()
  
  // Get pending verification counts
  const pendingNGOVerifications = await db.collection("ngoProfiles").countDocuments({
    isVerified: { $ne: true },
    isActive: { $ne: false }
  })
  
  // Recent activity from various collections
  const recentActivity = await Promise.all([
    db.collection("volunteerProfiles")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ name: 1, createdAt: 1 })
      .toArray()
      .then(docs => docs.map(d => ({ 
        type: "volunteer_signup" as const, 
        text: `New volunteer: ${d.name || "Anonymous"}`,
        createdAt: d.createdAt 
      }))),
    db.collection("ngoProfiles")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ organizationName: 1, orgName: 1, createdAt: 1 })
      .toArray()
      .then(docs => docs.map(d => ({ 
        type: "ngo_signup" as const,
        text: `New NGO: ${d.organizationName || d.orgName || "Organization"}`,
        createdAt: d.createdAt 
      }))),
    db.collection("projects")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ title: 1, createdAt: 1 })
      .toArray()
      .then(docs => docs.map(d => ({ 
        type: "project_created" as const,
        text: `New project: ${d.title}`,
        createdAt: d.createdAt 
      }))),
    db.collection("applications")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ createdAt: 1 })
      .toArray()
      .then(docs => docs.map(d => ({ 
        type: "application" as const,
        text: "New application submitted",
        createdAt: d.createdAt 
      }))),
    db.collection("transactions")
      .find({ paymentStatus: "completed" })
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ amount: 1, createdAt: 1 })
      .toArray()
      .then(docs => docs.map(d => ({ 
        type: "payment" as const,
        text: `Payment received: ₹${d.amount}`,
        createdAt: d.createdAt 
      }))),
  ])
  
  // Merge and sort recent activity
  const allActivity = recentActivity
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(a => ({
      ...a,
      timeAgo: getTimeAgo(a.createdAt)
    }))
  
  // Top skills in demand (from projects)
  const skillsInDemand = await db.collection("projects").aggregate([
    { $match: { status: "active" } },
    { $unwind: "$requiredSkills" },
    { $group: { _id: "$requiredSkills", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]).toArray()
  
  // Top causes
  const topCauses = await db.collection("projects").aggregate([
    { $match: { status: "active" } },
    { $unwind: "$causes" },
    { $group: { _id: "$causes", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]).toArray()
  
  return {
    // Overview stats
    totalVolunteers,
    totalNGOs,
    totalProjects,
    totalApplications,
    totalRevenue,
    monthlyRevenue: monthlyRevenue[0]?.total || 0,
    
    // Project stats
    activeProjects,
    completedProjects,
    recentProjects,
    
    // Application stats
    pendingApplications,
    acceptedApplications,
    recentApplications,
    applicationRate: totalProjects > 0 ? Math.round((totalApplications / totalProjects) * 100) / 100 : 0,
    
    // User stats
    verifiedNGOs,
    verifiedVolunteers,
    recentVolunteers,
    recentNGOs,
    
    // Action items
    pendingNGOVerifications,
    
    // Activity feed
    recentActivity: allActivity,
    
    // Insights
    skillsInDemand: skillsInDemand.map(s => ({ skill: s._id, count: s.count })),
    topCauses: topCauses.map(c => ({ cause: c._id, count: c.count })),
    
    // Conversion metrics
    ngoVerificationRate: totalNGOs > 0 ? Math.round((verifiedNGOs / totalNGOs) * 100) : 0,
    projectSuccessRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
    applicationAcceptRate: totalApplications > 0 ? Math.round((acceptedApplications / totalApplications) * 100) : 0,
  }
}

// Helper for time ago
function getTimeAgo(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  return past.toLocaleDateString()
}

// Admin user role change
export async function adminChangeUserRole(
  userId: string,
  newRole: "volunteer" | "ngo" | "admin"
): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    
    const db = await getDb()
    
    // Update user role in auth system
    const result = await db.collection("user").updateOne(
      { id: userId },
      { $set: { role: newRole, updatedAt: new Date() } }
    )
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "User not found" }
    }
    
    revalidatePath("/admin/users")
    return { success: true, data: true }
  } catch (error) {
    console.error("Admin change role error:", error)
    return { success: false, error: "Failed to change user role" }
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
    console.log(`[verifyNGO] Updating NGO ${userId} to isVerified=${isVerified}`)
    const result = await ngoProfilesDb.update(userId, { isVerified })
    console.log(`[verifyNGO] Update result:`, result)
    revalidatePath("/admin/ngos")
    revalidatePath("/admin/users")
    return { success: true, data: result }
  } catch (error) {
    console.error("[verifyNGO] Error:", error)
    return { success: false, error: "Failed to update verification status" }
  }
}

export async function verifyVolunteer(userId: string, isVerified: boolean): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    console.log(`[verifyVolunteer] Updating volunteer ${userId} to isVerified=${isVerified}`)
    const result = await volunteerProfilesDb.update(userId, { isVerified })
    console.log(`[verifyVolunteer] Update result:`, result)
    revalidatePath("/admin/volunteers")
    revalidatePath("/admin/users")
    return { success: true, data: result }
  } catch (error) {
    console.error("[verifyVolunteer] Error:", error)
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
// BAN/UNBAN USER ACTIONS
// ============================================

export async function banUser(
  userId: string,
  userType: "volunteer" | "ngo",
  reason: string
): Promise<ApiResponse<boolean>> {
  try {
    const adminUser = await requireRole(["admin"])
    
    // Suspend the user first
    if (userType === "volunteer") {
      await volunteerProfilesDb.update(userId, { isActive: false, isBanned: true })
    } else {
      await ngoProfilesDb.update(userId, { isActive: false, isBanned: true })
    }
    
    // Create ban record
    await banRecordsDb.create({
      userId,
      userType,
      reason,
      bannedBy: adminUser.id,
      bannedAt: new Date(),
      isActive: true,
    })
    
    revalidatePath("/admin/users")
    revalidatePath("/admin/volunteers")
    revalidatePath("/admin/ngos")
    
    return { success: true, data: true }
  } catch (error) {
    console.error("Ban user error:", error)
    return { success: false, error: "Failed to ban user" }
  }
}

export async function unbanUser(
  userId: string,
  userType: "volunteer" | "ngo"
): Promise<ApiResponse<boolean>> {
  try {
    const adminUser = await requireRole(["admin"])
    
    // Reactivate the user
    if (userType === "volunteer") {
      await volunteerProfilesDb.update(userId, { isActive: true, isBanned: false })
    } else {
      await ngoProfilesDb.update(userId, { isActive: true, isBanned: false })
    }
    
    // Deactivate ban record
    await banRecordsDb.deactivate(userId, adminUser.id)
    
    revalidatePath("/admin/users")
    revalidatePath("/admin/volunteers")
    revalidatePath("/admin/ngos")
    
    return { success: true, data: true }
  } catch (error) {
    console.error("Unban user error:", error)
    return { success: false, error: "Failed to unban user" }
  }
}

export async function getBanRecords(): Promise<ApiResponse<BanRecord[]>> {
  try {
    await requireRole(["admin"])
    const records = await banRecordsDb.findAll()
    return { success: true, data: records }
  } catch (error) {
    console.error("Get ban records error:", error)
    return { success: false, error: "Failed to get ban records" }
  }
}

export async function getUserBanHistory(userId: string): Promise<ApiResponse<BanRecord[]>> {
  try {
    await requireRole(["admin"])
    const records = await banRecordsDb.findByUserId(userId)
    return { success: true, data: records }
  } catch (error) {
    console.error("Get user ban history error:", error)
    return { success: false, error: "Failed to get user ban history" }
  }
}

// ============================================
// TEAM MEMBER ACTIONS (Admin)
// ============================================

export async function createTeamMember(
  member: Omit<TeamMember, "_id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<string>> {
  try {
    await requireRole(["admin"])
    const id = await teamMembersDb.create(member as TeamMember)
    revalidatePath("/admin/team")
    revalidatePath("/about")
    return { success: true, data: id }
  } catch (error) {
    console.error("Create team member error:", error)
    return { success: false, error: "Failed to create team member" }
  }
}

export async function updateTeamMember(
  id: string,
  updates: Partial<TeamMember>
): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    const result = await teamMembersDb.update(id, updates)
    revalidatePath("/admin/team")
    revalidatePath("/about")
    return { success: true, data: result }
  } catch (error) {
    console.error("Update team member error:", error)
    return { success: false, error: "Failed to update team member" }
  }
}

export async function deleteTeamMember(id: string): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    const result = await teamMembersDb.delete(id)
    revalidatePath("/admin/team")
    revalidatePath("/about")
    return { success: true, data: result }
  } catch (error) {
    console.error("Delete team member error:", error)
    return { success: false, error: "Failed to delete team member" }
  }
}

export async function getTeamMembers(): Promise<ApiResponse<TeamMember[]>> {
  try {
    const members = await teamMembersDb.findAll()
    return { success: true, data: members }
  } catch (error) {
    console.error("Get team members error:", error)
    return { success: false, error: "Failed to get team members" }
  }
}

export async function getActiveTeamMembers(): Promise<ApiResponse<TeamMember[]>> {
  try {
    const members = await teamMembersDb.findActive()
    return { success: true, data: members }
  } catch (error) {
    console.error("Get active team members error:", error)
    return { success: false, error: "Failed to get active team members" }
  }
}

export async function reorderTeamMembers(orderedIds: string[]): Promise<ApiResponse<boolean>> {
  try {
    await requireRole(["admin"])
    const result = await teamMembersDb.reorder(orderedIds)
    revalidatePath("/admin/team")
    revalidatePath("/about")
    return { success: true, data: result }
  } catch (error) {
    console.error("Reorder team members error:", error)
    return { success: false, error: "Failed to reorder team members" }
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
  console.log('[browseVolunteers] Fetching volunteers with filters:', filters)
  
  // Get all volunteers (arrays are now parsed by database helpers)
  const volunteers = await volunteerProfilesDb.findMany({}, { limit: 100 } as any)
  console.log(`[browseVolunteers] Found ${volunteers.length} total volunteers`)
  
  // Filter in JavaScript since arrays are stored as JSON strings
  let filteredVolunteers = volunteers.filter(v => {
    // Skip if explicitly inactive
    if (v.isActive === false) return false
    
    // Apply filters
    if (filters?.skills?.length) {
      const volunteerSkills = Array.isArray(v.skills) ? v.skills : []
      const hasSkill = volunteerSkills.some((skill: any) => 
        filters.skills!.includes(skill?.subskillId || skill)
      )
      if (!hasSkill) return false
    }
    
    if (filters?.causes?.length) {
      const volunteerCauses = Array.isArray(v.causes) ? v.causes : []
      const hasCause = volunteerCauses.some((cause: string) => 
        filters.causes!.includes(cause)
      )
      if (!hasCause) return false
    }
    
    if (filters?.workMode && v.availability !== filters.workMode) {
      return false
    }
    
    if (filters?.volunteerType && v.volunteerType !== filters.volunteerType) {
      return false
    }
    
    if (filters?.location && v.location && !v.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false
    }
    
    return true
  })
  
  // Limit results
  filteredVolunteers = filteredVolunteers.slice(0, 50)
  
  // Convert to profile views for proper visibility
  const views = await Promise.all(
    filteredVolunteers.map((v) => getVolunteerProfileView(v.userId))
  )
  
  return views.filter((v) => v !== null)
}

export async function browseProjects(filters?: {
  skills?: string[]
  causes?: string[]
  workMode?: string
  projectType?: string
}) {
  // Get active projects from database
  const allProjects = await projectsDb.findActive({}, { limit: 100 })
  
  // Filter in JavaScript since some filtering might be needed
  let filteredProjects = allProjects.filter(p => {
    if (filters?.skills?.length) {
      const projectSkills = p.skillsRequired?.map((s: any) => s.subskillId || s.skillId) || []
      const hasSkill = projectSkills.some((skill: string) => filters.skills!.includes(skill))
      if (!hasSkill) return false
    }
    
    if (filters?.causes?.length) {
      const hasCause = p.causes?.some((cause: string) => filters.causes!.includes(cause))
      if (!hasCause) return false
    }
    
    if (filters?.workMode && p.workMode !== filters.workMode) {
      return false
    }
    
    if (filters?.projectType && p.projectType !== filters.projectType) {
      return false
    }
    
    return true
  })
  
  // Limit results
  filteredProjects = filteredProjects.slice(0, 50)
  
  return serializeDocuments(filteredProjects)
}

// Get skill category project counts for home page
export async function getSkillCategoryCounts() {
  const db = await getDb()
  
  // Define skill categories with their IDs and icons
  const categories = [
    { id: "digital-marketing", name: "Digital Marketing", icon: "Megaphone" },
    { id: "fundraising", name: "Fundraising Assistance", icon: "Heart" },
    { id: "website", name: "Website Design & Maintenance", icon: "Code" },
    { id: "finance", name: "Finance & Accounting", icon: "Calculator" },
    { id: "content-creation", name: "Content Creation", icon: "Palette" },
    { id: "communication", name: "Communication", icon: "Target" },
    { id: "planning-support", name: "Planning & Support", icon: "Users" },
  ]
  
  // Get all active projects
  const activeProjects = await db.collection("projects").find({
    status: { $in: ["active", "open", "published"] }
  }).toArray()
  
  // Count projects per category
  const categoryCounts = categories.map(category => {
    const count = activeProjects.filter(project => {
      const skills = project.skillsRequired || []
      return skills.some((skill: any) => skill.categoryId === category.id)
    }).length
    
    return {
      ...category,
      count
    }
  })
  
  return categoryCounts
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

  const ngos = await ngoProfilesDb.findMany(query, { limit: 50 } as any)
  return serializeDocuments(ngos)
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

export async function getMyConversations() {
  const user = await getCurrentUser()
  if (!user) return []
  
  const conversations = await conversationsDb.findByUserId(user.id)
  
  // Get all other participant IDs
  const otherParticipantIds = conversations
    .map(conv => conv.participants.find((p: string) => p !== user.id))
    .filter(Boolean) as string[]
  
  // Batch fetch all user info using centralized utility
  const usersInfoMap = await getUsersInfo(otherParticipantIds)
  
  // Enrich conversations with participant details
  const enrichedConversations = conversations.map((conv) => {
    const otherParticipantId = conv.participants.find((p: string) => p !== user.id)
    if (!otherParticipantId) return conv
    
    const otherUser = usersInfoMap.get(otherParticipantId)
    
    if (otherUser?.type === "ngo") {
      return {
        ...conv,
        ngoName: otherUser.name,
        ngoLogo: otherUser.image,
        otherParticipantType: "ngo",
        otherParticipantId,
      }
    }
    
    return {
      ...conv,
      volunteerName: otherUser?.name || "Volunteer",
      volunteerAvatar: otherUser?.image,
      otherParticipantType: "volunteer",
      otherParticipantId,
    }
  })
  
  // Count unread messages for each conversation
  const db = await getDb()
  const messagesCollection = db.collection("messages")
  
  const conversationsWithUnread = await Promise.all(
    enrichedConversations.map(async (conv) => {
      const unreadCount = await messagesCollection.countDocuments({
        conversationId: conv._id?.toString(),
        receiverId: user.id,
        isRead: false,
      })
      return { ...conv, unreadCount }
    })
  )
  
  return serializeDocuments(conversationsWithUnread)
}

export async function getConversation(conversationId: string) {
  const user = await getCurrentUser()
  if (!user) return null
  
  const conversations = await conversationsDb.findByUserId(user.id)
  const conversation = conversations.find(c => c._id?.toString() === conversationId) || null
  return serializeDocument(conversation)
}

export async function getConversationMessages(conversationId: string, limit = 50) {
  const user = await getCurrentUser()
  if (!user) {
    console.log(`[getConversationMessages] No user found`)
    return []
  }
  
  console.log(`[getConversationMessages] User: ${user.id}, ConversationId: ${conversationId}`)
  
  // Verify user is part of conversation
  const conversations = await conversationsDb.findByUserId(user.id)
  console.log(`[getConversationMessages] Found ${conversations.length} conversations for user`)
  
  const conversation = conversations.find(c => c._id?.toString() === conversationId)
  if (!conversation) {
    console.log(`[getConversationMessages] Conversation not found or user not a participant`)
    return []
  }
  
  console.log(`[getConversationMessages] Conversation found with participants: ${conversation.participants.join(', ')}`)
  
  // Mark messages as read
  await messagesDb.markAsRead(conversationId, user.id)
  
  const messages = await messagesDb.findByConversationId(conversationId, limit)
  console.log(`[getConversationMessages] Found ${messages.length} messages`)
  
  return serializeDocuments(messages)
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
    
    console.log(`[sendMessage] From: ${user.id}, To: ${receiverId}, Content: ${content.substring(0, 30)}...`)
    
    // Find or create conversation
    const conversation = await conversationsDb.findOrCreate([user.id, receiverId], projectId)
    console.log(`[sendMessage] Conversation ID: ${conversation._id?.toString()}, Participants: ${conversation.participants.join(', ')}`)
    
    // Create message
    const messageId = await messagesDb.create({
      conversationId: conversation._id!.toString(),
      senderId: user.id,
      receiverId,
      content: content.trim(),
      isRead: false,
      createdAt: new Date(),
    })
    console.log(`[sendMessage] Message created: ${messageId}`)
    
    // Update conversation last message
    await conversationsDb.updateLastMessage(
      conversation._id!.toString(),
      content.length > 50 ? content.substring(0, 50) + "..." : content
    )
    console.log(`[sendMessage] Conversation updated with last message`)
    
    // Get sender and receiver info using centralized utility
    const [senderInfo, receiverInfo] = await Promise.all([
      getUserInfo(user.id),
      getUserInfo(receiverId),
    ])
    
    const senderName = senderInfo?.name || "Someone"
    const conversationIdStr = conversation._id!.toString()
    const messageLink = receiverInfo?.type === "ngo"
      ? `/ngo/messages/${conversationIdStr}`
      : `/volunteer/messages/${conversationIdStr}`
    
    // Create notification for receiver with link
    try {
      await notificationsDb.create({
        userId: receiverId,
        type: "new_message",
        title: "New Message",
        message: `${senderName} sent you a message`,
        referenceId: conversationIdStr,
        referenceType: "conversation",
        link: messageLink,
        isRead: false,
        createdAt: new Date(),
      })
    } catch (e) {
      console.error("Failed to create notification:", e)
    }
    
    // Revalidate message pages for both sender and receiver
    revalidatePath("/volunteer/messages")
    revalidatePath("/ngo/messages")
    revalidatePath(`/volunteer/messages/${conversationIdStr}`)
    revalidatePath(`/ngo/messages/${conversationIdStr}`)
    console.log(`[sendMessage] Revalidated paths for conversation ${conversationIdStr}`)
    
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
  
  const notifications = await notificationsDb.findByUserId(user.id)
  return serializeDocuments(notifications)
}

// ============================================
// PROFILE UNLOCKS & TRANSACTIONS
// ============================================

export async function getUnlockedProfiles() {
  const user = await getCurrentUser()
  if (!user) return []
  
  const unlocks = await profileUnlocksDb.findByNgoId(user.id)
  return serializeDocuments(unlocks)
}

export async function getMyTransactions() {
  const user = await getCurrentUser()
  if (!user) return []
  
  const transactions = await transactionsDb.findByUserId(user.id)
  return serializeDocuments(transactions)
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

    // Validate new password
    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" }
    }

    // Use Better Auth's change password API
    try {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: await headers(),
      })
      return { success: true, data: true }
    } catch (authError: any) {
      // Handle specific error cases
      if (authError.message?.includes("incorrect")) {
        return { success: false, error: "Current password is incorrect" }
      }
      if (authError.message?.includes("OAuth")) {
        return { 
          success: false, 
          error: "Password change is only available for email/password accounts. OAuth users should manage passwords through their provider." 
        }
      }
      throw authError
    }
  } catch (error) {
    console.error("Change password error:", error)
    return { success: false, error: "Failed to change password. Please try again.May be due to you having created account via social login" }
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
// IMPACT METRICS
// ============================================

export async function getImpactMetrics() {
  try {
    const [volunteerCount, projectCount, ngoCount] = await Promise.all([
      volunteerProfilesDb.count({}),
      projectsDb.count({ status: "completed" }),
      ngoProfilesDb.count({}),
    ])

    // Calculate total hours from completed projects
    const completedProjects = await projectsDb.findMany({ status: "completed" })
    const totalHours = completedProjects.reduce((sum, p) => {
      // Parse timeCommitment like "10-15 hours" or "5 hours/week"
      const match = p.timeCommitment?.match(/(\d+)/)
      return sum + (match ? parseInt(match[1]) : 0)
    }, 0)

    // Estimated value at $50/hour for pro-bono work
    const estimatedValue = totalHours * 50

    return {
      volunteers: volunteerCount || 0,
      projectsCompleted: projectCount || 0,
      ngosSupported: ngoCount || 0,
      hoursContributed: totalHours || 0,
      valueGenerated: estimatedValue || 0,
    }
  } catch (error) {
    console.error("Failed to get impact metrics:", error)
    return {
      volunteers: 0,
      projectsCompleted: 0,
      ngosSupported: 0,
      hoursContributed: 0,
      valueGenerated: 0,
    }
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
