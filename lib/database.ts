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
} as const

// ============================================
// VOLUNTEER PROFILES
// ============================================
export const volunteerProfilesDb = {
  async create(profile: Omit<VolunteerProfile, "_id">): Promise<string> {
    const collection = await getCollection<VolunteerProfile>(COLLECTIONS.VOLUNTEER_PROFILES)
    const result = await collection.insertOne({
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as VolunteerProfile)
    return result.insertedId.toString()
  },

  async findByUserId(userId: string): Promise<VolunteerProfile | null> {
    const collection = await getCollection<VolunteerProfile>(COLLECTIONS.VOLUNTEER_PROFILES)
    return collection.findOne({ userId })
  },

  async findById(id: string): Promise<VolunteerProfile | null> {
    const collection = await getCollection<VolunteerProfile>(COLLECTIONS.VOLUNTEER_PROFILES)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async update(userId: string, updates: Partial<VolunteerProfile>): Promise<boolean> {
    const collection = await getCollection<VolunteerProfile>(COLLECTIONS.VOLUNTEER_PROFILES)
    const result = await collection.updateOne(
      { userId },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async findMany(
    filter: Filter<VolunteerProfile> = {},
    options: FindOptions = {}
  ): Promise<VolunteerProfile[]> {
    const collection = await getCollection<VolunteerProfile>(COLLECTIONS.VOLUNTEER_PROFILES)
    return collection.find(filter, options).toArray()
  },

  async count(filter: Filter<VolunteerProfile> = {}): Promise<number> {
    const collection = await getCollection<VolunteerProfile>(COLLECTIONS.VOLUNTEER_PROFILES)
    return collection.countDocuments(filter)
  },

  async delete(userId: string): Promise<boolean> {
    const collection = await getCollection<VolunteerProfile>(COLLECTIONS.VOLUNTEER_PROFILES)
    const result = await collection.deleteOne({ userId })
    return result.deletedCount > 0
  },
}

// ============================================
// NGO PROFILES
// ============================================
export const ngoProfilesDb = {
  async create(profile: Omit<NGOProfile, "_id">): Promise<string> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    const result = await collection.insertOne({
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as NGOProfile)
    return result.insertedId.toString()
  },

  async findByUserId(userId: string): Promise<NGOProfile | null> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    return collection.findOne({ userId })
  },

  async findById(id: string): Promise<NGOProfile | null> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    return collection.findOne({ _id: new ObjectId(id) })
  },

  async update(userId: string, updates: Partial<NGOProfile>): Promise<boolean> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    const result = await collection.updateOne(
      { userId },
      { $set: { ...updates, updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async findMany(
    filter: Filter<NGOProfile> = {},
    options: FindOptions = {}
  ): Promise<NGOProfile[]> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    return collection.find(filter, options).toArray()
  },

  async count(filter: Filter<NGOProfile> = {}): Promise<number> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    return collection.countDocuments(filter)
  },

  async incrementStat(userId: string, field: keyof Pick<NGOProfile, "projectsPosted" | "projectsCompleted" | "volunteersEngaged">, amount: number = 1): Promise<boolean> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    const result = await collection.updateOne(
      { userId },
      { $inc: { [field]: amount }, $set: { updatedAt: new Date() } }
    )
    return result.modifiedCount > 0
  },

  async decrementUnlocks(userId: string): Promise<boolean> {
    const collection = await getCollection<NGOProfile>(COLLECTIONS.NGO_PROFILES)
    const result = await collection.updateOne(
      { userId, profileUnlocksRemaining: { $gt: 0 } },
      { $inc: { profileUnlocksRemaining: -1 }, $set: { updatedAt: new Date() } }
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
    return collection.find({ ...filter, status: "active" }, options).toArray()
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
    
    let conversation = await collection.findOne({
      participants: { $all: sortedParticipants, $size: sortedParticipants.length },
      ...(projectId && { projectId })
    })

    if (!conversation) {
      const result = await collection.insertOne({
        participants: sortedParticipants,
        projectId,
        isUnlocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Conversation)
      conversation = await collection.findOne({ _id: result.insertedId })
    }

    return conversation!
  },

  async findByUserId(userId: string): Promise<Conversation[]> {
    const collection = await getCollection<Conversation>(COLLECTIONS.CONVERSATIONS)
    return collection.find({ participants: userId }).sort({ lastMessageAt: -1 }).toArray()
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
    return collection.find({ conversationId })
      .sort({ createdAt: -1 })
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
        platformName: "JustBecause.Asia",
        platformDescription: "Connecting NGOs with skilled volunteers",
        supportEmail: "support@justbecause.asia",
        singleProfileUnlockPrice: 499,
        currency: "INR",
        enablePayments: true,
        enableMessaging: true,
        enableNotifications: true,
        requireEmailVerification: false,
        requireNGOVerification: false,
        maintenanceMode: false,
        metaTitle: "JustBecause.Asia - Connect NGOs with Volunteers",
        metaDescription: "Platform connecting NGOs with skilled volunteers for social impact",
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
          currency: "INR",
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
          currency: "INR",
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
          currency: "INR",
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
          currency: "INR",
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
