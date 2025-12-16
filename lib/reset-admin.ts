// Quick script to reset admin account
import { MongoClient } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/justbecause"

async function resetAdmin() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db("justbecause")
    
    // Find existing admin first to get the _id
    const adminUser = await db.collection("user").findOne({ email: "admin@justbecause.asia" })
    
    if (adminUser) {
      // Delete account using the ObjectId
      const deleteAccount = await db.collection("account").deleteOne({ 
        userId: adminUser._id
      })
      console.log("Deleted account:", deleteAccount.deletedCount)
      
      // Delete user
      const deleteUser = await db.collection("user").deleteOne({ _id: adminUser._id })
      console.log("Deleted user:", deleteUser.deletedCount)
    } else {
      console.log("No admin user found to delete")
    }
    
    console.log("✅ Admin reset complete. Now run the seed script again.")
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await client.close()
  }
}

resetAdmin()
