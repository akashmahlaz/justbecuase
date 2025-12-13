import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getMyNotifications } from "@/lib/actions"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { VolunteerSidebar } from "@/components/dashboard/volunteer-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkAllReadButton, MarkAsReadButton } from "@/components/notifications/notification-actions"
import Link from "next/link"
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  MessageSquare,
  FileCheck,
  UserCheck,
  Clock,
  Settings,
} from "lucide-react"

export default async function VolunteerNotificationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const notifications = await getMyNotifications()

  const unreadNotifications = notifications.filter((n) => !n.isRead)
  const readNotifications = notifications.filter((n) => n.isRead)

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userType="volunteer"
        userName={session.user.name || "Volunteer"}
        userAvatar={session.user.image || undefined}
      />

      <div className="flex">
        <VolunteerSidebar />

        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Notifications</h1>
              <p className="text-muted-foreground">
                Stay updated on your applications and messages
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && <MarkAllReadButton />}
              <Button variant="outline" asChild>
                <Link href="/volunteer/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Notification Settings
                </Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                All
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadNotifications.length > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <NotificationsList notifications={notifications} />
            </TabsContent>

            <TabsContent value="unread">
              <NotificationsList notifications={unreadNotifications} />
            </TabsContent>

            <TabsContent value="read">
              <NotificationsList notifications={readNotifications} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}

function NotificationsList({ notifications }: { notifications: any[] }) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;re all caught up!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationCard key={notification._id?.toString()} notification={notification} />
      ))}
    </div>
  )
}

function NotificationCard({ notification }: { notification: any }) {
  const getIcon = () => {
    switch (notification.type) {
      case "application_status":
        return <FileCheck className="h-5 w-5" />
      case "message":
        return <MessageSquare className="h-5 w-5" />
      case "profile_view":
        return <UserCheck className="h-5 w-5" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getBackgroundColor = () => {
    if (!notification.isRead) {
      return "bg-primary/5 border-primary/20"
    }
    return ""
  }

  return (
    <Card className={`${getBackgroundColor()} hover:shadow-sm transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              notification.isRead ? "bg-muted" : "bg-primary/10"
            }`}
          >
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-foreground">
                {notification.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(notification.createdAt).toLocaleDateString()}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>
            {notification.actionUrl && (
              <Button variant="link" size="sm" className="px-0 mt-2" asChild>
                <Link href={notification.actionUrl}>View Details</Link>
              </Button>
            )}
          </div>
          {!notification.isRead && (
            <div className="w-2 h-2 rounded-full bg-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
