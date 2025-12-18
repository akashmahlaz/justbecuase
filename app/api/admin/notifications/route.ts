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
  
  const db = await getDb()
  const adminRecord = await db.collection("admins").findOne({ email: session.user.email })
  
  if (!adminRecord) {
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
      // Get all volunteers
      const volunteers = await db.collection("volunteer_profiles").find({}).toArray()
      targetUserIds = volunteers.map((v) => v.userId)
    } else if (userType === "ngos") {
      // Get all NGOs
      const ngos = await db.collection("ngo_profiles").find({}).toArray()
      targetUserIds = ngos.map((n) => n.userId)
    } else if (userType === "specific" && userIds && Array.isArray(userIds)) {
      targetUserIds = userIds
    } else {
      return NextResponse.json(
        { error: "Invalid user type or user IDs" }, 
        { status: 400 }
      )
    }

    // Create notifications for all target users
    const createdNotifications: string[] = []
    for (const userId of targetUserIds) {
      try {
        const notificationId = await notificationsDb.create({
          userId,
          type: type as any,
          title,
          message,
          link,
          isRead: false,
          createdAt: new Date(),
        })
        createdNotifications.push(notificationId)
      } catch (e) {
        console.error(`Failed to create notification for user ${userId}:`, e)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${createdNotifications.length} notifications`,
      count: createdNotifications.length,
    })
  } catch (error) {
    console.error("Failed to send notifications:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}
