"use client"

import { useEffect, useCallback, useRef } from "react"
import { useNotificationStore } from "@/lib/store"
import { useBrowserNotification, useNotificationPermission } from "@/components/store-provider"
import { Button } from "@/components/ui/button"
import { Bell, BellRing } from "lucide-react"
import { toast } from "sonner"

interface NotificationListenerProps {
  userId?: string
  pollInterval?: number // in milliseconds
}

export function NotificationListener({ 
  userId, 
  pollInterval = 30000 // 30 seconds default
}: NotificationListenerProps) {
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
          // Send browser notification
          if (hasPermission) {
            sendNotification(latestNotification.title, {
              body: latestNotification.message,
              tag: latestNotification.id,
              data: { url: getNotificationUrl(latestNotification.type) },
            })
          }
          
          // Show toast as well
          toast(latestNotification.title, {
            description: latestNotification.message,
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
  }, [userId, hasPermission, sendNotification, setNotifications, setUnreadCount])

  // Poll for notifications
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
function getNotificationUrl(type: string): string {
  switch (type) {
    case 'application_status':
      return '/volunteer/applications'
    case 'new_application':
      return '/ngo/projects'
    case 'message':
      return '/volunteer/messages'
    case 'profile_viewed':
      return '/volunteer/profile'
    default:
      return '/volunteer/notifications'
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
