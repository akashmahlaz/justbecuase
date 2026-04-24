/**
 * User Profile Helpers - Single Collection Approach
 * 
 * These helpers read/write from the user collection directly,
 * replacing the old volunteerProfilesDb and ngoProfilesDb helpers.
 */

import { getDb } from "./database"

/**
 * Get volunteer profile by userId (from user collection)
 */
export async function getVolunteerProfileFromUser(userId: string) {
  const db = await getDb()
  const user = await db.collection("user").findOne({ 
    $expr: { $eq: [{ $toString: "$_id" }, userId] }
  })
  
  if (!user || user.role !== "volunteer") return null
  
  // Parse JSON strings back to arrays
  return {
    ...user,
    skills: user.skills ? JSON.parse(user.skills) : [],
    languages: user.languages ? JSON.parse(user.languages) : [],
    interests: user.interests ? JSON.parse(user.interests) : [],
  }
}

/**
 * Get NGO profile by userId (from user collection)
 */
export async function getNGOProfileFromUser(userId: string) {
  const db = await getDb()
  const user = await db.collection("user").findOne({
    $expr: { $eq: [{ $toString: "$_id" }, userId] }
  })
  
  if (!user || user.role !== "ngo") return null
  
  // Parse JSON strings back to arrays
  return {
    ...user,
    causes: user.causes ? JSON.parse(user.causes) : [],
  }
}

/**
 * Update volunteer profile (updates user collection)
 */
export async function updateVolunteerProfileInUser(userId: string, updates: any) {
  const db = await getDb()
  
  // Convert arrays to JSON strings for storage
  const processedUpdates = { ...updates }
  if (updates.skills) processedUpdates.skills = JSON.stringify(updates.skills)
  if (updates.languages) processedUpdates.languages = JSON.stringify(updates.languages)
  if (updates.interests) processedUpdates.interests = JSON.stringify(updates.interests)
  
  processedUpdates.updatedAt = new Date()
  
  const result = await db.collection("user").updateOne(
    { $expr: { $eq: [{ $toString: "$_id" }, userId] } },
    { $set: processedUpdates }
  )
  
  return result.modifiedCount > 0
}

/**
 * Update NGO profile (updates user collection)
 */
export async function updateNGOProfileInUser(userId: string, updates: any) {
  const db = await getDb()
  
  // Convert arrays to JSON strings for storage
  const processedUpdates = { ...updates }
  if (updates.causes) processedUpdates.causes = JSON.stringify(updates.causes)
  
  processedUpdates.updatedAt = new Date()
  
  const result = await db.collection("user").updateOne(
    { $expr: { $eq: [{ $toString: "$_id" }, userId] } },
    { $set: processedUpdates }
  )
  
  return result.modifiedCount > 0
}

/**
 * Create volunteer profile (actually updates user with profile data)
 */
export async function createVolunteerProfileInUser(profileData: any) {
  const { userId, ...data } = profileData
  return updateVolunteerProfileInUser(userId, data)
}

/**
 * Create NGO profile (actually updates user with profile data)
 */
export async function createNGOProfileInUser(profileData: any) {
  const { userId, ...data } = profileData
  return updateNGOProfileInUser(userId, data)
}

/**
 * Count volunteers
 */
export async function countVolunteers(filter: any = {}) {
  const db = await getDb()
  return db.collection("user").countDocuments({ role: "volunteer", ...filter })
}

/**
 * Count NGOs
 */
export async function countNGOs(filter: any = {}) {
  const db = await getDb()
  return db.collection("user").countDocuments({ role: "ngo", ...filter })
}

/**
 * Find volunteers with filters
 */
export async function findVolunteers(filter: any = {}) {
  const db = await getDb()
  const volunteers = await db.collection("user").find({ role: "volunteer", ...filter }).toArray()
  
  // Parse JSON strings
  return volunteers.map(v => ({
    ...v,
    skills: v.skills ? JSON.parse(v.skills) : [],
    languages: v.languages ? JSON.parse(v.languages) : [],
    interests: v.interests ? JSON.parse(v.interests) : [],
  }))
}

/**
 * Find NGOs with filters
 */
export async function findNGOs(filter: any = {}) {
  const db = await getDb()
  const ngos = await db.collection("user").find({ role: "ngo", ...filter }).toArray()
  
  // Parse JSON strings
  return ngos.map(n => ({
    ...n,
    causes: n.causes ? JSON.parse(n.causes) : [],
  }))
}

/**
 * Increment monthly application count for volunteer (for free plan limits)
 */
export async function incrementVolunteerApplicationCount(userId: string) {
  const db = await getDb()
  await db.collection("user").updateOne(
    { $expr: { $eq: [{ $toString: "$_id" }, userId] } },
    { $inc: { monthlyApplicationsUsed: 1 }, $set: { updatedAt: new Date() } }
  )
}
