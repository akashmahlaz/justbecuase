"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useNotificationStore } from "@/lib/store"
import { useBrowserNotification, useNotificationPermission } from "@/components/store-provider"
import { Button } from "@/components/ui/button"
import { Bell, BellRing } from "lucide-react"
import { toast } from "sonner"

interface NotificationListenerProps {
  userId?: string
  userType?: "volunteer" | "ngo"
  pollInterval?: number // in milliseconds
}

export function NotificationListener({ 
  userId, 
  userType = "volunteer",
  pollInterval = 10000 // 10 seconds for faster real-time feel
}: NotificationListenerProps) {
  const router = useRouter()
  const { sendNotification, hasPermission } = useBrowserNotification()
  const { requestPermission } = useNotificationPermission()
  const { setUnreadCount, setNotifications, notifications, unreadCount } = useNotificationStore()
  const lastNotificationId = useRef<string | null>(null)
  const isFirstLoad = useRef(true)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/user/notifications')
      if (!response.ok) return

      const data = await response.json()
      const newNotifications = data.notifications || []
      
      // Update store
      setNotifications(newNotifications)
      setUnreadCount(newNotifications.filter((n: { isRead: boolean }) => !n.isRead).length)

      // Check for new notifications (not on first load)
      if (!isFirstLoad.current && newNotifications.length > 0) {
        const latestNotification = newNotifications[0]
        
        // If there's a new notification we haven't seen
        if (latestNotification.id !== lastNotificationId.current && !latestNotification.isRead) {
          // Get the notification URL - use link from notification or fallback to type-based URL
          const notificationUrl = latestNotification.link || getNotificationUrl(latestNotification.type, userType)
          
          // Send browser notification with click action
          if (hasPermission) {
            sendNotification(latestNotification.title, {
              body: latestNotification.message,
              tag: latestNotification.id,
              data: { url: notificationUrl },
            })
          }
          
          // Show toast with click action
          toast(latestNotification.title, {
            description: latestNotification.message,
            action: notificationUrl ? {
              label: "View",
              onClick: () => router.push(notificationUrl),
            } : undefined,
            duration: 5000,
          })
        }
      }

      // Update last seen notification
      if (newNotifications.length > 0) {
        lastNotificationId.current = newNotifications[0].id
      }
      
      isFirstLoad.current = false
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [userId, userType, hasPermission, sendNotification, setNotifications, setUnreadCount, router])

  // Poll for notifications with stable interval
  useEffect(() => {
    if (!userId) return

    // Initial fetch
    fetchNotifications()

    // Set up polling
    const interval = setInterval(fetchNotifications, pollInterval)

    return () => clearInterval(interval)
  }, [userId, pollInterval, fetchNotifications])

  return null
}

// Helper to get the URL for a notification type
function getNotificationUrl(type: string, userType: "volunteer" | "ngo"): string {
  const basePath = userType === "ngo" ? "/ngo" : "/volunteer"
  
  switch (type) {
    case 'application_status':
    case 'application_accepted':
    case 'application_rejected':
      return `${basePath}/applications`
    case 'new_application':
      return '/ngo/projects'
    case 'message':
    case 'new_message':
      return `${basePath}/messages`
    case 'profile_viewed':
    case 'profile_unlocked':
      return `${basePath}/profile`
    case 'project_match':
      return `${basePath}/opportunities`
    default:
      return `${basePath}/notifications`
  }
}

// Permission request button component
export function NotificationPermissionButton() {
  const { requestPermission } = useNotificationPermission()
  const hasPermission = useNotificationStore((state) => state.hasPermission)

  if (hasPermission) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellRing className="h-4 w-4 text-green-500" />
        <span>Browser notifications enabled</span>
      </div>
    )
  }

  const handleRequest = async () => {
    const granted = await requestPermission()
    if (granted) {
      toast.success("Notifications enabled!", {
        description: "You'll receive browser notifications for important updates."
      })
    } else {
      toast.error("Permission denied", {
        description: "You can enable notifications in your browser settings."
      })
    }
  }

  return (
    <Button variant="outline" onClick={handleRequest}>
      <Bell className="h-4 w-4 mr-2" />
      Enable Browser Notifications
    </Button>
  )
}

// Badge showing unread count
export function NotificationBadge() {
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  if (unreadCount === 0) return null

  return (
    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}
