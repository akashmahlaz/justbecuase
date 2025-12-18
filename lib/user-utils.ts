import { getDb } from "./database"

// Collection names (must match database.ts)
const COLLECTIONS = {
  USER: "user",
  VOLUNTEER_PROFILES: "volunteerProfiles",
  NGO_PROFILES: "ngoProfiles",
}

export interface UserInfo {
  id: string
  name: string
  email?: string
  image?: string
  type: "volunteer" | "ngo" | "unknown"
}

/**
 * ARCHITECTURE: Single Source of Truth for User Data
 * 
 * This utility follows a critical design principle:
 * - Auth 'user' table is the SINGLE SOURCE OF TRUTH for basic user info (name, email, image)
 * - Profile tables store ONLY role-specific data (skills, bio, orgName, etc.)
 * - Always fetch user info from auth table FIRST, then enrich with profile data
 * 
 * This prevents data duplication issues and ensures consistency without manual syncing.
 */

/**
 * Get user information with auth table as single source of truth.
 * 
 * Priority order:
 * 1. Basic info (name, email, image) from auth 'user' table
 * 2. Role-specific info from profile tables
 * 3. Determine user type from profile existence
 */
export async function getUserInfo(userId: string): Promise<UserInfo | null> {
  if (!userId) return null
  
  const db = await getDb()
  
  // Fetch from user collection (single source of truth after migration)
  // Try both _id formats: string and ObjectId
  let user = await db.collection(COLLECTIONS.USER).findOne({ 
    $or: [
      { _id: userId as any },
      { $expr: { $eq: [{ $toString: "$_id" }, userId] } }
    ]
  })
  
  if (!user) return null
  
  // Determine user type from role field
  const role = user.role
  
  // NGO users: use orgName if set, otherwise fall back to name
  if (role === "ngo") {
    return {
      id: userId,
      name: user.orgName || user.organizationName || user.name || "NGO",
      email: user.email,
      image: user.logo || user.image || user.avatar,
      type: "ngo",
    }
  }
  
  // Volunteer users: use name from user record
  if (role === "volunteer") {
    return {
      id: userId,
      name: user.name || "Volunteer",
      email: user.email,
      image: user.avatar || user.image,
      type: "volunteer",
    }
  }
  
  // User exists but no role yet (onboarding)
  return {
    id: userId,
    name: user.name || "User",
    email: user.email,
    image: user.image || user.avatar,
    type: "unknown",
  }
}

/**
 * Update user data in the user collection (single source of truth).
 * Call this whenever a user updates their profile name or image.
 */
export async function syncUserDataToProfile(userId: string, data: { name?: string, image?: string }): Promise<void> {
  const db = await getDb()
  
  // Update user collection (single source of truth after migration)
  const updateData: any = { updatedAt: new Date() }
  if (data.name) updateData.name = data.name
  if (data.image) {
    // Update both image and avatar fields for compatibility
    updateData.image = data.image
    updateData.avatar = data.image
    updateData.logo = data.image
  }
  
  await db.collection(COLLECTIONS.USER).updateOne(
    { $or: [
      { _id: userId as any },
      { $expr: { $eq: [{ $toString: "$_id" }, userId] } }
    ]},
    { $set: updateData }
  )
}

/**
 * Get multiple users' info at once (more efficient for lists)
 */
export async function getUsersInfo(userIds: string[]): Promise<Map<string, UserInfo>> {
  const result = new Map<string, UserInfo>()
  if (!userIds.length) return result
  
  const db = await getDb()
  
  // Batch fetch from user collection (single source after migration)
  // Handle both string _id and ObjectId formats
  const users = await db.collection(COLLECTIONS.USER).find({ 
    $or: [
      { _id: { $in: userIds as any[] } },
      { $expr: { $in: [{ $toString: "$_id" }, userIds] } }
    ]
  }).toArray()
  
  // Create lookup map
  const userMap = new Map(users.map(u => {
    const id = u._id?.toString() || u._id
    return [id, u]
  }))
  
  // Build result based on role field
  for (const userId of userIds) {
    const user = userMap.get(userId)
    if (!user) continue
    
    const role = user.role
    
    if (role === "ngo") {
      result.set(userId, {
        id: userId,
        name: user.orgName || user.organizationName || user.name || "NGO",
        email: user.email,
        image: user.logo || user.image || user.avatar,
        type: "ngo",
      })
    } else if (role === "volunteer") {
      result.set(userId, {
        id: userId,
        name: user.name || "Volunteer",
        email: user.email,
        image: user.avatar || user.image,
        type: "volunteer",
      })
    } else {
      result.set(userId, {
        id: userId,
        name: user.name || "User",
        email: user.email,
        image: user.image || user.avatar,
        type: "unknown",
      })
    }
  }
  
  return result
}
