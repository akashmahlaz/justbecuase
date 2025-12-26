import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getMyNotifications, getUnreadNotificationCount } from "@/lib/actions"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [notifications, unreadCount] = await Promise.all([
      getMyNotifications(),
      getUnreadNotificationCount(),
    ])

    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n._id?.toString() || "",
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
        link: n.link || "",
      })),
      unreadCount,
    })
  } catch (error) {
    console.error("Failed to fetch notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}
