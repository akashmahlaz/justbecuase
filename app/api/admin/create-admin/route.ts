import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/database"
import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"

// POST /api/admin/create-admin - Create a new admin account (only by existing admins)
export async function POST(request: NextRequest) {
  try {
    // Verify current user is an admin
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, password } = body

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, password" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const db = await getDb()
    const usersCollection = db.collection("user")
    const accountsCollection = db.collection("account")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    
    if (existingUser) {
      if (existingUser.role === "admin") {
        return NextResponse.json(
          { error: "An admin with this email already exists" },
          { status: 409 }
        )
      }
      
      // Upgrade existing user to admin
      await usersCollection.updateOne(
        { _id: existingUser._id },
        { 
          $set: { 
            role: "admin", 
            isOnboarded: true,
            updatedAt: new Date() 
          } 
        }
      )

      return NextResponse.json({
        success: true,
        message: `User ${email} has been upgraded to admin`,
        upgraded: true,
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date()
    const userId = new ObjectId()

    // Create new admin user
    await usersCollection.insertOne({
      _id: userId,
      id: userId.toString(), // Better Auth uses string ID
      name,
      email,
      emailVerified: true, // Admin email is pre-verified
      createdAt: now,
      updatedAt: now,
      role: "admin",
      isOnboarded: true,
      banned: false,
    })

    // Create account record for password login
    await accountsCollection.insertOne({
      _id: new ObjectId(),
      accountId: userId.toString(),
      providerId: "credential",
      userId: userId.toString(),
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      message: `Admin account created for ${email}`,
      upgraded: false,
    })

  } catch (error) {
    console.error("Error creating admin:", error)
    return NextResponse.json(
      { error: "Failed to create admin account" },
      { status: 500 }
    )
  }
}

// GET /api/admin/create-admin - List all admin accounts (for admin management)
export async function GET(request: NextRequest) {
  try {
    // Verify current user is an admin
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      )
    }

    const db = await getDb()
    const usersCollection = db.collection("user")

    // Get all admin users
    const admins = await usersCollection
      .find({ role: "admin" })
      .project({ password: 0 }) // Exclude password field
      .toArray()

    return NextResponse.json({
      success: true,
      admins: admins.map(admin => ({
        id: admin._id?.toString() || admin.id,
        name: admin.name,
        email: admin.email,
        createdAt: admin.createdAt,
        banned: admin.banned || false,
      })),
    })

  } catch (error) {
    console.error("Error fetching admins:", error)
    return NextResponse.json(
      { error: "Failed to fetch admin accounts" },
      { status: 500 }
    )
  }
}
