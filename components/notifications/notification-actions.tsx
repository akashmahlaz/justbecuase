"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions"
import { toast } from "sonner"
import { Check, CheckCheck, Loader2 } from "lucide-react"

export function MarkAllReadButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleMarkAllRead = async () => {
    setIsLoading(true)
    try {
      const success = await markAllNotificationsRead()
      if (success) {
        toast.success("All notifications marked as read")
        router.refresh()
      } else {
        toast.error("Failed to mark notifications as read")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkAllRead}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <CheckCheck className="h-4 w-4 mr-2" />
      )}
      Mark all as read
    </Button>
  )
}

export function MarkAsReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleMarkRead = async () => {
    setIsLoading(true)
    try {
      const success = await markNotificationRead(notificationId)
      if (success) {
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to mark as read:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleMarkRead}
      disabled={isLoading}
      className="h-8 w-8 p-0"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
    </Button>
  )
}
