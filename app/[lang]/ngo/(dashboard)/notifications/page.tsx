import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDictionary } from "@/app/[lang]/dictionaries"
import type { Locale } from "@/lib/i18n-config"
import { getNGOProfile, getMyNotifications } from "@/lib/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkAllReadButton } from "@/components/notifications/notification-actions"
import { 
  NotificationsList, 
  NotificationsEmpty 
} from "@/components/notifications/notification-card"
import Link from "next/link"
import { Settings, Bell } from "lucide-react"

export default async function NGONotificationsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang as Locale) as any

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Role verification: Ensure user is an NGO
  if (session.user.role !== "ngo") {
    if (session.user.role === "volunteer") {
      redirect("/volunteer/dashboard")
    } else if (session.user.role === "admin") {
      redirect("/admin")
    } else {
      redirect("/auth/role-select")
    }
  }

  // Redirect to onboarding if not completed
  if (!session.user.isOnboarded) {
    redirect("/ngo/onboarding")
  }

  const ngoProfile = await getNGOProfile()
  const notifications = await getMyNotifications()

  const unreadNotifications = notifications.filter((n) => !n.isRead)
  const readNotifications = notifications.filter((n) => n.isRead)

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{dict.ngo?.notifications?.title || "Notifications"}</h1>
              <p className="text-sm text-muted-foreground">
                {unreadNotifications.length > 0 
                  ? (dict.ngo?.notifications?.unreadCount || "{n} unread notification(s)").replace("{n}", String(unreadNotifications.length))
                  : dict.ngo?.notifications?.allCaughtUp || "You're all caught up!"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadNotifications.length > 0 && <MarkAllReadButton />}
            <Button variant="outline" size="sm" asChild>
              <Link href="/ngo/settings">
                <Settings className="h-4 w-4 mr-2" />
                {dict.ngo?.common?.settings || "Settings"}
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="all" className="relative">
              {dict.ngo?.common?.all || "All"}
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="relative">
              {dict.ngo?.notifications?.unread || "Unread"}
              {unreadNotifications.length > 0 && (
                <Badge className="ml-2 h-5 px-1.5 bg-primary text-primary-foreground">
                  {unreadNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">{dict.ngo?.notifications?.read || "Read"}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <NotificationsList notifications={notifications} />
          </TabsContent>

          <TabsContent value="unread" className="mt-6">
            {unreadNotifications.length === 0 ? (
              <NotificationsEmpty />
            ) : (
              <NotificationsList notifications={unreadNotifications} />
            )}
          </TabsContent>

          <TabsContent value="read" className="mt-6">
            {readNotifications.length === 0 ? (
              <NotificationsEmpty />
            ) : (
              <NotificationsList notifications={readNotifications} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
