// Admin Account Seeding Script
// Run this script to create the first admin account securely
// Usage: npx tsx lib/admin-seed.ts

import { MongoClient, ObjectId } from "mongodb"
import bcrypt from "bcryptjs"

const MONGODB_URI = process.env.MONGODB_URI || ""

interface AdminUser {
  _id: ObjectId
  name: string
  email: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
  role: "admin"
  isOnboarded: boolean
  banned: boolean
  banReason?: string
  banExpires?: Date
}

interface AdminAccount {
  _id: ObjectId
  accountId: string
  providerId: string
  userId: ObjectId
  password: string
  createdAt: Date
  updatedAt: Date
}

async function seedAdmin() {
  // Get credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || "System Admin"

  if (!adminEmail || !adminPassword) {
    console.error("❌ Missing required environment variables:")
    console.error("   ADMIN_EMAIL - The admin email address")
    console.error("   ADMIN_PASSWORD - The admin password (min 8 characters)")
    console.error("   ADMIN_NAME (optional) - The admin display name")
    console.error("")
    console.error("Example:")
    console.error('   ADMIN_EMAIL="admin@justbecause.asia" ADMIN_PASSWORD="SecurePass123!" npx tsx lib/admin-seed.ts')
    process.exit(1)
  }

  if (adminPassword.length < 8) {
    console.error("❌ Admin password must be at least 8 characters")
    process.exit(1)
  }

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set")
    process.exit(1)
  }

  console.log("🔐 Admin Account Seeding Script")
  console.log("================================")

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("✅ Connected to MongoDB")

    const db = client.db("justbecause")
    const usersCollection = db.collection<AdminUser>("user")
    const accountsCollection = db.collection<AdminAccount>("account")

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ email: adminEmail })
    
    if (existingAdmin) {
      if (existingAdmin.role === "admin") {
        console.log(`ℹ️  Admin account already exists: ${adminEmail}`)
        console.log("   If you need to reset the password, delete the account first.")
        process.exit(0)
      } else {
        // Upgrade existing user to admin
        console.log(`⬆️  Upgrading existing user to admin: ${adminEmail}`)
        await usersCollection.updateOne(
          { _id: existingAdmin._id },
          { 
            $set: { 
              role: "admin", 
              isOnboarded: true,
              updatedAt: new Date() 
            } 
          }
        )
        console.log("✅ User upgraded to admin successfully!")
        process.exit(0)
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    // Create admin user - match Better Auth's format exactly
    const userId = new ObjectId()
    const now = new Date()

    // Note: Better Auth MongoDB adapter uses _id directly, no separate 'id' field
    const adminUser = {
      _id: userId,
      name: adminName,
      email: adminEmail,
      emailVerified: true, // Admin email is pre-verified
      createdAt: now,
      updatedAt: now,
      role: "admin",
      isOnboarded: true, // Admin doesn't need onboarding
      banned: false,
    }

    await usersCollection.insertOne(adminUser as any)
    console.log(`✅ Admin user created: ${adminEmail}`)

    // Create account record for password login
    const accountId = new ObjectId()
    const adminAccount = {
      _id: accountId,
      accountId: userId.toString(),
      providerId: "credential",
      userId: userId, // ObjectId like Better Auth creates
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    }

    await accountsCollection.insertOne(adminAccount)
    console.log("✅ Admin credentials stored")

    console.log("")
    console.log("================================")
    console.log("🎉 Admin account created successfully!")
    console.log("")
    console.log("   Email:", adminEmail)
    console.log("   Name:", adminName)
    console.log("   Role: admin")
    console.log("")
    console.log("   You can now sign in at /auth/signin")
    console.log("   and access the admin panel at /admin")

  } catch (error) {
    console.error("❌ Error seeding admin:", error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

// Run if this file is executed directly
seedAdmin()
