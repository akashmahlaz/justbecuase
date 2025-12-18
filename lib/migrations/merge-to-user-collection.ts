/**
 * Migration Script: Merge Profile Collections into User Collection
 * 
 * This script merges volunteerProfiles and ngoProfiles into the user collection,
 * making user collection the single source of truth for all user data.
 * 
 * Usage: npx tsx lib/migrations/merge-to-user-collection.ts
 */

import { MongoClient } from "mongodb"
import * as fs from "fs"
import * as path from "path"

// Read MONGODB_URI from .env.local
const envPath = path.join(process.cwd(), ".env.local")
const envContent = fs.readFileSync(envPath, "utf-8")
const mongoUri = envContent.split("\n").find(line => line.startsWith("MONGODB_URI"))?.split("=")[1]?.trim()

if (!mongoUri) {
  console.error("❌ MONGODB_URI not found in .env.local")
  process.exit(1)
}

async function mergeToUserCollection() {
  console.log("🔄 Starting migration: Merge profiles into user collection\n")
  
  const client = await MongoClient.connect(mongoUri)
  const db = client.db()
  
  try {
    // === MERGE VOLUNTEER PROFILES ===
    console.log("📋 Step 1: Merging volunteerProfiles into user...")
    const volunteers = await db.collection("volunteerProfiles").find().toArray()
    console.log(`   Found ${volunteers.length} volunteer profiles`)
    
    let volunteerUpdated = 0
    for (const profile of volunteers) {
      const userId = profile.userId
      
      // Build update object - merge ALL fields from profile
      const updateFields: any = {
        updatedAt: new Date()
      }
      
      // Add all volunteer fields (even if undefined, to ensure complete merge)
      updateFields.bio = profile.bio || null
      updateFields.skills = profile.skills ? JSON.stringify(profile.skills) : null
      updateFields.experience = profile.experience || null
      updateFields.availability = profile.availability || null
      updateFields.languages = profile.languages ? JSON.stringify(profile.languages) : null
      updateFields.interests = profile.interests || profile.causes ? JSON.stringify(profile.causes || []) : null
      updateFields.linkedIn = profile.linkedIn || profile.linkedinUrl || null
      updateFields.portfolio = profile.portfolio || profile.portfolioUrl || null
      updateFields.phone = profile.phone || null
      updateFields.location = profile.location || null
      updateFields.city = profile.city || null
      updateFields.country = profile.country || null
      
      // Boolean and number fields
      updateFields.isAvailable = profile.isActive !== false
      updateFields.rating = profile.rating || 0
      updateFields.completedProjects = profile.completedProjects || 0
      
      // Use avatar/image from profile
      if (profile.avatar || profile.image) {
        updateFields.avatar = profile.avatar || profile.image
        const existingUser = await db.collection("user").findOne({ _id: userId })
        if (existingUser && !existingUser.image) {
          updateFields.image = profile.avatar || profile.image
        }
      }
      
      // If profile has name, sync it
      if (profile.name) {
        const existingUser = await db.collection("user").findOne({ _id: userId })
        if (existingUser && !existingUser.name) {
          updateFields.name = profile.name
        }
      }
      
      // Match by string comparison since userId is string but _id might be ObjectId
      const result = await db.collection("user").updateOne(
        { $expr: { $eq: [{ $toString: "$_id" }, userId] } },
        { $set: updateFields }
      )
      
      if (result.matchedCount > 0) {
        volunteerUpdated++
        console.log(`   ✓ Merged profile for user ${userId}`)
      }
    }
    console.log(`   ✅ Updated ${volunteerUpdated} volunteer users\n`)
    
    // === MERGE NGO PROFILES ===
    console.log("📋 Step 2: Merging ngoProfiles into user...")
    const ngos = await db.collection("ngoProfiles").find().toArray()
    console.log(`   Found ${ngos.length} NGO profiles`)
    
    let ngoUpdated = 0
    for (const profile of ngos) {
      const userId = profile.userId
      
      // Build update object - merge ALL fields from profile
      const updateFields: any = {
        updatedAt: new Date()
      }
      
      // Add all NGO fields
      updateFields.orgName = profile.orgName || profile.organizationName || null
      updateFields.description = profile.description || null
      updateFields.mission = profile.mission || null
      updateFields.registrationNumber = profile.registrationNumber || null
      updateFields.website = profile.website || null
      updateFields.phone = profile.phone || null
      updateFields.address = profile.address || null
      updateFields.city = profile.city || null
      updateFields.country = profile.country || null
      updateFields.causes = profile.causes ? JSON.stringify(profile.causes) : null
      updateFields.yearFounded = profile.yearFounded || null
      updateFields.teamSize = profile.teamSize || null
      updateFields.contactPersonName = profile.contactPersonName || null
      updateFields.contactEmail = profile.contactEmail || null
      
      // Boolean and string fields with defaults
      updateFields.isVerified = profile.isVerified || false
      updateFields.subscriptionTier = profile.subscriptionTier || "free"
      updateFields.activeProjects = profile.activeProjects || 0
      
      // Use logo as image
      if (profile.logo) {
        updateFields.logo = profile.logo
        const existingUser = await db.collection("user").findOne({ _id: userId })
        if (existingUser && !existingUser.image) {
          updateFields.image = profile.logo
        }
      }
      
      // Match by string comparison since userId is string but _id might be ObjectId
      const result = await db.collection("user").updateOne(
        { $expr: { $eq: [{ $toString: "$_id" }, userId] } },
        { $set: updateFields }
      )
      
      if (result.matchedCount > 0) {
        ngoUpdated++
        console.log(`   ✓ Merged profile for user ${userId}`)
      }
    }
    console.log(`   ✅ Updated ${ngoUpdated} NGO users\n`)
    
    // === SUMMARY ===
    console.log("📊 Migration Summary:")
    console.log(`   - Volunteer profiles merged: ${volunteerUpdated}`)
    console.log(`   - NGO profiles merged: ${ngoUpdated}`)
    console.log(`   - Total users updated: ${volunteerUpdated + ngoUpdated}`)
    
    console.log("\n✅ Migration completed successfully!")
    console.log("\n⚠️  NEXT STEPS:")
    console.log("   1. Test the application to ensure everything works")
    console.log("   2. After testing, backup old collections:")
    console.log("      mongoexport --uri='YOUR_URI' --collection=volunteerProfiles --out=volunteer_backup.json")
    console.log("      mongoexport --uri='YOUR_URI' --collection=ngoProfiles --out=ngo_backup.json")
    console.log("   3. Drop old collections (after backup!):")
    console.log("      db.volunteerProfiles.drop()")
    console.log("      db.ngoProfiles.drop()")
    
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  } finally {
    await client.close()
  }
}

// Run if called directly
mergeToUserCollection().catch(console.error)
