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
  
  // ALWAYS fetch from auth table first (single source of truth)
  const authUser = await db.collection(COLLECTIONS.USER).findOne({ _id: userId as any })
  if (!authUser) return null
  
  // Determine user type and get role-specific data
  const [ngoProfile, volunteerProfile] = await Promise.all([
    db.collection(COLLECTIONS.NGO_PROFILES).findOne({ userId }),
    db.collection(COLLECTIONS.VOLUNTEER_PROFILES).findOne({ userId })
  ])
  
  // NGO users: use orgName if set, otherwise fall back to auth name
  if (ngoProfile) {
    return {
      id: userId,
      name: ngoProfile.orgName || ngoProfile.organizationName || authUser.name || "NGO",
      email: authUser.email,
      image: ngoProfile.logo || authUser.image, // Profile logo takes precedence
      type: "ngo",
    }
  }
  
  // Volunteer users: always use auth name (single source of truth)
  if (volunteerProfile) {
    return {
      id: userId,
      name: authUser.name || "Volunteer",
      email: authUser.email,
      image: volunteerProfile.avatar || authUser.image, // Profile avatar takes precedence
      type: "volunteer",
    }
  }
  
  // User exists in auth but no profile yet (onboarding)
  return {
    id: userId,
    name: authUser.name || "User",
    email: authUser.email,
    image: authUser.image,
    type: "unknown",
  }
}

/**
 * Automatically sync user data to profile when name is updated.
 * Call this whenever a user updates their profile name.
 * 
 * This ensures backward compatibility with any code that reads name from profile tables,
 * while the auth table remains the source of truth.
 */
export async function syncUserDataToProfile(userId: string, data: { name?: string, image?: string }): Promise<void> {
  const db = await getDb()
  
  // Update auth user table (source of truth)
  const updateAuthData: any = { updatedAt: new Date() }
  if (data.name) updateAuthData.name = data.name
  if (data.image) updateAuthData.image = data.image
  
  await db.collection(COLLECTIONS.USER).updateOne(
    { _id: userId as any },
    { $set: updateAuthData }
  )
  
  // Sync to profiles for backward compatibility
  if (data.name) {
    await Promise.all([
      db.collection(COLLECTIONS.VOLUNTEER_PROFILES).updateOne(
        { userId },
        { $set: { name: data.name, updatedAt: new Date() } }
      ),
      // Don't update NGO orgName - that's role-specific data
    ])
  }
  
  if (data.image) {
    await Promise.all([
      db.collection(COLLECTIONS.VOLUNTEER_PROFILES).updateOne(
        { userId },
        { $set: { avatar: data.image, updatedAt: new Date() } }
      ),
      db.collection(COLLECTIONS.NGO_PROFILES).updateOne(
        { userId },
        { $set: { logo: data.image, updatedAt: new Date() } }
      ),
    ])
  }
}

/**
 * Get multiple users' info at once (more efficient for lists)
 */
export async function getUsersInfo(userIds: string[]): Promise<Map<string, UserInfo>> {
  const result = new Map<string, UserInfo>()
  if (!userIds.length) return result
  
  const db = await getDb()
  
  // Batch fetch all data (auth users use _id as string, not ObjectId)
  const [authUsers, ngoProfiles, volunteerProfiles] = await Promise.all([
    db.collection(COLLECTIONS.USER).find({ _id: { $in: userIds as any[] } }).toArray(),
    db.collection(COLLECTIONS.NGO_PROFILES).find({ userId: { $in: userIds } }).toArray(),
    db.collection(COLLECTIONS.VOLUNTEER_PROFILES).find({ userId: { $in: userIds } }).toArray(),
  ])
  
  // Create lookup maps (_id is the user id as string)
  const authUserMap = new Map(authUsers.map(u => [u._id?.toString(), u]))
  const ngoMap = new Map(ngoProfiles.map(n => [n.userId, n]))
  const volunteerMap = new Map(volunteerProfiles.map(v => [v.userId, v]))
  
  // Build result
  for (const userId of userIds) {
    const authUser = authUserMap.get(userId)
    const ngoProfile = ngoMap.get(userId)
    const volunteerProfile = volunteerMap.get(userId)
    
    if (ngoProfile) {
      result.set(userId, {
        id: userId,
        name: ngoProfile.orgName || ngoProfile.organizationName || authUser?.name || "NGO",
        email: authUser?.email,
        image: ngoProfile.logo || authUser?.image,
        type: "ngo",
      })
    } else if (volunteerProfile) {
      result.set(userId, {
        id: userId,
        name: volunteerProfile.name || authUser?.name || "Volunteer",
        email: authUser?.email,
        image: volunteerProfile.avatar || authUser?.image,
        type: "volunteer",
      })
    } else if (authUser) {
      result.set(userId, {
        id: userId,
        name: authUser.name || "User",
        email: authUser.email,
        image: authUser.image,
        type: "unknown",
      })
    }
  }
  
  return result
}
