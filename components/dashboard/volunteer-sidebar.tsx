"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Search, FolderKanban, CheckCircle2, User, Settings, Heart, MessageSquare, Bell, Sparkles, LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SidebarLink {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
}

const sidebarLinks: SidebarLink[] = [
  { href: "/volunteer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/volunteer/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/volunteer/applications", label: "Applications", icon: FolderKanban },
  { href: "/volunteer/messages", label: "Messages", icon: MessageSquare },
  { href: "/volunteer/notifications", label: "Notifications", icon: Bell },
  { href: "/volunteer/profile", label: "My Profile", icon: User },
  { href: "/volunteer/settings", label: "Settings", icon: Settings },
]

export function VolunteerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-sidebar min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <div className="flex items-center gap-3">
                <link.icon className="h-5 w-5" />
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <Badge
                  variant="secondary"
                  className="bg-primary text-primary-foreground text-xs h-5 min-w-5 flex items-center justify-center"
                >
                  {link.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
