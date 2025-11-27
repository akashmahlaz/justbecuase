"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Users,
  Building2,
  Settings,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const sidebarLinks = [
  { href: "/ngo/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ngo/post-project", label: "Post New Project", icon: PlusCircle },
  { href: "/ngo/projects", label: "My Projects", icon: FolderKanban },
  { href: "/ngo/applications", label: "Applications", icon: Users, badge: 8 },
  { href: "/ngo/volunteers", label: "Find Volunteers", icon: Users },
  { href: "/ngo/messages", label: "Messages", icon: MessageSquare, badge: 3 },
  { href: "/ngo/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ngo/profile", label: "Organization", icon: Building2 },
  { href: "/ngo/settings", label: "Settings", icon: Settings },
]

export function NGOSidebar() {
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
                  className="bg-secondary text-secondary-foreground text-xs h-5 min-w-5 flex items-center justify-center"
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
