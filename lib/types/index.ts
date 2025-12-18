// ============================================
// JustBecause.Asia - Type Definitions
// ============================================

import { ObjectId } from "mongodb"

// ============================================
// USER ROLES
// ============================================
export type UserRole = "volunteer" | "ngo" | "admin"

export type VolunteerType = "free" | "paid" | "both"
export type WorkMode = "remote" | "onsite" | "hybrid"
export type Availability = "weekdays" | "weekends" | "evenings" | "flexible"
export type ExperienceLevel = "beginner" | "intermediate" | "expert"
export type SkillPriority = "must-have" | "nice-to-have"

// ============================================
// BASE USER (from Better Auth)
// ============================================
export interface User {
  id: string
  email: string
  name: string
  image?: string
  role: UserRole
  isOnboarded: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// VOLUNTEER PROFILE
// ============================================
export interface VolunteerSkill {
  categoryId: string
  subskillId: string
  level: ExperienceLevel
}

export interface VolunteerProfile {
  interests: any
  languages: any
  _id?: ObjectId
  userId: string // Reference to User
  
  // Display name and avatar copied from auth user
  name?: string
  avatar?: string
  
  // Basic Info
  phone: string
  location: string
  city: string
  country: string
  bio: string
  linkedinUrl?: string
  portfolioUrl?: string
  resumeUrl?: string
  
  // Exact coordinates (from geolocation)
  coordinates?: {
    lat: number
    lng: number
  }
  
  // Skills
  skills: VolunteerSkill[]
  
  // Causes they care about
  causes: string[]
  
  // Work Preferences
  volunteerType: VolunteerType // "free" | "paid" | "both"
  hourlyRate?: number // Only if paid
  currency?: string
  workMode: WorkMode
  hoursPerWeek: string
  availability: Availability
  
  // Stats
  completedProjects: number
  hoursContributed: number
  rating: number
  totalRatings: number
  
  // Saved/Bookmarked Projects
  savedProjects?: string[] // Array of project IDs
  
  // Subscription (for application limits)
  subscriptionPlan: "free" | "pro"
  subscriptionExpiry?: Date
  monthlyApplicationsUsed: number
  subscriptionResetDate?: Date // When to reset monthly counters

  // Verification
  isVerified: boolean
  isActive: boolean
  isBanned?: boolean
  
  // Privacy Settings
  privacy?: {
    showProfile: boolean // Visible to NGOs
    showInSearch: boolean // Show in volunteer search results
    emailNotifications: boolean
    applicationNotifications: boolean
    messageNotifications: boolean
    opportunityDigest: boolean
  }
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// ============================================
// NGO PROFILE
// ============================================
export interface RequiredSkill {
  categoryId: string
  subskillId: string
  priority: SkillPriority
}

export interface NGOProfile {
  _id?: ObjectId
  userId: string // Reference to User
  
  // Organization Details
  orgName: string
  organizationName?: string // Alias for orgName
  contactEmail?: string
  contactPersonName?: string
  contactPhone?: string
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
  logo?: string
  
  // Social Links
  socialLinks?: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
  }
  
  // Causes & Focus
  causes: string[]
  
  // Skills they typically need
  typicalSkillsNeeded: RequiredSkill[]
  
  // Work Preferences
  acceptRemoteVolunteers: boolean
  acceptOnsiteVolunteers: boolean
  
  // Stats
  projectsPosted: number
  projectsCompleted: number
  volunteersEngaged: number
  
  // Verification
  isVerified: boolean
  isActive: boolean
  isBanned?: boolean
  
  // Subscription (simplified to 2 plans)
  subscriptionPlan: "free" | "pro"
  subscriptionExpiry?: Date
  monthlyUnlocksUsed: number
  monthlyUnlocksLimit: number // 5 for free, unlimited for pro
  monthlyProjectsPosted: number // Track projects posted this month for free plan limit
  subscriptionResetDate?: Date // When to reset monthly counters
  
  // Legacy field - keeping for backwards compatibility
  subscriptionTier?: "free" | "basic" | "premium" | "enterprise"
  profileUnlocksRemaining?: number
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// ============================================
// PROJECT / OPPORTUNITY
// ============================================
export type ProjectStatus = "draft" | "active" | "open" | "paused" | "completed" | "closed" | "cancelled"
export type ProjectType = "short-term" | "long-term" | "consultation" | "ongoing"

export interface Project {
  _id?: ObjectId
  ngoId: string // Reference to NGO User
  ngoProfileId: string // Reference to NGOProfile
  
  // Basic Info
  title: string
  description: string
  
  // Requirements
  skillsRequired: RequiredSkill[]
  experienceLevel: ExperienceLevel
  
  // Time & Location
  timeCommitment: string // e.g., "10-15 hours"
  duration: string // e.g., "2 weeks", "3 months"
  projectType: ProjectType
  workMode: WorkMode
  location?: string // If onsite
  
  // Causes
  causes: string[]
  
  // Documents
  documents?: Array<{
    name: string
    url: string
    type: string
  }>
  
  // Dates
  startDate?: Date
  deadline?: Date
  
  // Status
  status: ProjectStatus
  
  // Stats
  applicantsCount: number
  viewsCount: number
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// ============================================
// APPLICATION
// ============================================
export type ApplicationStatus = "pending" | "shortlisted" | "accepted" | "rejected" | "withdrawn"

export interface Application {
  _id?: ObjectId
  projectId: string
  volunteerId: string // User ID
  volunteerProfileId: string // VolunteerProfile ID
  ngoId: string // NGO User ID
  
  // Application Details
  coverMessage?: string
  
  // Status
  status: ApplicationStatus
  
  // NGO Actions
  isProfileUnlocked: boolean // Has NGO paid to unlock (for free volunteers)
  ngoNotes?: string
  
  // Timestamps
  appliedAt: Date
  createdAt: Date
  reviewedAt?: Date
  updatedAt: Date
}

// ============================================
// PROFILE UNLOCK (for free volunteers)
// ============================================
export interface ProfileUnlock {
  _id?: ObjectId
  ngoId: string // NGO who paid
  volunteerId: string // Volunteer whose profile was unlocked
  
  // Payment Details
  amountPaid: number
  currency: string
  paymentId?: string // External payment reference
  paymentMethod?: string
  
  // Timestamps
  unlockedAt: Date
  expiresAt?: Date // Optional expiry
}

// ============================================
// SUBSCRIPTION PLAN
// ============================================
export interface SubscriptionPlan {
  _id?: ObjectId
  name: string
  tier: "free" | "basic" | "premium" | "enterprise"
  
  // Pricing
  priceMonthly: number
  priceYearly: number
  currency: string
  
  // Features
  profileUnlocksPerMonth: number // -1 for unlimited
  projectsPerMonth: number // -1 for unlimited
  featuredListings: boolean
  prioritySupport: boolean
  analytics: boolean
  
  // Status
  isActive: boolean
  
  createdAt: Date
  updatedAt: Date
}

// ============================================
// PAYMENT / TRANSACTION
// ============================================
export type TransactionType = "profile_unlock" | "subscription" | "refund"
export type TransactionStatus = "pending" | "completed" | "failed" | "refunded"

export interface Transaction {
  _id?: ObjectId
  userId: string // Who paid
  type: TransactionType
  description?: string // Human readable description
  status: TransactionStatus // Overall transaction status
  
  // Reference
  referenceId?: string // ProfileUnlock ID or Subscription ID
  referenceType?: string
  
  // Amount
  amount: number
  currency: string
  
  // Payment Gateway
  paymentGateway: string // "razorpay" | "stripe"
  paymentId?: string
  paymentStatus: TransactionStatus
  
  // Timestamps
  createdAt: Date
  completedAt?: Date
}

// ============================================
// MESSAGE
// ============================================
export interface Message {
  _id?: ObjectId
  conversationId: string
  senderId: string
  receiverId: string
  
  content: string
  
  isRead: boolean
  readAt?: Date
  
  createdAt: Date
}

export interface Conversation {
  _id?: ObjectId
  participants: string[] // User IDs
  projectId?: string // Optional - if related to a project
  
  lastMessage?: string
  lastMessageAt?: Date
  
  // For NGO - is this volunteer profile unlocked?
  isUnlocked: boolean
  
  createdAt: Date
  updatedAt: Date
}

// ============================================
// NOTIFICATION
// ============================================
export type NotificationType = 
  | "new_application"
  | "application_accepted"
  | "application_rejected"
  | "new_message"
  | "profile_viewed"
  | "profile_unlocked"
  | "project_match"
  | "system"

export interface Notification {
  _id?: ObjectId
  userId: string
  type: NotificationType
  
  title: string
  message: string
  
  // Reference
  referenceId?: string
  referenceType?: string // "project" | "application" | "message"
  link?: string // URL to navigate to when notification is clicked
  
  isRead: boolean
  readAt?: Date
  
  createdAt: Date
}

// ============================================
// ADMIN SETTINGS
// ============================================

// Supported currencies for Razorpay
export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP" | "SGD" | "AED" | "MYR"

export interface SubscriptionPlanConfig {
  // Volunteer Free Plan
  volunteerFreeApplicationsPerMonth: number
  volunteerFreeProfileVisibility: boolean
  
  // Volunteer Pro Plan
  volunteerProPrice: number
  volunteerProFeatures: string[]
  
  // NGO Free Plan
  ngoFreeProjectsPerMonth: number
  ngoFreeProfileUnlocksPerMonth: number
  
  // NGO Pro Plan
  ngoProPrice: number
  ngoProFeatures: string[]
}

export interface AdminSettings {
  _id?: ObjectId
  
  // Platform Settings
  platformName: string
  platformDescription: string
  supportEmail: string
  platformLogo?: string
  platformFavicon?: string
  
  // Payment Settings
  singleProfileUnlockPrice: number
  currency: SupportedCurrency
  razorpayKeyId?: string // Public key (safe to expose)
  
  // Subscription Plan Settings - Volunteer
  volunteerFreeApplicationsPerMonth: number
  volunteerFreeProfileVisibility: boolean
  volunteerProPrice: number
  volunteerProApplicationsUnlimited: boolean
  volunteerProFeatures: string[]
  
  // Subscription Plan Settings - NGO
  ngoFreeProjectsPerMonth: number
  ngoFreeProfileUnlocksPerMonth: number
  ngoProPrice: number
  ngoProProjectsUnlimited: boolean
  ngoProUnlocksUnlimited: boolean
  ngoProFeatures: string[]
  
  // Features Toggle
  enablePayments: boolean
  enableMessaging: boolean
  enableNotifications: boolean
  requireEmailVerification: boolean
  requireNGOVerification: boolean
  
  // Content
  maintenanceMode: boolean
  maintenanceMessage?: string
  
  // SEO
  metaTitle: string
  metaDescription: string
  
  // Social Links
  socialLinks?: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
    youtube?: string
  }
  
  updatedAt: Date
  updatedBy: string
}

// ============================================
// TEAM MEMBERS (for About page)
// ============================================
export interface TeamMember {
  _id?: ObjectId
  name: string
  role: string
  bio: string
  avatar?: string
  linkedinUrl?: string
  twitterUrl?: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// BAN RECORDS
// ============================================
export interface BanRecord {
  _id?: ObjectId
  userId: string
  userType: "volunteer" | "ngo"
  reason: string
  bannedBy: string
  bannedAt: Date
  unbannedAt?: Date
  unbannedBy?: string
  isActive: boolean
}

// ============================================
// MATCHING ALGORITHM TYPES
// ============================================
export interface MatchScore {
  volunteerId: string
  volunteerProfile: VolunteerProfile
  score: number
  breakdown: {
    skillMatch: number
    locationMatch: number
    hoursMatch: number
    causeMatch: number
    experienceMatch: number
  }
}

export interface OpportunityMatchScore {
  projectId: string
  project: Project
  score: number
  breakdown: {
    skillMatch: number
    workModeMatch: number
    hoursMatch: number
    causeMatch: number
  }
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================
// PROFILE VIEW (with visibility rules)
// ============================================
export interface VolunteerProfileView {
  // Always visible
  id: string
  location: string
  skills: VolunteerSkill[]
  causes: string[]
  workMode: WorkMode
  hoursPerWeek: string
  volunteerType: VolunteerType
  completedProjects: number
  hoursContributed: number
  rating: number
  isVerified: boolean
  
  // Visible for PAID volunteers OR if NGO has unlocked
  name?: string | null // null = blurred
  avatar?: string | null
  bio?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  portfolioUrl?: string | null
  resumeUrl?: string | null
  hourlyRate?: number | null
  
  // Meta
  isUnlocked: boolean
  canMessage: boolean
}
