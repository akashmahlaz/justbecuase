import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { notificationsDb } from "@/lib/database"
import { getDb } from "@/lib/database"

// Check if user is admin
async function checkAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  
  if (!session?.user) {
    return null
  }
  
  // Use role-based check for consistency across all admin endpoints
  const userRole = (session.user as any).role
  if (userRole !== "admin") {
    return null
  }
  
  return session.user
}

// GET - Get all notifications (admin view)
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    const db = await getDb()
    const notificationsCollection = db.collection("notifications")
    
    const [notifications, total] = await Promise.all([
      notificationsCollection
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      notificationsCollection.countDocuments({}),
    ])

    return NextResponse.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// POST - Send notification to user(s)
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      userIds, 
      userType, // 'all' | 'volunteers' | 'ngos' | 'specific'
      title, 
      message, 
      type = "system",
      link 
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" }, 
        { status: 400 }
      )
    }

    const db = await getDb()
    let targetUserIds: string[] = []

    if (userType === "all") {
      // Get all users
      const users = await db.collection("user").find({}).toArray()
      targetUserIds = users.map((u) => u.id)
    } else if (userType === "volunteers") {
      // Get all volunteers from user collection
      const volunteers = await db.collection("user").find({ role: "volunteer" }).toArray()
      targetUserIds = volunteers.map((v) => v.id)
    } else if (userType === "ngos") {
      // Get all NGOs from user collection
      const ngos = await db.collection("user").find({ role: "ngo" }).toArray()
      targetUserIds = ngos.map((n) => n.id)
    } else if (userType === "specific" && userIds && Array.isArray(userIds)) {
      targetUserIds = userIds
    } else {
      return NextResponse.json(
        { error: "Invalid user type or user IDs" }, 
        { status: 400 }
      )
    }

    // Create notifications in batch for all target users
    const now = new Date()
    const notificationDocs = targetUserIds.map((userId) => ({
      userId,
      type: type as any,
      title,
      message,
      link,
      isRead: false,
      createdAt: now,
    }))

    let insertedCount = 0
    if (notificationDocs.length > 0) {
      try {
        const db = await getDb()
        const result = await db.collection("notifications").insertMany(notificationDocs)
        insertedCount = result.insertedCount
      } catch (e) {
        console.error("Failed to batch insert notifications:", e)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${insertedCount} notifications`,
      count: insertedCount,
    })
  } catch (error) {
    console.error("Failed to send notifications:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}
