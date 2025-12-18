/**
 * Migration Script: Sync user names from auth table to profiles
 * 
 * Run this script to populate missing names in volunteerProfiles and ngoProfiles
 * from the better-auth user table.
 * 
 * Usage: npx tsx lib/migrations/sync-user-names.ts
 */

import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/justbecause"

// Collection names (must match database.ts)
const COLLECTIONS = {
  USER: "user",
  VOLUNTEER_PROFILES: "volunteerProfiles",
  NGO_PROFILES: "ngoProfiles",
}

async function syncUserNames() {
  console.log("🔄 Starting user name sync migration...")
  
  const client = await MongoClient.connect(MONGODB_URI)
  const db = client.db()
  
  try {
    // Get all auth users with names (better-auth uses _id as string, not ObjectId)
    const authUsers = await db.collection(COLLECTIONS.USER).find({ 
      name: { $exists: true, $nin: [null, ""] } 
    }).toArray()
    
    console.log(`Found ${authUsers.length} users with names in auth table`)
    
    let volunteerUpdates = 0
    let ngoUpdates = 0
    
    for (const authUser of authUsers) {
      // The userId in profiles matches the _id (string) from auth user table
      const userId = authUser._id.toString()
      
      // Update volunteer profiles missing name
      const volunteerResult = await db.collection(COLLECTIONS.VOLUNTEER_PROFILES).updateOne(
        { 
          userId,
          $or: [
            { name: { $exists: false } },
            { name: "" },
            { name: null }
          ]
        },
        { 
          $set: { 
            name: authUser.name,
            updatedAt: new Date()
          } 
        }
      )
      
      if (volunteerResult.modifiedCount > 0) {
        volunteerUpdates++
        console.log(`✅ Updated volunteer profile for ${authUser.email}: ${authUser.name}`)
      }
      
      // Update volunteer profiles missing avatar (use auth image)
      if (authUser.image) {
        await db.collection(COLLECTIONS.VOLUNTEER_PROFILES).updateOne(
          { 
            userId,
            $or: [
              { avatar: { $exists: false } },
              { avatar: "" },
              { avatar: null }
            ]
          },
          { 
            $set: { 
              avatar: authUser.image,
              updatedAt: new Date()
            } 
          }
        )
      }
    }
    
    console.log(`\n📊 Migration Summary:`)
    console.log(`   - Volunteer profiles updated: ${volunteerUpdates}`)
    console.log(`   - NGO profiles updated: ${ngoUpdates}`)
    console.log(`\n✅ Migration completed successfully!`)
    
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  } finally {
    await client.close()
  }
}

// Run if called directly
syncUserNames().catch(console.error)
