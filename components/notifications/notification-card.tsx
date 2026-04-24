"use client"

import { useState } from "react"
import LocaleLink from "@/components/locale-link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  MessageSquare,
  UserCheck,
  Users,
  Zap,
  Star,
  Gift,
  Briefcase,
  Heart,
  MoreVertical,
  Check,
  Trash2,
  ExternalLink,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { markNotificationRead, deleteNotification } from "@/lib/actions"
import { toast } from "sonner"
import { useDictionary } from "@/components/dictionary-provider"
import { useLocale } from "@/hooks/use-locale"
import type { NotificationType, Notification } from "@/lib/types"

interface NotificationAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "outline" | "ghost" | "destructive"
}

// Re-export for convenience - uses the official Notification type
export type NotificationData = Notification

interface NotificationCardProps {
  notification: NotificationData
  onMarkRead?: () => void
  onDelete?: () => void
  showActions?: boolean
}

// Format relative time
function formatRelativeTime(date: Date | string, dict?: any, locale?: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return dict?.volunteer?.notifications?.justNow || "just now"
  if (diffMin < 60) return (dict?.volunteer?.notifications?.minutesAgo || "{n}m ago").replace("{n}", String(diffMin))
  if (diffHour < 24) return (dict?.volunteer?.notifications?.hoursAgo || "{n}h ago").replace("{n}", String(diffHour))
  if (diffDay < 7) return (dict?.volunteer?.notifications?.daysAgo || "{n}d ago").replace("{n}", String(diffDay))
  if (diffWeek < 4) return (dict?.volunteer?.notifications?.weeksAgo || "{n}w ago").replace("{n}", String(diffWeek))
  if (diffMonth < 12) return (dict?.volunteer?.notifications?.monthsAgo || "{n}mo ago").replace("{n}", String(diffMonth))
  return then.toLocaleDateString(locale)
}

// Default config for fallback
const defaultConfig = {
  icon: <Info className="h-5 w-5" />,
  iconBg: "bg-blue-100 dark:bg-blue-900/30",
  iconColor: "text-blue-600 dark:text-blue-400",
}

// Get icon and styling based on notification type
function getNotificationConfig(type: NotificationType) {
  const configs: Record<string, {
    icon: React.ReactNode
    iconBg: string
    iconColor: string
    badgeText?: string
    badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  }> = {
    // Application related
    application_accepted: {
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      badgeText: "Accepted",
      badgeVariant: "default",
    },
    application_rejected: {
      icon: <AlertCircle className="h-5 w-5" />,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      badgeText: "Rejected",
      badgeVariant: "destructive",
    },
    new_application: {
      icon: <Users className="h-5 w-5" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      badgeText: "New",
      badgeVariant: "default",
    },
    application_limit_warning: {
      icon: <AlertTriangle className="h-5 w-5" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      badgeText: "Warning",
      badgeVariant: "outline",
    },
    application_limit_reached: {
      icon: <AlertCircle className="h-5 w-5" />,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      badgeText: "Limit",
      badgeVariant: "destructive",
    },
    // Message related
    new_message: {
      icon: <MessageSquare className="h-5 w-5" />,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      badgeText: "New",
      badgeVariant: "default",
    },
    // Profile related
    profile_viewed: {
      icon: <Eye className="h-5 w-5" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    profile_unlocked: {
      icon: <UserCheck className="h-5 w-5" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      badgeText: "Unlocked",
      badgeVariant: "default",
    },
    // Subscription related
    subscription_activated: {
      icon: <Zap className="h-5 w-5" />,
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      badgeText: "Pro",
      badgeVariant: "default",
    },
    subscription_expiring: {
      icon: <AlertTriangle className="h-5 w-5" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      badgeText: "Expiring",
      badgeVariant: "outline",
    },
    subscription_expired: {
      icon: <AlertCircle className="h-5 w-5" />,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      badgeText: "Expired",
      badgeVariant: "destructive",
    },
    // Project related
    project_match: {
      icon: <Star className="h-5 w-5" />,
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      badgeText: "Match",
      badgeVariant: "default",
    },
    project_status_change: {
      icon: <Briefcase className="h-5 w-5" />,
      iconBg: "bg-sky-100 dark:bg-sky-900/30",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    followed_ngo_project: {
      icon: <Briefcase className="h-5 w-5" />,
      iconBg: "bg-sky-100 dark:bg-sky-900/30",
      iconColor: "text-sky-600 dark:text-sky-400",
      badgeText: "New",
      badgeVariant: "default",
    },
    // Social related
    new_follower: {
      icon: <Users className="h-5 w-5" />,
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    new_endorsement: {
      icon: <Heart className="h-5 w-5" />,
      iconBg: "bg-pink-100 dark:bg-pink-900/30",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    new_review: {
      icon: <Star className="h-5 w-5" />,
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    // Achievement related
    badge_earned: {
      icon: <Gift className="h-5 w-5" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      badgeText: "Badge",
      badgeVariant: "default",
    },
    milestone: {
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      badgeText: "Milestone",
      badgeVariant: "default",
    },
    // Referral related
    referral_signup: {
      icon: <Users className="h-5 w-5" />,
      iconBg: "bg-teal-100 dark:bg-teal-900/30",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    referral_completed: {
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      badgeText: "Completed",
      badgeVariant: "default",
    },
    // System
    system: {
      icon: <Info className="h-5 w-5" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
  }

  return configs[type] || defaultConfig
}

// Get contextual actions based on notification type
function getNotificationActions(notification: NotificationData, dict?: any): NotificationAction[] {
  const actions: NotificationAction[] = []
  const { type, link } = notification
  const primaryLink = link

  switch (type) {
    case "new_application":
      actions.push({ label: dict?.volunteer?.notifications?.actionReviewApp || "Review Application", href: primaryLink || `/ngo/applications` })
      break
    case "application_accepted":
      actions.push({ label: dict?.volunteer?.notifications?.actionViewProject || "View Project", href: primaryLink || `/volunteer/applications` })
      break
    case "application_rejected":
      actions.push({ label: dict?.volunteer?.common?.browseOpportunities || "Browse Opportunities", href: "/volunteer/opportunities", variant: "outline" })
      break
    case "new_message":
      actions.push({ label: dict?.volunteer?.notifications?.actionOpenChat || "Open Chat", href: primaryLink || "/messages" })
      break
    case "profile_viewed":
    case "profile_unlocked":
      if (primaryLink) {
        actions.push({ label: dict?.volunteer?.notifications?.actionViewProfile || "View Profile", href: primaryLink })
      }
      break
    case "subscription_activated":
      actions.push({ label: dict?.volunteer?.notifications?.actionViewBenefits || "View Benefits", href: "/pricing" })
      break
    case "project_match":
    case "followed_ngo_project":
      if (primaryLink) {
        actions.push({ label: dict?.volunteer?.notifications?.actionViewOpportunity || "View Opportunity", href: primaryLink })
      }
      actions.push({ label: dict?.volunteer?.notifications?.actionBrowseAll || "Browse All", href: "/volunteer/opportunities", variant: "outline" })
      break
    case "new_follower":
      if (primaryLink) {
        actions.push({ label: dict?.volunteer?.notifications?.actionViewProfile || "View Profile", href: primaryLink })
      }
      break
    case "new_review":
    case "new_endorsement":
      actions.push({ label: dict?.volunteer?.notifications?.actionView || "View", href: primaryLink || "/volunteer/profile" })
      break
    case "badge_earned":
    case "milestone":
      actions.push({ label: dict?.volunteer?.notifications?.actionViewAchievement || "View Achievement", href: primaryLink || "/volunteer/dashboard" })
      break
    case "application_limit_warning":
    case "application_limit_reached":
      actions.push({ label: dict?.volunteer?.notifications?.actionUpgrade || "Upgrade", href: "/pricing" })
      break
    case "subscription_expiring":
      actions.push({ label: "Renew Now", href: "/pricing" })
      break
    case "subscription_expired":
      actions.push({ label: "Resubscribe", href: "/pricing", variant: "destructive" })
      break
    default:
      if (primaryLink) {
        actions.push({ label: dict?.volunteer?.common?.viewDetails || "View Details", href: primaryLink })
      }
  }

  return actions
}

export function NotificationCard({ 
  notification, 
  onMarkRead, 
  onDelete,
  showActions = true 
}: NotificationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const dict = useDictionary()
  const locale = useLocale()
  const config = getNotificationConfig(notification.type)
  const actions = getNotificationActions(notification, dict)
  const notificationId = notification._id?.toString() || ""
  const primaryLink = notification.link

  const handleMarkAsRead = async () => {
    if (notification.isRead) return
    setIsLoading(true)
    try {
      await markNotificationRead(notificationId)
      onMarkRead?.()
      toast.success(dict.volunteer?.notifications?.markedAsRead || "Marked as read")
    } catch (error) {
      toast.error(dict.volunteer?.notifications?.failedMarkRead || "Failed to mark as read")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteNotification(notificationId)
      onDelete?.()
      toast.success(dict.volunteer?.notifications?.deleted || "Notification deleted")
    } catch (error) {
      toast.error(dict.volunteer?.notifications?.failedDelete || "Failed to delete notification")
    } finally {
      setIsLoading(false)
    }
  }

  const cardContent = (
    <Card 
      className={cn(
        "group transition-all hover:shadow-md",
        !notification.isRead && "bg-primary/[0.02] border-primary/20 dark:bg-primary/[0.05]",
        primaryLink && "cursor-pointer hover:border-primary/40"
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center shadow-sm",
              config.iconBg,
              config.iconColor
            )}>
              {config.icon}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground text-sm leading-tight">
                  {notification.title}
                </h4>
                {config.badgeText && !notification.isRead && (
                  <Badge variant={config.badgeVariant} className="text-xs h-5">
                    {config.badgeText}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(notification.createdAt, dict, locale)}
                </span>
                {!notification.isRead && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
            </div>

            {/* Message */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {notification.message}
            </p>

            {/* Action buttons */}
            {showActions && actions.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                {actions.slice(0, 2).map((action, idx) => (
                  action.href ? (
                    <Button 
                      key={idx} 
                      variant={action.variant || (idx === 0 ? "default" : "outline")} 
                      size="sm"
                      className="h-8 text-xs"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LocaleLink href={action.href}>
                        {action.label}
                        {idx === 0 && <ExternalLink className="h-3 w-3 ml-1.5" />}
                      </LocaleLink>
                    </Button>
                  ) : (
                    <Button
                      key={idx}
                      variant={action.variant || (idx === 0 ? "default" : "outline")}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick?.()
                      }}
                    >
                      {action.label}
                    </Button>
                  )
                ))}
              </div>
            )}
          </div>

          {/* More menu */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isLoading}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!notification.isRead && (
                  <DropdownMenuItem onClick={handleMarkAsRead} disabled={isLoading}>
                    <Check className="h-4 w-4 mr-2" />
                    {dict.volunteer?.notifications?.markAsRead || "Mark as read"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  disabled={isLoading}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {dict.volunteer?.common?.delete || "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // Wrap in Link if there's a primary action
  if (primaryLink && !showActions) {
    return (
      <LocaleLink href={primaryLink} className="block">
        {cardContent}
      </LocaleLink>
    )
  }

  return cardContent
}

// Empty state component
export function NotificationsEmpty() {
  const dict = useDictionary()
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Bell className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{dict.volunteer?.notifications?.allCaughtUp || "All caught up!"}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {dict.volunteer?.notifications?.emptyDesc || "You don't have any notifications right now. We'll let you know when something important happens."}
        </p>
      </CardContent>
    </Card>
  )
}

// Notifications list component
export function NotificationsList({ 
  notifications,
  onRefresh,
}: { 
  notifications: NotificationData[]
  onRefresh?: () => void
}) {
  if (notifications.length === 0) {
    return <NotificationsEmpty />
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationCard 
          key={notification._id?.toString()} 
          notification={notification}
          onMarkRead={onRefresh}
          onDelete={onRefresh}
        />
      ))}
    </div>
  )
}
