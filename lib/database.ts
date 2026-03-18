// ============================================
// MongoDB Database Operations
// ============================================

import { ObjectId, Collection, Db, Filter, FindOptions, UpdateFilter } from "mongodb"
import client from "./db"
import type {
  VolunteerProfile,
  NGOProfile,
  Project,
  Application,
  ProfileUnlock,
  Transaction,
  Message,
  Conversation,
  Notification,
  AdminSettings,
  SubscriptionPlan,
  TeamMember,
  BanRecord,
  Follow,
  FollowStats,
  Review,
  Endorsement,
  Badge,
  UserBadge,
  Referral,
  BlogPost,
  CouponCode,
  CouponUsage,
} from "./types"

// ============================================
// DATABASE CONNECTION
// ============================================
const DB_NAME = "justbecause"

export async function getDb(): Promise<Db> {
  await client.connect()
  return client.db(DB_NAME)
}

// ============================================
// COLLECTION HELPERS
// ============================================
async function getCollection<T extends object>(name: string): Promise<Collection<T>> {
  const db = await getDb()
  return db.collection<T>(name)
}

// Collection names as constants
export const COLLECTIONS = {
  VOLUNTEER_PROFILES: "volunteerProfiles",
  NGO_PROFILES: "ngoProfiles",
  PROJECTS: "projects",
  APPLICATIONS: "applications",
  PROFILE_UNLOCKS: "profileUnlocks",
  TRANSACTIONS: "transactions",
  MESSAGES: "messages",
  CONVERSATIONS: "conversations",
  NOTIFICATIONS: "notifications",
  ADMIN_SETTINGS: "adminSettings",
  SUBSCRIPTION_PLANS: "subscriptionPlans",
  PASSWORD_RESET_CODES: "passwordResetCodes",
  TEAM_MEMBERS: "teamMembers",
  BAN_RECORDS: "banRecords",
  FOLLOWS: "follows",
  REVIEWS: "reviews",
  ENDORSEMENTS: "endorsements",
  BADGES: "badges",
  USER_BADGES: "userBadges",
  REFERRALS: "referrals",
  BLOG_POSTS: "blogPosts",
  COUPONS: "coupons",
  COUPON_USAGES: "couponUsages",
  SEARCH_ANALYTICS: "searchAnalytics",
  CONTACT_INQUIRIES: "contactInquiries",
} as const

// Helper: safely parse JSON with fallback
function safeJsonParse<T>(value: any, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// Helper: build user ID query (avoids full collection scan from $expr/$toString)
export function userIdQuery(userId: string): Record<string, any> {
  try {
    return { _id: new ObjectId(userId) }
  } catch {
    // If userId is not a valid ObjectId, fall back to string id field
    return { id: userId }
  }
}

/**
 * Build a query to find multiple users by an array of IDs.
 * Handles mixed ObjectId hex strings and Better Auth string IDs.
 */
export function userIdBatchQuery(userIds: string[]): Record<string, any> {
  const objectIds: ObjectId[] = []
  const stringIds: string[] = []
  for (const uid of userIds) {
    try {
      objectIds.push(new ObjectId(uid))
    } catch {
      stringIds.push(uid)
    }
  }
  const conditions: Record<string, any>[] = []
  if (objectIds.length > 0) conditions.push({ _id: { $in: objectIds } })
  if (stringIds.length > 0) conditions.push({ id: { $in: stringIds } })
  if (conditions.length === 0) return { _id: null } // match nothing
  if (conditions.length === 1) return conditions[0]
  return { $or: conditions }
}

// ============================================
// VOLUNTEER PROFILES
// ============================================
/**
 * SIMPLIFIED: Now reads from user collection directly
 * All volunteer data is stored in the user collection
 */
export const volunteerProfilesDb = {
  async create(profile: Omit<VolunteerProfile, "_id">): Promise<string> {
    const { userId, ...data } = profile
    const collection = await getCollection<any>("user")
    
    // Convert arrays and objects to JSON strings
    const processedData: any = { ...data }
    const dataAny = data as any
    if (dataAny.skills) processedData.skills = JSON.stringify(dataAny.skills)
    if (dataAny.languages) processedData.languages = JSON.stringify(dataAny.languages)
    if (dataAny.interests) processedData.interests = JSON.stringify(dataAny.interests)
    if (dataAny.causes) processedData.causes = JSON.stringify(dataAny.causes)
    if (dataAny.coordinates) processedData.coordinates = JSON.stringify(dataAny.coordinates)
    
    await collection.updateOne(
      userIdQuery(userId),
      { $set: { ...processedData, updatedAt: new Date() } }
    )
    return userId
  },

  async findByUserId(userId: string): Promise<VolunteerProfile | null> {
    const collection = await getCollection<any>("user")
    const user = await collection.findOne(userIdQuery(userId))
    
    if (!user || user.role !== "volunteer") return null
    
    // Parse JSON strings back to arrays and objects (safe parsing)
    return {
      ...user,
      userId: user._id.toString(),
      skills: safeJsonParse(user.skills, []),
      languages: safeJsonParse(user.languages, []),
      interests: safeJsonParse(user.interests, []),
      causes: safeJsonParse(user.causes, []),
      coordinates: safeJsonParse(user.coordinates, undefined),
    } as VolunteerProfile
  },

  async findById(id: string): Promise<VolunteerProfile | null> {
    return this.findByUserId(id)
  },

  async update(userId: string, updates: Partial<VolunteerProfile>): Promise<boolean> {
    const collection = await getCollection<any>("user")
    
    // Convert arrays and objects to JSON strings
    const processedUpdates: any = { ...updates }
    const updatesAny = updates as any
    if (updatesAny.skills) processedUpdates.skills = JSON.stringify(updatesAny.skills)
    if (updatesAny.languages) processedUpdates.languages = JSON.stringify(updatesAny.languages)
    if (updatesAny.interests) processedUpdates.interests = JSON.stringify(updatesAny.interests)
    if (updatesAny.causes) processedUpdates.causes = JSON.stringify(updatesAny.causes)
    if (updatesAny.coordinates) processedUpdates.coordinates = JSON.stringify(updatesAny.coordinates)
    
    const result = await collection.updateOne(
      userIdQuery(userId),
      { $set: { ...processedUpdates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async findMany(
    filter: Filter<VolunteerProfile> = {},
    options: FindOptions = {}
  ): Promise<VolunteerProfile[]> {
    const collection = await getCollection<any>("user")
    const users = await collection.find({ role: "volunteer", ...filter }, options).toArray()
    
    // Parse JSON strings
    return users.map((u: any) => ({
      ...u,
      userId: u._id.toString(),
      skills: safeJsonParse(u.skills, []),
      languages: safeJsonParse(u.languages, []),
      interests: safeJsonParse(u.interests, []),
      causes: safeJsonParse(u.causes, []),
      coordinates: safeJsonParse(u.coordinates, undefined),
    }))
  },

  async count(filter: Filter<VolunteerProfile> = {}): Promise<number> {
    const collection = await getCollection<any>("user")
    return collection.countDocuments({ role: "volunteer", ...filter })
  },

  async delete(userId: string): Promise<boolean> {
    const collection = await getCollection<any>("user")
    const result = await collection.deleteOne(userIdQuery(userId))
    return result.deletedCount > 0
  },

  // Increment monthly application count (for free plan limits)
  async incrementApplicationCount(userId: string): Promise<boolean> {
    const collection = await getCollection<any>("user")
    const result = await collection.updateOne(
      userIdQuery(userId),
      { 
        $inc: { monthlyApplicationsUsed: 1 }, 
        $set: { updatedAt: new Date() } 
      }
    )
    return result.modifiedCount > 0
  },

  // Increment completed projects count (called when a project is marked completed)
  async incrementCompletedProjects(userId: string): Promise<boolean> {
    const collection = await getCollection<any>("user")
    const result = await collection.updateOne(
      userIdQuery(userId),
      { 
        $inc: { completedProjects: 1 }, 
        $set: { updatedAt: new Date() } 
      }
    )
    return result.modifiedCount > 0
  },
}

// ============================================
// PASSWORD RESET CODES
// ============================================
export const passwordResetDb = {
  async create(item: { email: string; code: string; resetUrl: string; expiresAt: Date }) {
    const collection = await getCollection<{ email: string; code: string; resetUrl: string; expiresAt: Date }>(COLLECTIONS.PASSWORD_RESET_CODES)
    await collection.insertOne(item)
    return true
  },

  async findValid(email: string, code: string) {
    const collection = await getCollection<{ email: string; code: string; resetUrl: string; expiresAt: Date }>(COLLECTIONS.PASSWORD_RESET_CODES)
    const doc = await collection.findOne({ email, code })
    if (!doc) return null
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) return null
    return doc
  },

  async consume(email: string, code: string) {
    const collection = await getCollection<{ email: string; code: string; resetUrl: string; expiresAt: Date }>(COLLECTIONS.PASSWORD_RESET_CODES)
    const result = await collection.findOneAndDelete({ email, code })
    return (result as any)?.value || null
  },
}

// ============================================
// NGO PROFILES
// ============================================
/**
 * SIMPLIFIED: Now reads from user collection directly
 * All NGO data is stored in the user collection
 */
export const ngoProfilesDb = {
  async create(profile: Omit<NGOProfile, "_id">): Promise<string> {
    const { userId, ...data } = profile
    const collection = await getCollection<any>("user")
    
    // Convert arrays to JSON strings
    const processedData: any = { ...data }
    if (data.causes) processedData.causes = JSON.stringify(data.causes)
    
    await collection.updateOne(
      userIdQuery(userId),
      { $set: { ...processedData, updatedAt: new Date() } }
    )
    return userId
  },

  async findByUserId(userId: string): Promise<NGOProfile | null> {
    const collection = await getCollection<any>("user")
    const user = await collection.findOne(userIdQuery(userId))
    
    if (!user || user.role !== "ngo") return null
    
    // Parse JSON strings back to arrays (safe parsing)
    return {
      ...user,
      userId: user._id.toString(),
      causes: safeJsonParse(user.causes, []),
      typicalSkillsNeeded: safeJsonParse(user.typicalSkillsNeeded, []),
    } as NGOProfile
  },

  async findById(id: string): Promise<NGOProfile | null> {
    return this.findByUserId(id)
  },

  async update(userId: string, updates: Partial<NGOProfile>): Promise<boolean> {
    const collection = await getCollection<any>("user")
    
    // Convert arrays to JSON strings
    const processedUpdates: any = { ...updates }
    if (updates.causes) processedUpdates.causes = JSON.stringify(updates.causes)
    if (updates.typicalSkillsNeeded) processedUpdates.typicalSkillsNeeded = JSON.stringify(updates.typicalSkillsNeeded)
    
    console.log(`[ngoProfilesDb.update] userId=${userId}, fields=${Object.keys(processedUpdates).join(",")}`)
    
    const result = await collection.updateOne(
      userIdQuery(userId),
      { $set: { ...processedUpdates, updatedAt: new Date() } }
    )
    console.log(`[ngoProfilesDb.update] matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`)
    return result.modifiedCount > 0
  },

  async findMany(
    filter: Filter<NGOProfile> = {},
    options: FindOptions = {}
  ): Promise<NGOProfile[]> {
    const collection = await getCollection<any>("user")
    const users = await collection.find({ role: "ngo", ...filter }, options).toArray()
    
    // Parse JSON strings
    return users.map((u: any) => ({
      ...u,
      userId: u._id.toString(),
      causes: safeJsonParse(u.causes, []),
      typicalSkillsNeeded: safeJsonParse(u.typicalSkillsNeeded, []),
    }))
  },

  async count(filter: Filter<NGOProfile> = {}): Promise<number> {
    const collection = await getCollection<any>("user")
    return collection.countDocuments({ role: "ngo", ...filter })
  },

  async incrementStat(userId: string, field: keyof Pick<NGOProfile, "projectsPosted" | "projectsCompleted" | "volunteersEngaged">, amount: number = 1): Promise<boolean> {
    const collection = await getCollection<any>("user")
    const result = await collection.updateOne(
      userIdQuery(userId),
      { $inc: { [field]: amount }, $set: { updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async decrementUnlocks(userId: string): Promise<boolean> {
    const collection = await getCollection<any>("user")
    const result = await collection.updateOne(
      { ...userIdQuery(userId), profileUnlocksRemaining: { $gt: 0 } },
      { $inc: { profileUnlocksRemaining: -1 }, $set: { updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  // Increment monthly unlock count (new subscription system)
  async incrementMonthlyUnlocks(userId: string): Promise<boolean> {
    const collection = await getCollection<any>("user")
    const result = await collection.updateOne(
      userIdQuery(userId),
      { 
        $inc: { monthlyUnlocksUsed: 1 }, 
        $set: { updatedAt: new Date() } 
      }
    )
    return result.modifiedCount > 0
  },
}

// ============================================
// PROJECTS
// ============================================
export const projectsDb = {
  async create(project: Omit<Project, "_id">): Promise<string> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    const result = await collection.insertOne({
      ...project,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Project)
    return result.insertedId.toString()
  },

  async findById(id: string): Promise<Project | null> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async findByNgoId(ngoId: string): Promise<Project[]> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    return collection.find({ ngoId }).sort({ createdAt: -1 }).toArray()
  },

  async update(id: string, updates: Partial<Project>): Promise<boolean> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async findMany(
    filter: Filter<Project> = {},
    options: FindOptions = {}
  ): Promise<Project[]> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    return collection.find(filter, options).toArray()
  },

  async findActive(
    filter: Filter<Project> = {},
    options: FindOptions = {}
  ): Promise<Project[]> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    // Include active and open projects
    return collection.find({ ...filter, status: { $in: ["active", "open"] } }, options).toArray()
  },

  async count(filter: Filter<Project> = {}): Promise<number> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    return collection.countDocuments(filter)
  },

  async incrementApplicants(id: string): Promise<boolean> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { applicantsCount: 1 }, $set: { updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async incrementViews(id: string): Promise<boolean> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { viewsCount: 1 } }
    )
    return result.modifiedCount > 0
  },

  async delete(id: string): Promise<boolean> {
    const collection = await getCollection<Project>(COLLECTIONS.PROJECTS)
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  },
}

// ============================================
// APPLICATIONS
// ============================================
export const applicationsDb = {
  async create(application: Omit<Application, "_id">): Promise<string> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    const result = await collection.insertOne({
      ...application,
      appliedAt: new Date(),
      updatedAt: new Date(),
    } as Application)
    return result.insertedId.toString()
  },

  // Atomic create-if-not-exists to prevent race conditions
  async createIfNotExists(application: Omit<Application, "_id">): Promise<{ created: boolean; id?: string }> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    
    // Use findOneAndUpdate with upsert to atomically check and create
    const result = await collection.findOneAndUpdate(
      { projectId: application.projectId, volunteerId: application.volunteerId },
      { 
        $setOnInsert: {
          ...application,
          appliedAt: new Date(),
          updatedAt: new Date(),
        }
      },
      { 
        upsert: true, 
        returnDocument: "after",
      }
    )
    
    // If the document was just created, it won't have appliedAt before the operation
    // We can check if the createdAt matches approximately (within 1 second)
    if (result) {
      const timeDiff = Math.abs(new Date().getTime() - new Date(result.appliedAt).getTime())
      const wasCreated = timeDiff < 1000 // Created within last second
      return { created: wasCreated, id: result._id?.toString() }
    }
    
    return { created: false }
  },

  async findById(id: string): Promise<Application | null> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async findByProjectId(projectId: string): Promise<Application[]> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    return collection.find({ projectId }).sort({ appliedAt: -1 }).toArray()
  },

  async findByVolunteerId(volunteerId: string): Promise<Application[]> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    return collection.find({ volunteerId }).sort({ appliedAt: -1 }).toArray()
  },

  async findByNgoId(ngoId: string): Promise<Application[]> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    return collection.find({ ngoId }).sort({ appliedAt: -1 }).toArray()
  },

  async exists(projectId: string, volunteerId: string): Promise<boolean> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    const count = await collection.countDocuments({ projectId, volunteerId })
    return count > 0
  },

  async updateStatus(id: string, status: Application["status"], notes?: string): Promise<boolean> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status, 
          ngoNotes: notes,
          reviewedAt: new Date(),
          updatedAt: new Date() 
        } 
      }
    )
    return result.modifiedCount > 0
  },

  async unlockProfile(id: string): Promise<boolean> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isProfileUnlocked: true, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async count(filter: Filter<Application> = {}): Promise<number> {
    const collection = await getCollection<Application>(COLLECTIONS.APPLICATIONS)
    return collection.countDocuments(filter)
  },
}

// ============================================
// PROFILE UNLOCKS
// ============================================
export const profileUnlocksDb = {
  async create(unlock: Omit<ProfileUnlock, "_id">): Promise<string> {
    const collection = await getCollection<ProfileUnlock>(COLLECTIONS.PROFILE_UNLOCKS)
    const result = await collection.insertOne({
      ...unlock,
      unlockedAt: new Date(),
    } as ProfileUnlock)
    return result.insertedId.toString()
  },

  // Atomic create-if-not-exists to prevent race conditions (double charging)
  async createIfNotExists(unlock: Omit<ProfileUnlock, "_id">): Promise<{ created: boolean; id?: string }> {
    const collection = await getCollection<ProfileUnlock>(COLLECTIONS.PROFILE_UNLOCKS)
    
    const result = await collection.findOneAndUpdate(
      { 
        ngoId: unlock.ngoId, 
        volunteerId: unlock.volunteerId,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      },
      { 
        $setOnInsert: {
          ...unlock,
          unlockedAt: new Date(),
        }
      },
      { 
        upsert: true, 
        returnDocument: "after",
      }
    )
    
    if (result) {
      const timeDiff = Math.abs(new Date().getTime() - new Date(result.unlockedAt).getTime())
      const wasCreated = timeDiff < 1000
      return { created: wasCreated, id: result._id?.toString() }
    }
    
    return { created: false }
  },

  async isUnlocked(ngoId: string, volunteerId: string): Promise<boolean> {
    const collection = await getCollection<ProfileUnlock>(COLLECTIONS.PROFILE_UNLOCKS)
    const unlock = await collection.findOne({ 
      ngoId, 
      volunteerId,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    return unlock !== null
  },

  async findByNgoId(ngoId: string): Promise<ProfileUnlock[]> {
    const collection = await getCollection<ProfileUnlock>(COLLECTIONS.PROFILE_UNLOCKS)
    return collection.find({ ngoId }).sort({ unlockedAt: -1 }).toArray()
  },

  async count(filter: Filter<ProfileUnlock> = {}): Promise<number> {
    const collection = await getCollection<ProfileUnlock>(COLLECTIONS.PROFILE_UNLOCKS)
    return collection.countDocuments(filter)
  },
}

// ============================================
// TRANSACTIONS
// ============================================
export const transactionsDb = {
  async create(transaction: Omit<Transaction, "_id">): Promise<string> {
    const collection = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS)
    const result = await collection.insertOne({
      ...transaction,
      createdAt: new Date(),
    } as Transaction)
    return result.insertedId.toString()
  },

  async findById(id: string): Promise<Transaction | null> {
    const collection = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async findByUserId(userId: string): Promise<Transaction[]> {
    const collection = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS)
    return collection.find({ userId }).sort({ createdAt: -1 }).toArray()
  },

  async updateStatus(id: string, status: Transaction["paymentStatus"], paymentId?: string): Promise<boolean> {
    const collection = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          paymentStatus: status, 
          paymentId,
          completedAt: status === "completed" ? new Date() : undefined 
        } 
      }
    )
    return result.modifiedCount > 0
  },

  async findMany(
    filter: Filter<Transaction> = {},
    options: FindOptions = {}
  ): Promise<Transaction[]> {
    const collection = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS)
    return collection.find(filter, options).toArray()
  },

  async count(filter: Filter<Transaction> = {}): Promise<number> {
    const collection = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS)
    return collection.countDocuments(filter)
  },

  async sumAmount(filter: Filter<Transaction> = {}): Promise<number> {
    const collection = await getCollection<Transaction>(COLLECTIONS.TRANSACTIONS)
    const result = await collection.aggregate([
      { $match: { ...filter, paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).toArray()
    return result[0]?.total || 0
  },
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================
export const conversationsDb = {
  async create(conversation: Omit<Conversation, "_id">): Promise<string> {
    const collection = await getCollection<Conversation>(COLLECTIONS.CONVERSATIONS)
    const result = await collection.insertOne({
      ...conversation,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Conversation)
    return result.insertedId.toString()
  },

  async findOrCreate(participants: string[], projectId?: string): Promise<Conversation> {
    const collection = await getCollection<Conversation>(COLLECTIONS.CONVERSATIONS)
    const sortedParticipants = [...participants].sort()
    
    // First try to find existing conversation
    const filter: any = {
      participants: { $all: sortedParticipants, $size: sortedParticipants.length },
      ...(projectId && { projectId }),
    }
    
    const existing = await collection.findOne(filter)
    if (existing) {
      await collection.updateOne({ _id: existing._id }, { $set: { updatedAt: new Date() } })
      return existing
    }
    
    // Not found — insert new conversation
    const newConversation: Omit<Conversation, "_id"> = {
      participants: sortedParticipants,
      projectId,
      isUnlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const result = await collection.insertOne(newConversation as any)
    return { ...newConversation, _id: result.insertedId } as Conversation
  },

  async findByUserId(userId: string): Promise<Conversation[]> {
    const collection = await getCollection<Conversation>(COLLECTIONS.CONVERSATIONS)
    // Sort by lastMessageAt if exists, otherwise fall back to updatedAt
    return collection.find({ participants: userId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .toArray()
  },

  async updateLastMessage(id: string, message: string): Promise<boolean> {
    const collection = await getCollection<Conversation>(COLLECTIONS.CONVERSATIONS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastMessage: message, lastMessageAt: new Date(), updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async setUnlocked(id: string, isUnlocked: boolean): Promise<boolean> {
    const collection = await getCollection<Conversation>(COLLECTIONS.CONVERSATIONS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isUnlocked, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },
}

export const messagesDb = {
  async create(message: Omit<Message, "_id">): Promise<string> {
    const collection = await getCollection<Message>(COLLECTIONS.MESSAGES)
    const result = await collection.insertOne({
      ...message,
      createdAt: new Date(),
    } as Message)
    return result.insertedId.toString()
  },

  async findByConversationId(conversationId: string, limit: number = 50): Promise<Message[]> {
    const collection = await getCollection<Message>(COLLECTIONS.MESSAGES)
    // Get messages sorted ascending (oldest first) so new messages appear at bottom
    return collection.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray()
  },

  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    const collection = await getCollection<Message>(COLLECTIONS.MESSAGES)
    const result = await collection.updateMany(
      { conversationId, receiverId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async countUnread(userId: string): Promise<number> {
    const collection = await getCollection<Message>(COLLECTIONS.MESSAGES)
    return collection.countDocuments({ receiverId: userId, isRead: false })
  },
}

// ============================================
// NOTIFICATIONS
// ============================================
export const notificationsDb = {
  async create(notification: Omit<Notification, "_id">): Promise<string> {
    const collection = await getCollection<Notification>(COLLECTIONS.NOTIFICATIONS)
    const result = await collection.insertOne({
      ...notification,
      isRead: false,
      createdAt: new Date(),
    } as Notification)
    return result.insertedId.toString()
  },

  async findByUserId(userId: string, limit: number = 20): Promise<Notification[]> {
    const collection = await getCollection<Notification>(COLLECTIONS.NOTIFICATIONS)
    return collection.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
  },

  async markAsRead(id: string): Promise<boolean> {
    const collection = await getCollection<Notification>(COLLECTIONS.NOTIFICATIONS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isRead: true, readAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const collection = await getCollection<Notification>(COLLECTIONS.NOTIFICATIONS)
    const result = await collection.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async countUnread(userId: string): Promise<number> {
    const collection = await getCollection<Notification>(COLLECTIONS.NOTIFICATIONS)
    return collection.countDocuments({ userId, isRead: false })
  },

  async deleteOld(daysOld: number = 30): Promise<number> {
    const collection = await getCollection<Notification>(COLLECTIONS.NOTIFICATIONS)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysOld)
    const result = await collection.deleteMany({ createdAt: { $lt: cutoff }, isRead: true })
    return result.deletedCount
  },

  async delete(id: string): Promise<boolean> {
    const collection = await getCollection<Notification>(COLLECTIONS.NOTIFICATIONS)
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  },
}

// ============================================
// FOLLOW SYSTEM
// ============================================
export const followsDb = {
  /**
   * Follow a user. Returns true if new follow created, false if already following.
   */
  async follow(followerId: string, followerRole: string, followingId: string, followingRole: string): Promise<boolean> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    
    // Prevent self-follow
    if (followerId === followingId) return false
    
    // Use upsert to prevent duplicates atomically
    const result = await collection.updateOne(
      { followerId, followingId },
      {
        $setOnInsert: {
          followerId,
          followerRole,
          followingId,
          followingRole,
          createdAt: new Date(),
        } as any,
      },
      { upsert: true }
    )
    
    return result.upsertedCount > 0
  },

  /**
   * Unfollow a user. Returns true if unfollowed, false if wasn't following.
   */
  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    const result = await collection.deleteOne({ followerId, followingId })
    return result.deletedCount > 0
  },

  /**
   * Check if user A follows user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    const doc = await collection.findOne({ followerId, followingId })
    return !!doc
  },

  /**
   * Get complete follow stats for a profile, including whether the viewer follows them.
   */
  async getStats(profileId: string, viewerId?: string): Promise<FollowStats> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    
    const [followersCount, followingCount, isFollowing] = await Promise.all([
      collection.countDocuments({ followingId: profileId }),
      collection.countDocuments({ followerId: profileId }),
      viewerId ? collection.findOne({ followerId: viewerId, followingId: profileId }).then(d => !!d) : Promise.resolve(false),
    ])
    
    return { followersCount, followingCount, isFollowing }
  },

  /**
   * Get follower count for a user
   */
  async getFollowersCount(userId: string): Promise<number> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    return collection.countDocuments({ followingId: userId })
  },

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    return collection.countDocuments({ followerId: userId })
  },

  /**
   * Get paginated list of followers (users who follow the given user)
   */
  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<{
    followers: Follow[]
    total: number
    page: number
    totalPages: number
  }> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    const skip = (page - 1) * limit
    
    const [followers, total] = await Promise.all([
      collection.find({ followingId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments({ followingId: userId }),
    ])
    
    return { followers, total, page, totalPages: Math.ceil(total / limit) }
  },

  /**
   * Get paginated list of users this user follows
   */
  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<{
    following: Follow[]
    total: number
    page: number
    totalPages: number
  }> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    const skip = (page - 1) * limit
    
    const [following, total] = await Promise.all([
      collection.find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments({ followerId: userId }),
    ])
    
    return { following, total, page, totalPages: Math.ceil(total / limit) }
  },

  /**
   * Check follow status for multiple profiles at once (batch)
   */
  async getFollowStatusBatch(viewerId: string, profileIds: string[]): Promise<Map<string, boolean>> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    const follows = await collection.find({
      followerId: viewerId,
      followingId: { $in: profileIds },
    }).toArray()
    
    const statusMap = new Map<string, boolean>()
    profileIds.forEach(id => statusMap.set(id, false))
    follows.forEach(f => statusMap.set(f.followingId, true))
    return statusMap
  },

  /**
   * Ensure proper indexes exist for the follows collection
   */
  async ensureIndexes(): Promise<void> {
    const collection = await getCollection<Follow>(COLLECTIONS.FOLLOWS)
    await collection.createIndex({ followerId: 1, followingId: 1 }, { unique: true })
    await collection.createIndex({ followingId: 1, createdAt: -1 })
    await collection.createIndex({ followerId: 1, createdAt: -1 })
  },
}

// ============================================
// ADMIN SETTINGS
// ============================================
export const adminSettingsDb = {
  async get(): Promise<AdminSettings | null> {
    const collection = await getCollection<AdminSettings>(COLLECTIONS.ADMIN_SETTINGS)
    return collection.findOne({})
  },

  async update(settings: Partial<AdminSettings>, updatedBy: string): Promise<boolean> {
    const collection = await getCollection<AdminSettings>(COLLECTIONS.ADMIN_SETTINGS)
    const result = await collection.updateOne(
      {},
      { 
        $set: { 
          ...settings, 
          updatedAt: new Date(),
          updatedBy
        } 
      },
      { upsert: true }
    )
    return result.modifiedCount > 0 || result.upsertedCount > 0
  },

  async initialize(adminUserId: string): Promise<void> {
    const collection = await getCollection<AdminSettings>(COLLECTIONS.ADMIN_SETTINGS)
    const exists = await collection.findOne({})
    if (!exists) {
      await collection.insertOne({
        // Platform Settings
        platformName: "JustBeCause Network",
        platformDescription: "Connecting Skills with Purpose",
        supportEmail: "support@justbecausenetwork.com",
        
        // Payment Settings
        currency: "USD",
        
        // Volunteer Free Plan
        volunteerFreeApplicationsPerMonth: 3,
        volunteerFreeProfileVisibility: true,
        
        // Volunteer Pro Plan - Production price
        volunteerProPrice: 999,
        volunteerProApplicationsUnlimited: true,
        volunteerProFeatures: [
          "Unlimited job applications",
          "Featured profile badge",
          "Priority in search results",
          "Direct message NGOs",
          "Early access to opportunities",
          "Profile analytics",
          "Certificate downloads",
        ],
        
        // NGO Free Plan
        ngoFreeProjectsPerMonth: 3,
        ngoFreeProfileUnlocksPerMonth: 0,
        
        // NGO Pro Plan - Production price
        ngoProPrice: 2999,
        ngoProProjectsUnlimited: true,
        ngoProUnlocksUnlimited: true,
        ngoProFeatures: [
          "Unlimited projects",
          "Unlimited profile unlocks",
          "Advanced AI-powered matching",
          "Priority support",
          "Project analytics & reports",
          "Featured NGO badge",
          "Bulk impact agent outreach",
        ],
        
        // Features Toggle
        enablePayments: true,
        enableMessaging: true,
        enableNotifications: true,
        requireEmailVerification: false,
        requireNGOVerification: false,
        requirePhoneVerification: false,
        
        // SMS Provider Settings
        smsProvider: "none",
        smsConfigured: false,
        
        // Content
        maintenanceMode: false,
        
        // SEO
        metaTitle: "JustBeCause Network - Connect NGOs with Impact Agents",
        metaDescription: "Platform connecting NGOs with skilled impact agents for social impact",
        
        updatedAt: new Date(),
        updatedBy: adminUserId,
      } as AdminSettings)
    }
  },
}

// ============================================
// SUBSCRIPTION PLANS
// ============================================
export const subscriptionPlansDb = {
  async create(plan: Omit<SubscriptionPlan, "_id">): Promise<string> {
    const collection = await getCollection<SubscriptionPlan>(COLLECTIONS.SUBSCRIPTION_PLANS)
    const result = await collection.insertOne({
      ...plan,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SubscriptionPlan)
    return result.insertedId.toString()
  },

  async findAll(): Promise<SubscriptionPlan[]> {
    const collection = await getCollection<SubscriptionPlan>(COLLECTIONS.SUBSCRIPTION_PLANS)
    return collection.find({ isActive: true }).sort({ priceMonthly: 1 }).toArray()
  },

  async findByTier(tier: SubscriptionPlan["tier"]): Promise<SubscriptionPlan | null> {
    const collection = await getCollection<SubscriptionPlan>(COLLECTIONS.SUBSCRIPTION_PLANS)
    return collection.findOne({ tier, isActive: true })
  },

  async update(id: string, updates: Partial<SubscriptionPlan>): Promise<boolean> {
    const collection = await getCollection<SubscriptionPlan>(COLLECTIONS.SUBSCRIPTION_PLANS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async initializeDefaults(): Promise<void> {
    const collection = await getCollection<SubscriptionPlan>(COLLECTIONS.SUBSCRIPTION_PLANS)
    const count = await collection.countDocuments({})
    
    if (count === 0) {
      const plans: Omit<SubscriptionPlan, "_id">[] = [
        {
          name: "Free",
          tier: "free",
          priceMonthly: 0,
          priceYearly: 0,
          currency: "USD",
          profileUnlocksPerMonth: 0,
          projectsPerMonth: 2,
          featuredListings: false,
          prioritySupport: false,
          analytics: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Basic",
          tier: "basic",
          priceMonthly: 999,
          priceYearly: 9990,
          currency: "USD",
          profileUnlocksPerMonth: 10,
          projectsPerMonth: 10,
          featuredListings: false,
          prioritySupport: false,
          analytics: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Premium",
          tier: "premium",
          priceMonthly: 2499,
          priceYearly: 24990,
          currency: "USD",
          profileUnlocksPerMonth: 50,
          projectsPerMonth: -1, // Unlimited
          featuredListings: true,
          prioritySupport: true,
          analytics: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Enterprise",
          tier: "enterprise",
          priceMonthly: 4999,
          priceYearly: 49990,
          currency: "USD",
          profileUnlocksPerMonth: -1, // Unlimited
          projectsPerMonth: -1, // Unlimited
          featuredListings: true,
          prioritySupport: true,
          analytics: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      await collection.insertMany(plans as SubscriptionPlan[])
    }
  },
}

// ============================================
// TEAM MEMBERS
// ============================================
export const teamMembersDb = {
  async create(member: Omit<TeamMember, "_id">): Promise<string> {
    const collection = await getCollection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    const result = await collection.insertOne({
      ...member,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TeamMember)
    return result.insertedId.toString()
  },

  async findAll(): Promise<TeamMember[]> {
    const collection = await getCollection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    return collection.find({}).sort({ order: 1 }).toArray()
  },

  async findActive(): Promise<TeamMember[]> {
    const collection = await getCollection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    return collection.find({ isActive: true }).sort({ order: 1 }).toArray()
  },

  async findById(id: string): Promise<TeamMember | null> {
    const collection = await getCollection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async update(id: string, updates: Partial<TeamMember>): Promise<boolean> {
    const collection = await getCollection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async delete(id: string): Promise<boolean> {
    const collection = await getCollection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  },

  async reorder(orderedIds: string[]): Promise<boolean> {
    const collection = await getCollection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    const operations = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { order: index, updatedAt: new Date() } },
      },
    }))
    const result = await collection.bulkWrite(operations)
    return result.modifiedCount > 0
  },
}

// ============================================
// BAN RECORDS
// ============================================
export const banRecordsDb = {
  async create(record: Omit<BanRecord, "_id">): Promise<string> {
    const collection = await getCollection<BanRecord>(COLLECTIONS.BAN_RECORDS)
    const result = await collection.insertOne({
      ...record,
      bannedAt: new Date(),
      isActive: true,
    } as BanRecord)
    return result.insertedId.toString()
  },

  async findByUserId(userId: string): Promise<BanRecord[]> {
    const collection = await getCollection<BanRecord>(COLLECTIONS.BAN_RECORDS)
    return collection.find({ userId }).sort({ bannedAt: -1 }).toArray()
  },

  async findActiveByUserId(userId: string): Promise<BanRecord | null> {
    const collection = await getCollection<BanRecord>(COLLECTIONS.BAN_RECORDS)
    return collection.findOne({ userId, isActive: true })
  },

  async findAll(): Promise<BanRecord[]> {
    const collection = await getCollection<BanRecord>(COLLECTIONS.BAN_RECORDS)
    return collection.find({}).sort({ bannedAt: -1 }).toArray()
  },

  async findAllActive(): Promise<BanRecord[]> {
    const collection = await getCollection<BanRecord>(COLLECTIONS.BAN_RECORDS)
    return collection.find({ isActive: true }).sort({ bannedAt: -1 }).toArray()
  },

  async deactivate(userId: string, unbannedBy: string): Promise<boolean> {
    const collection = await getCollection<BanRecord>(COLLECTIONS.BAN_RECORDS)
    const result = await collection.updateOne(
      { userId, isActive: true },
      { $set: { isActive: false, unbannedAt: new Date(), unbannedBy } }
    )
    return result.modifiedCount > 0
  },

  async findById(id: string): Promise<BanRecord | null> {
    const collection = await getCollection<BanRecord>(COLLECTIONS.BAN_RECORDS)
    return collection.findOne({ _id: new ObjectId(id) })
  },
}

// ============================================
// REVIEWS
// ============================================
export const reviewsDb = {
  async create(review: Omit<Review, "_id">): Promise<string> {
    const collection = await getCollection<Review>(COLLECTIONS.REVIEWS)
    const result = await collection.insertOne({
      ...review,
      isPublic: true,
      isReported: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Review)
    return result.insertedId.toString()
  },

  async findByReviewee(revieweeId: string): Promise<Review[]> {
    const collection = await getCollection<Review>(COLLECTIONS.REVIEWS)
    return collection.find({ revieweeId, isPublic: true }).sort({ createdAt: -1 }).toArray()
  },

  async findByProject(projectId: string): Promise<Review[]> {
    const collection = await getCollection<Review>(COLLECTIONS.REVIEWS)
    return collection.find({ projectId }).sort({ createdAt: -1 }).toArray()
  },

  async findByReviewer(reviewerId: string): Promise<Review[]> {
    const collection = await getCollection<Review>(COLLECTIONS.REVIEWS)
    return collection.find({ reviewerId }).sort({ createdAt: -1 }).toArray()
  },

  async findExisting(reviewerId: string, revieweeId: string, projectId: string): Promise<Review | null> {
    const collection = await getCollection<Review>(COLLECTIONS.REVIEWS)
    return collection.findOne({ reviewerId, revieweeId, projectId })
  },

  async getAverageRating(revieweeId: string): Promise<{ average: number; count: number }> {
    const collection = await getCollection<Review>(COLLECTIONS.REVIEWS)
    const reviews = await collection.find({ revieweeId, isPublic: true }).toArray()
    if (reviews.length === 0) return { average: 0, count: 0 }
    const total = reviews.reduce((sum, r) => sum + r.overallRating, 0)
    return { average: total / reviews.length, count: reviews.length }
  },

  async findAll(): Promise<Review[]> {
    const collection = await getCollection<Review>(COLLECTIONS.REVIEWS)
    return collection.find({}).sort({ createdAt: -1 }).toArray()
  },
}

// ============================================
// ENDORSEMENTS
// ============================================
export const endorsementsDb = {
  async create(endorsement: Omit<Endorsement, "_id">): Promise<string> {
    const collection = await getCollection<Endorsement>(COLLECTIONS.ENDORSEMENTS)
    const result = await collection.insertOne({
      ...endorsement,
      createdAt: new Date(),
    } as Endorsement)
    return result.insertedId.toString()
  },

  async findByEndorsee(endorseeId: string): Promise<Endorsement[]> {
    const collection = await getCollection<Endorsement>(COLLECTIONS.ENDORSEMENTS)
    return collection.find({ endorseeId }).sort({ createdAt: -1 }).toArray()
  },

  async findExisting(endorserId: string, endorseeId: string, skillCategoryId: string, skillSubskillId: string): Promise<Endorsement | null> {
    const collection = await getCollection<Endorsement>(COLLECTIONS.ENDORSEMENTS)
    return collection.findOne({ endorserId, endorseeId, skillCategoryId, skillSubskillId })
  },

  async countBySkill(endorseeId: string, skillCategoryId: string, skillSubskillId: string): Promise<number> {
    const collection = await getCollection<Endorsement>(COLLECTIONS.ENDORSEMENTS)
    return collection.countDocuments({ endorseeId, skillCategoryId, skillSubskillId })
  },

  async getSkillEndorsementCounts(endorseeId: string): Promise<Record<string, number>> {
    const collection = await getCollection<Endorsement>(COLLECTIONS.ENDORSEMENTS)
    const endorsements = await collection.find({ endorseeId }).toArray()
    const counts: Record<string, number> = {}
    for (const e of endorsements) {
      const key = `${e.skillCategoryId}:${e.skillSubskillId}`
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  },

  async delete(endorserId: string, endorseeId: string, skillCategoryId: string, skillSubskillId: string): Promise<boolean> {
    const collection = await getCollection<Endorsement>(COLLECTIONS.ENDORSEMENTS)
    const result = await collection.deleteOne({ endorserId, endorseeId, skillCategoryId, skillSubskillId })
    return result.deletedCount > 0
  },
}

// ============================================
// BADGES
// ============================================
export const badgesDb = {
  async create(badge: Omit<Badge, "_id">): Promise<string> {
    const collection = await getCollection<Badge>(COLLECTIONS.BADGES)
    const result = await collection.insertOne({
      ...badge,
      isActive: true,
      createdAt: new Date(),
    } as Badge)
    return result.insertedId.toString()
  },

  async findAll(): Promise<Badge[]> {
    const collection = await getCollection<Badge>(COLLECTIONS.BADGES)
    return collection.find({ isActive: true }).toArray()
  },

  async findByBadgeId(badgeId: string): Promise<Badge | null> {
    const collection = await getCollection<Badge>(COLLECTIONS.BADGES)
    return collection.findOne({ badgeId, isActive: true })
  },

  async initializeDefaults(): Promise<void> {
    const collection = await getCollection<Badge>(COLLECTIONS.BADGES)
    const existing = await collection.countDocuments()
    if (existing > 0) return

    const defaultBadges: Omit<Badge, "_id">[] = [
      // Project badges
      { badgeId: "first_project", name: "First Step", description: "Completed your first project", icon: "🎯", category: "projects", level: "bronze", criteria: { type: "projects_completed", threshold: 1 }, isActive: true, createdAt: new Date() },
      { badgeId: "five_projects", name: "Rising Star", description: "Completed 5 projects", icon: "⭐", category: "projects", level: "silver", criteria: { type: "projects_completed", threshold: 5 }, isActive: true, createdAt: new Date() },
      { badgeId: "ten_projects", name: "Impact Maker", description: "Completed 10 projects", icon: "🏆", category: "projects", level: "gold", criteria: { type: "projects_completed", threshold: 10 }, isActive: true, createdAt: new Date() },
      { badgeId: "twentyfive_projects", name: "Legend", description: "Completed 25 projects", icon: "👑", category: "projects", level: "platinum", criteria: { type: "projects_completed", threshold: 25 }, isActive: true, createdAt: new Date() },
      // Hours badges
      { badgeId: "ten_hours", name: "Getting Started", description: "Contributed 10 hours", icon: "⏰", category: "hours", level: "bronze", criteria: { type: "hours_contributed", threshold: 10 }, isActive: true, createdAt: new Date() },
      { badgeId: "fifty_hours", name: "Dedicated", description: "Contributed 50 hours", icon: "💪", category: "hours", level: "silver", criteria: { type: "hours_contributed", threshold: 50 }, isActive: true, createdAt: new Date() },
      { badgeId: "hundred_hours", name: "Centurion", description: "Contributed 100 hours", icon: "🔥", category: "hours", level: "gold", criteria: { type: "hours_contributed", threshold: 100 }, isActive: true, createdAt: new Date() },
      { badgeId: "fivehundred_hours", name: "Time Lord", description: "Contributed 500 hours", icon: "🌟", category: "hours", level: "platinum", criteria: { type: "hours_contributed", threshold: 500 }, isActive: true, createdAt: new Date() },
      // Skill badges
      { badgeId: "three_skills", name: "Multi-Talented", description: "Added 3 skills to your profile", icon: "🎨", category: "skills", level: "bronze", criteria: { type: "skills_count", threshold: 3 }, isActive: true, createdAt: new Date() },
      { badgeId: "five_skills", name: "Swiss Army Knife", description: "Added 5 skills to your profile", icon: "🛠️", category: "skills", level: "silver", criteria: { type: "skills_count", threshold: 5 }, isActive: true, createdAt: new Date() },
      // Community badges
      { badgeId: "first_review", name: "Reviewer", description: "Wrote your first review", icon: "📝", category: "community", level: "bronze", criteria: { type: "reviews_given", threshold: 1 }, isActive: true, createdAt: new Date() },
      { badgeId: "five_reviews", name: "Critic", description: "Wrote 5 reviews", icon: "🎭", category: "community", level: "silver", criteria: { type: "reviews_given", threshold: 5 }, isActive: true, createdAt: new Date() },
      { badgeId: "first_referral", name: "Connector", description: "Referred your first friend", icon: "🤝", category: "community", level: "bronze", criteria: { type: "referrals_completed", threshold: 1 }, isActive: true, createdAt: new Date() },
      { badgeId: "five_endorsements", name: "Well Endorsed", description: "Received 5 skill endorsements", icon: "👍", category: "community", level: "silver", criteria: { type: "endorsements_received", threshold: 5 }, isActive: true, createdAt: new Date() },
      // Special
      { badgeId: "top_rated", name: "Top Rated", description: "Maintained 4.8+ average rating", icon: "💎", category: "special", level: "gold", criteria: { type: "average_rating", threshold: 4.8 }, isActive: true, createdAt: new Date() },
      { badgeId: "early_adopter", name: "Early Adopter", description: "Joined within the first 100 users", icon: "🚀", category: "special", level: "gold", criteria: { type: "early_user", threshold: 100 }, isActive: true, createdAt: new Date() },
    ]

    await collection.insertMany(defaultBadges as Badge[])
  },
}

// ============================================
// USER BADGES
// ============================================
export const userBadgesDb = {
  async create(userBadge: Omit<UserBadge, "_id">): Promise<string> {
    const collection = await getCollection<UserBadge>(COLLECTIONS.USER_BADGES)
    const result = await collection.insertOne({
      ...userBadge,
      earnedAt: new Date(),
    } as UserBadge)
    return result.insertedId.toString()
  },

  async findByUserId(userId: string): Promise<UserBadge[]> {
    const collection = await getCollection<UserBadge>(COLLECTIONS.USER_BADGES)
    return collection.find({ userId }).sort({ earnedAt: -1 }).toArray()
  },

  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const collection = await getCollection<UserBadge>(COLLECTIONS.USER_BADGES)
    const existing = await collection.findOne({ userId, badgeId })
    return !!existing
  },

  async countByUserId(userId: string): Promise<number> {
    const collection = await getCollection<UserBadge>(COLLECTIONS.USER_BADGES)
    return collection.countDocuments({ userId })
  },
}

// ============================================
// REFERRALS
// ============================================
export const referralsDb = {
  async create(referral: Omit<Referral, "_id">): Promise<string> {
    const collection = await getCollection<Referral>(COLLECTIONS.REFERRALS)
    const result = await collection.insertOne({
      ...referral,
      status: "pending",
      rewardGranted: false,
      createdAt: new Date(),
    } as Referral)
    return result.insertedId.toString()
  },

  async findByReferrerId(referrerId: string): Promise<Referral[]> {
    const collection = await getCollection<Referral>(COLLECTIONS.REFERRALS)
    return collection.find({ referrerId }).sort({ createdAt: -1 }).toArray()
  },

  async findByCode(referralCode: string): Promise<Referral | null> {
    const collection = await getCollection<Referral>(COLLECTIONS.REFERRALS)
    return collection.findOne({ referralCode })
  },

  async findByReferredUserId(referredUserId: string): Promise<Referral | null> {
    const collection = await getCollection<Referral>(COLLECTIONS.REFERRALS)
    return collection.findOne({ referredUserId })
  },

  async updateStatus(referralCode: string, status: string, referredUserId?: string): Promise<boolean> {
    const collection = await getCollection<Referral>(COLLECTIONS.REFERRALS)
    const update: any = { status }
    if (referredUserId) update.referredUserId = referredUserId
    if (status === "completed") update.completedAt = new Date()
    const result = await collection.updateOne({ referralCode }, { $set: update })
    return result.modifiedCount > 0
  },

  async countCompletedByReferrer(referrerId: string): Promise<number> {
    const collection = await getCollection<Referral>(COLLECTIONS.REFERRALS)
    return collection.countDocuments({ referrerId, status: "completed" })
  },

  async generateUniqueCode(): Promise<string> {
    const collection = await getCollection<Referral>(COLLECTIONS.REFERRALS)
    let code: string
    let exists: Referral | null
    do {
      code = "JBC" + Math.random().toString(36).substring(2, 8).toUpperCase()
      exists = await collection.findOne({ referralCode: code })
    } while (exists)
    return code
  },
}

// ============================================
// BLOG POSTS
// ============================================
export const blogPostsDb = {
  async create(post: Omit<BlogPost, "_id">): Promise<string> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    const result = await collection.insertOne({
      ...post,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BlogPost)
    return result.insertedId.toString()
  },

  async findBySlug(slug: string): Promise<BlogPost | null> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    return collection.findOne({ slug })
  },

  async findById(id: string): Promise<BlogPost | null> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async findPublished(limit = 20, skip = 0): Promise<BlogPost[]> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    return collection.find({ status: "published" }).sort({ publishedAt: -1 }).skip(skip).limit(limit).toArray()
  },

  async findAll(): Promise<BlogPost[]> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    return collection.find({}).sort({ createdAt: -1 }).toArray()
  },

  async update(id: string, updates: Partial<BlogPost>): Promise<boolean> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async delete(id: string): Promise<boolean> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  },

  async incrementViews(slug: string): Promise<void> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    await collection.updateOne({ slug }, { $inc: { viewCount: 1 } })
  },

  async countPublished(): Promise<number> {
    const collection = await getCollection<BlogPost>(COLLECTIONS.BLOG_POSTS)
    return collection.countDocuments({ status: "published" })
  },
}

// ============================================
// COUPON CODES DATABASE OPERATIONS
// ============================================
export const couponsDb = {
  async create(coupon: Omit<CouponCode, "_id">): Promise<string> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    // Ensure unique code index
    await collection.createIndex({ code: 1 }, { unique: true })
    const result = await collection.insertOne(coupon as CouponCode)
    return result.insertedId.toString()
  },

  async findByCode(code: string): Promise<CouponCode | null> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    return collection.findOne({ code: code.toUpperCase() })
  },

  async findById(id: string): Promise<CouponCode | null> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async findAll(): Promise<CouponCode[]> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    return collection.find({}).sort({ createdAt: -1 }).toArray()
  },

  async findActive(): Promise<CouponCode[]> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    const now = new Date()
    return collection.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    }).sort({ createdAt: -1 }).toArray()
  },

  async update(id: string, updates: Partial<CouponCode>): Promise<boolean> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async incrementUsage(code: string): Promise<boolean> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    const result = await collection.updateOne(
      { code: code.toUpperCase() },
      { $inc: { usedCount: 1 } }
    )
    return result.modifiedCount > 0
  },

  async delete(id: string): Promise<boolean> {
    const collection = await getCollection<CouponCode>(COLLECTIONS.COUPONS)
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    return result.deletedCount > 0
  },

  /**
   * Validate a coupon code for a specific user and plan.
   * Returns the coupon if valid, or an error message.
   */
  async validate(code: string, userId: string, planId: string, amount: number): Promise<{
    valid: boolean
    coupon?: CouponCode
    discountAmount?: number
    finalAmount?: number
    error?: string
  }> {
    const coupon = await this.findByCode(code.toUpperCase())
    if (!coupon) {
      return { valid: false, error: "Invalid coupon code" }
    }

    if (!coupon.isActive) {
      return { valid: false, error: "This coupon is no longer active" }
    }

    const now = new Date()
    if (now < new Date(coupon.validFrom)) {
      return { valid: false, error: "This coupon is not yet active" }
    }
    if (now > new Date(coupon.validUntil)) {
      return { valid: false, error: "This coupon has expired" }
    }

    // Check max uses
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: "This coupon has reached its usage limit" }
    }

    // Check per-user usage limit
    if (coupon.maxUsesPerUser > 0) {
      const userUsageCount = await couponUsagesDb.countByUserAndCoupon(userId, coupon._id!.toString())
      if (userUsageCount >= coupon.maxUsesPerUser) {
        return { valid: false, error: "You have already used this coupon" }
      }
    }

    // Check applicable plans
    if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(planId)) {
      return { valid: false, error: "This coupon does not apply to the selected plan" }
    }

    // Check minimum amount
    if (coupon.minAmount && amount < coupon.minAmount) {
      return { valid: false, error: `Minimum order amount is ${coupon.minAmount} for this coupon` }
    }

    // Calculate discount (use 2-decimal precision, not integer rounding)
    let discountAmount: number
    if (coupon.discountType === "percentage") {
      discountAmount = Math.round(amount * (coupon.discountValue / 100) * 100) / 100
    } else {
      discountAmount = Math.min(coupon.discountValue, amount) // Can't discount more than the price
    }

    const finalAmount = Math.max(0, Math.round((amount - discountAmount) * 100) / 100)

    return {
      valid: true,
      coupon,
      discountAmount,
      finalAmount,
    }
  },
}

export const couponUsagesDb = {
  async create(usage: Omit<CouponUsage, "_id">): Promise<string> {
    const collection = await getCollection<CouponUsage>(COLLECTIONS.COUPON_USAGES)
    const result = await collection.insertOne(usage as CouponUsage)
    return result.insertedId.toString()
  },

  async countByUserAndCoupon(userId: string, couponId: string): Promise<number> {
    const collection = await getCollection<CouponUsage>(COLLECTIONS.COUPON_USAGES)
    return collection.countDocuments({ userId, couponId })
  },

  async findByUserId(userId: string): Promise<CouponUsage[]> {
    const collection = await getCollection<CouponUsage>(COLLECTIONS.COUPON_USAGES)
    return collection.find({ userId }).sort({ usedAt: -1 }).toArray()
  },

  async findByCouponId(couponId: string): Promise<CouponUsage[]> {
    const collection = await getCollection<CouponUsage>(COLLECTIONS.COUPON_USAGES)
    return collection.find({ couponId }).sort({ usedAt: -1 }).toArray()
  },
}

// ============================================
// SEARCH ANALYTICS
// ============================================
export interface SearchAnalyticsEvent {
  _id?: ObjectId
  query: string
  normalizedQuery: string
  resultCount: number
  engine: string
  took: number // ms
  userId?: string
  userRole?: string
  filters?: Record<string, any>
  inferredFilters?: Record<string, any>
  resultTypes?: { volunteers: number; ngos: number; opportunities: number }
  clickedResultId?: string
  clickedResultType?: string
  clickPosition?: number
  sessionId?: string
  isZeroResult: boolean
  isSuggestion: boolean
  roleExpansionUsed: boolean
  filtersRelaxed: boolean
  // Enhanced tracking fields
  ip?: string
  userAgent?: string
  deviceType?: string // "desktop" | "mobile" | "tablet" | "bot"
  anonymousId?: string // hash of IP+UA for anonymous user grouping
  topResultTitles?: string[] // first 5 result titles for relevance review
  referer?: string
  timestamp: Date
}

export const searchAnalyticsDb = {
  async track(event: Omit<SearchAnalyticsEvent, "timestamp">): Promise<string> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const result = await collection.insertOne({
      ...event,
      timestamp: new Date(),
    } as SearchAnalyticsEvent)
    return result.insertedId.toString()
  },

  async trackClick(searchEventId: string, resultId: string, resultType: string, position: number): Promise<boolean> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const result = await collection.updateOne(
      { _id: new ObjectId(searchEventId) },
      { $set: { clickedResultId: resultId, clickedResultType: resultType, clickPosition: position } }
    )
    return result.modifiedCount > 0
  },

  async getTopQueries(days = 30, limit = 50): Promise<{ query: string; count: number; avgResults: number; zeroResultRate: number }[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return collection.aggregate([
      { $match: { timestamp: { $gte: since }, isSuggestion: false } },
      { $group: {
        _id: "$normalizedQuery",
        count: { $sum: 1 },
        avgResults: { $avg: "$resultCount" },
        zeroCount: { $sum: { $cond: ["$isZeroResult", 1, 0] } },
      }},
      { $project: {
        _id: 0,
        query: "$_id",
        count: 1,
        avgResults: { $round: ["$avgResults", 1] },
        zeroResultRate: { $round: [{ $multiply: [{ $divide: ["$zeroCount", "$count"] }, 100] }, 1] },
      }},
      { $sort: { count: -1 } },
      { $limit: limit },
    ]).toArray() as any
  },

  async getZeroResultQueries(days = 30, limit = 50): Promise<{ query: string; count: number; lastSearched: Date }[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return collection.aggregate([
      { $match: { timestamp: { $gte: since }, isZeroResult: true, isSuggestion: false } },
      { $group: {
        _id: "$normalizedQuery",
        count: { $sum: 1 },
        lastSearched: { $max: "$timestamp" },
      }},
      { $project: { _id: 0, query: "$_id", count: 1, lastSearched: 1 } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]).toArray() as any
  },

  async getTrendingQueries(hours = 24, limit = 20): Promise<{ query: string; count: number; avgResults: number }[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    return collection.aggregate([
      { $match: { timestamp: { $gte: since }, isSuggestion: false } },
      { $group: {
        _id: "$normalizedQuery",
        count: { $sum: 1 },
        avgResults: { $avg: "$resultCount" },
      }},
      { $project: { _id: 0, query: "$_id", count: 1, avgResults: { $round: ["$avgResults", 1] } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]).toArray() as any
  },

  async getOverviewStats(days = 30): Promise<{
    totalSearches: number
    uniqueQueries: number
    avgResultCount: number
    zeroResultRate: number
    avgResponseTime: number
    clickThroughRate: number
    searchesWithFilters: number
    roleExpansionRate: number
  }> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const stats = await collection.aggregate([
      { $match: { timestamp: { $gte: since }, isSuggestion: false } },
      { $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        uniqueQueries: { $addToSet: "$normalizedQuery" },
        avgResultCount: { $avg: "$resultCount" },
        zeroResultCount: { $sum: { $cond: ["$isZeroResult", 1, 0] } },
        avgResponseTime: { $avg: "$took" },
        clickCount: { $sum: { $cond: [{ $ifNull: ["$clickedResultId", false] }, 1, 0] } },
        filterCount: { $sum: { $cond: [{ $gt: [{ $size: { $objectToArray: { $ifNull: ["$inferredFilters", {}] } } }, 0] }, 1, 0] } },
        roleExpansionCount: { $sum: { $cond: ["$roleExpansionUsed", 1, 0] } },
      }},
    ]).toArray()

    if (!stats.length) {
      return { totalSearches: 0, uniqueQueries: 0, avgResultCount: 0, zeroResultRate: 0, avgResponseTime: 0, clickThroughRate: 0, searchesWithFilters: 0, roleExpansionRate: 0 }
    }

    const s = stats[0]
    const total = s.totalSearches || 1
    return {
      totalSearches: s.totalSearches,
      uniqueQueries: s.uniqueQueries?.length || 0,
      avgResultCount: Math.round((s.avgResultCount || 0) * 10) / 10,
      zeroResultRate: Math.round(((s.zeroResultCount || 0) / total) * 1000) / 10,
      avgResponseTime: Math.round(s.avgResponseTime || 0),
      clickThroughRate: Math.round(((s.clickCount || 0) / total) * 1000) / 10,
      searchesWithFilters: s.filterCount || 0,
      roleExpansionRate: Math.round(((s.roleExpansionCount || 0) / total) * 1000) / 10,
    }
  },

  async getDailyVolume(days = 30): Promise<{ date: string; searches: number; zeroResults: number }[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return collection.aggregate([
      { $match: { timestamp: { $gte: since }, isSuggestion: false } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        searches: { $sum: 1 },
        zeroResults: { $sum: { $cond: ["$isZeroResult", 1, 0] } },
      }},
      { $project: { _id: 0, date: "$_id", searches: 1, zeroResults: 1 } },
      { $sort: { date: 1 } },
    ]).toArray() as any
  },

  async getEngineBreakdown(days = 30): Promise<{ engine: string; count: number; avgTime: number }[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return collection.aggregate([
      { $match: { timestamp: { $gte: since }, isSuggestion: false } },
      { $group: {
        _id: "$engine",
        count: { $sum: 1 },
        avgTime: { $avg: "$took" },
      }},
      { $project: { _id: 0, engine: "$_id", count: 1, avgTime: { $round: ["$avgTime", 0] } } },
      { $sort: { count: -1 } },
    ]).toArray() as any
  },

  async getRecentSearches(limit = 100): Promise<SearchAnalyticsEvent[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    return collection.find({ isSuggestion: false }).sort({ timestamp: -1 }).limit(limit).toArray()
  },

  async getSearchesByUser(userId: string, limit = 50): Promise<SearchAnalyticsEvent[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    return collection.find({ userId, isSuggestion: false }).sort({ timestamp: -1 }).limit(limit).toArray()
  },

  async getContentGaps(days = 30, limit = 30): Promise<{ query: string; searches: number; avgResults: number }[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return collection.aggregate([
      { $match: { timestamp: { $gte: since }, isSuggestion: false, resultCount: { $lt: 3 } } },
      { $group: {
        _id: "$normalizedQuery",
        searches: { $sum: 1 },
        avgResults: { $avg: "$resultCount" },
      }},
      { $match: { searches: { $gte: 2 } } },
      { $project: { _id: 0, query: "$_id", searches: 1, avgResults: { $round: ["$avgResults", 1] } } },
      { $sort: { searches: -1 } },
      { $limit: limit },
    ]).toArray() as any
  },

  /** Get daily summary for a specific date range (for cron emails) */
  async getDailySummary(date?: Date): Promise<{
    totalSearches: number
    uniqueQueries: number
    avgResultCount: number
    zeroResultRate: number
    avgResponseTime: number
    topQueries: { query: string; count: number }[]
    zeroResultQueries: { query: string; count: number }[]
    searchesByEngine: { engine: string; count: number }[]
    uniqueUsers: number
    anonymousSearches: number
    topUserSearchers: { userId: string; count: number }[]
  }> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const targetDate = date || new Date()
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)
    const match = { timestamp: { $gte: dayStart, $lte: dayEnd }, isSuggestion: false }

    const [overview, topQ, zeroQ, engines, users] = await Promise.all([
      collection.aggregate([
        { $match: match },
        { $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          uniqueQueries: { $addToSet: "$normalizedQuery" },
          avgResultCount: { $avg: "$resultCount" },
          zeroCount: { $sum: { $cond: ["$isZeroResult", 1, 0] } },
          avgResponseTime: { $avg: "$took" },
          uniqueUserIds: { $addToSet: "$userId" },
          anonCount: { $sum: { $cond: [{ $ifNull: ["$userId", true] }, 1, 0] } },
        }},
      ]).toArray(),
      collection.aggregate([
        { $match: match },
        { $group: { _id: "$normalizedQuery", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { _id: 0, query: "$_id", count: 1 } },
      ]).toArray() as any,
      collection.aggregate([
        { $match: { ...match, isZeroResult: true } },
        { $group: { _id: "$normalizedQuery", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, query: "$_id", count: 1 } },
      ]).toArray() as any,
      collection.aggregate([
        { $match: match },
        { $group: { _id: "$engine", count: { $sum: 1 } } },
        { $project: { _id: 0, engine: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]).toArray() as any,
      collection.aggregate([
        { $match: { ...match, userId: { $ne: null, $exists: true } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, userId: "$_id", count: 1 } },
      ]).toArray() as any,
    ])

    const o = overview[0] || {}
    const total = o.totalSearches || 0
    return {
      totalSearches: total,
      uniqueQueries: o.uniqueQueries?.length || 0,
      avgResultCount: Math.round((o.avgResultCount || 0) * 10) / 10,
      zeroResultRate: total > 0 ? Math.round(((o.zeroCount || 0) / total) * 1000) / 10 : 0,
      avgResponseTime: Math.round(o.avgResponseTime || 0),
      topQueries: topQ,
      zeroResultQueries: zeroQ,
      searchesByEngine: engines,
      uniqueUsers: (o.uniqueUserIds || []).filter(Boolean).length,
      anonymousSearches: o.anonCount || 0,
      topUserSearchers: users,
    }
  },

  /** Get weekly summary for team emails */
  async getWeeklySummary(weeksAgo = 0): Promise<{
    totalSearches: number
    uniqueQueries: number
    zeroResultRate: number
    avgResponseTime: number
    topQueries: { query: string; count: number }[]
    zeroResultQueries: { query: string; count: number }[]
    contentGaps: { query: string; searches: number; avgResults: number }[]
    searchTrend: { date: string; searches: number }[]
    uniqueUsers: number
    anonymousSearches: number
  }> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const now = new Date()
    const weekEnd = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000)
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
    const match = { timestamp: { $gte: weekStart, $lte: weekEnd }, isSuggestion: false }

    const [overview, topQ, zeroQ, gaps, trend] = await Promise.all([
      collection.aggregate([
        { $match: match },
        { $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          uniqueQueries: { $addToSet: "$normalizedQuery" },
          zeroCount: { $sum: { $cond: ["$isZeroResult", 1, 0] } },
          avgResponseTime: { $avg: "$took" },
          uniqueUserIds: { $addToSet: "$userId" },
          anonCount: { $sum: { $cond: [{ $ifNull: ["$userId", true] }, 1, 0] } },
        }},
      ]).toArray(),
      collection.aggregate([
        { $match: match },
        { $group: { _id: "$normalizedQuery", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
        { $project: { _id: 0, query: "$_id", count: 1 } },
      ]).toArray() as any,
      collection.aggregate([
        { $match: { ...match, isZeroResult: true } },
        { $group: { _id: "$normalizedQuery", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { _id: 0, query: "$_id", count: 1 } },
      ]).toArray() as any,
      collection.aggregate([
        { $match: { ...match, resultCount: { $lt: 3 } } },
        { $group: { _id: "$normalizedQuery", searches: { $sum: 1 }, avgResults: { $avg: "$resultCount" } } },
        { $match: { searches: { $gte: 2 } } },
        { $sort: { searches: -1 } },
        { $limit: 15 },
        { $project: { _id: 0, query: "$_id", searches: 1, avgResults: { $round: ["$avgResults", 1] } } },
      ]).toArray() as any,
      collection.aggregate([
        { $match: match },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          searches: { $sum: 1 },
        }},
        { $project: { _id: 0, date: "$_id", searches: 1 } },
        { $sort: { date: 1 } },
      ]).toArray() as any,
    ])

    const o = overview[0] || {}
    const total = o.totalSearches || 0
    return {
      totalSearches: total,
      uniqueQueries: o.uniqueQueries?.length || 0,
      zeroResultRate: total > 0 ? Math.round(((o.zeroCount || 0) / total) * 1000) / 10 : 0,
      avgResponseTime: Math.round(o.avgResponseTime || 0),
      topQueries: topQ,
      zeroResultQueries: zeroQ,
      contentGaps: gaps,
      searchTrend: trend,
      uniqueUsers: (o.uniqueUserIds || []).filter(Boolean).length,
      anonymousSearches: o.anonCount || 0,
    }
  },

  /** Get live/recent search feed for admin dashboard */
  async getLiveFeed(limit = 50): Promise<SearchAnalyticsEvent[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    return collection.find({}).sort({ timestamp: -1 }).limit(limit).toArray()
  },

  /** Get per-user search aggregation for admin dashboard */
  async getUserSearchStats(days = 7, limit = 50): Promise<{
    userId: string | null
    anonymousId: string | null
    searchCount: number
    uniqueQueries: number
    lastSearch: Date
    zeroResults: number
  }[]> {
    const collection = await getCollection<SearchAnalyticsEvent>(COLLECTIONS.SEARCH_ANALYTICS)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return collection.aggregate([
      { $match: { timestamp: { $gte: since }, isSuggestion: false } },
      { $group: {
        _id: { userId: { $ifNull: ["$userId", null] }, anonymousId: { $ifNull: ["$anonymousId", null] } },
        searchCount: { $sum: 1 },
        uniqueQueries: { $addToSet: "$normalizedQuery" },
        lastSearch: { $max: "$timestamp" },
        zeroResults: { $sum: { $cond: ["$isZeroResult", 1, 0] } },
      }},
      { $project: {
        _id: 0,
        userId: "$_id.userId",
        anonymousId: "$_id.anonymousId",
        searchCount: 1,
        uniqueQueries: { $size: "$uniqueQueries" },
        lastSearch: 1,
        zeroResults: 1,
      }},
      { $sort: { searchCount: -1 } },
      { $limit: limit },
    ]).toArray() as any
  },
}

// ============================================
// CONTACT INQUIRIES (Sales & General Contact)
// ============================================
export interface ContactInquiry {
  _id?: ObjectId
  firstName: string
  lastName: string
  email: string
  message: string
  source: "contact_page" | "pricing_contact_sales"
  status: "new" | "in-progress" | "resolved" | "closed"
  adminNotes?: string
  respondedBy?: string
  respondedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export const contactInquiriesDb = {
  async create(inquiry: Omit<ContactInquiry, "_id" | "createdAt" | "updatedAt" | "status">): Promise<string> {
    const collection = await getCollection<ContactInquiry>(COLLECTIONS.CONTACT_INQUIRIES)
    const result = await collection.insertOne({
      ...inquiry,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ContactInquiry)
    return result.insertedId.toString()
  },

  async findAll(filter?: { status?: string }): Promise<ContactInquiry[]> {
    const collection = await getCollection<ContactInquiry>(COLLECTIONS.CONTACT_INQUIRIES)
    const query: any = {}
    if (filter?.status) query.status = filter.status
    return collection.find(query).sort({ createdAt: -1 }).toArray()
  },

  async findById(id: string): Promise<ContactInquiry | null> {
    const collection = await getCollection<ContactInquiry>(COLLECTIONS.CONTACT_INQUIRIES)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async updateStatus(id: string, status: ContactInquiry["status"], adminNotes?: string, respondedBy?: string): Promise<boolean> {
    const collection = await getCollection<ContactInquiry>(COLLECTIONS.CONTACT_INQUIRIES)
    const updates: any = { status, updatedAt: new Date() }
    if (adminNotes !== undefined) updates.adminNotes = adminNotes
    if (respondedBy) {
      updates.respondedBy = respondedBy
      updates.respondedAt = new Date()
    }
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    )
    return result.modifiedCount > 0
  },

  async getStats(): Promise<{ total: number; new: number; inProgress: number; resolved: number }> {
    const collection = await getCollection<ContactInquiry>(COLLECTIONS.CONTACT_INQUIRIES)
    const [total, newCount, inProgress, resolved] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: "new" }),
      collection.countDocuments({ status: "in-progress" }),
      collection.countDocuments({ status: "resolved" }),
    ])
    return { total, new: newCount, inProgress, resolved }
  },
}
