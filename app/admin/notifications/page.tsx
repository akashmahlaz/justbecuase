"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Bell,
  Send,
  Users,
  Building2,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react"

type NotificationType = "system" | "new_application" | "application_accepted" | "application_rejected" | "profile_viewed" | "profile_unlocked" | "project_match"

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [userType, setUserType] = useState<string>("all")
  const [notificationType, setNotificationType] = useState<NotificationType>("system")
  const [link, setLink] = useState("")
  const [specificUserIds, setSpecificUserIds] = useState("")
  const [sending, setSending] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required")
      return
    }

    if (userType === "specific" && !specificUserIds.trim()) {
      toast.error("Please enter user IDs for specific targeting")
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          userType,
          type: notificationType,
          link: link.trim() || undefined,
          userIds: userType === "specific" 
            ? specificUserIds.split(",").map(id => id.trim()).filter(Boolean)
            : undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Successfully sent ${data.count} notifications`)
        setTitle("")
        setMessage("")
        setLink("")
        setSpecificUserIds("")
        loadRecentNotifications()
      } else {
        toast.error(data.error || "Failed to send notifications")
      }
    } catch (error) {
      toast.error("Failed to send notifications")
    } finally {
      setSending(false)
    }
  }

  const loadRecentNotifications = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch("/api/admin/notifications?limit=10")
      const data = await response.json()
      if (response.ok) {
        setRecentNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Send Notifications</h1>
        <p className="text-muted-foreground">
          Send notifications to users, volunteers, or NGOs
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Send Notification Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              New Notification
            </CardTitle>
            <CardDescription>
              Compose and send a notification to selected users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Audience */}
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      All Users
                    </div>
                  </SelectItem>
                  <SelectItem value="volunteers">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      All Volunteers
                    </div>
                  </SelectItem>
                  <SelectItem value="ngos">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      All NGOs
                    </div>
                  </SelectItem>
                  <SelectItem value="specific">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Specific Users
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userType === "specific" && (
              <div className="space-y-2">
                <Label>User IDs (comma-separated)</Label>
                <Input
                  placeholder="user-id-1, user-id-2, ..."
                  value={specificUserIds}
                  onChange={(e) => setSpecificUserIds(e.target.value)}
                />
              </div>
            )}

            {/* Notification Type */}
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select value={notificationType} onValueChange={(v) => setNotificationType(v as NotificationType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Announcement</SelectItem>
                  <SelectItem value="new_application">New Application</SelectItem>
                  <SelectItem value="application_accepted">Application Accepted</SelectItem>
                  <SelectItem value="application_rejected">Application Rejected</SelectItem>
                  <SelectItem value="profile_viewed">Profile Viewed</SelectItem>
                  <SelectItem value="profile_unlocked">Profile Unlocked</SelectItem>
                  <SelectItem value="project_match">Project Match</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Notification title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                placeholder="Write your notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/500
              </p>
            </div>

            {/* Link (optional) */}
            <div className="space-y-2">
              <Label>Link (optional)</Label>
              <Input
                placeholder="/volunteer/dashboard or https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Users will be redirected to this link when they click the notification
              </p>
            </div>

            {/* Preview */}
            {(title || message) && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{title || "Notification Title"}</p>
                    <p className="text-sm text-muted-foreground">
                      {message || "Your message will appear here..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Send Button */}
            <Button 
              onClick={handleSend} 
              disabled={sending || !title.trim() || !message.trim()}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>
                  Recently sent notifications
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadRecentNotifications}
                disabled={loadingHistory}
              >
                {loadingHistory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent notifications</p>
                <Button 
                  variant="link" 
                  onClick={loadRecentNotifications}
                  className="mt-2"
                >
                  Load notifications
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentNotifications.map((notification: any) => (
                  <div 
                    key={notification._id?.toString() || notification.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.isRead ? "bg-muted" : "bg-primary/10"
                      }`}>
                        {notification.type === "system" ? (
                          <Info className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {notification.isRead ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
