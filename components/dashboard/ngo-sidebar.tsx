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
  BarChart3,
  Bell,
  Search,
  CreditCard,
  Sparkles,
  LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SidebarLink {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
  highlight?: boolean
}

const sidebarLinks: SidebarLink[] = [
  { href: "/ngo/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ngo/post-project", label: "Post Project", icon: PlusCircle },
  { href: "/ngo/projects", label: "My Projects", icon: FolderKanban },
  { href: "/ngo/applications", label: "Applications", icon: Users },
  { href: "/ngo/find-talent", label: "Find Talent", icon: Search },
  { href: "/ngo/notifications", label: "Notifications", icon: Bell },
  { href: "/ngo/profile", label: "Organization", icon: Building2 },
  { href: "/ngo/settings?tab=billing", label: "Billing", icon: CreditCard },
  { href: "/pricing", label: "Upgrade Plan", icon: Sparkles, highlight: true },
  { href: "/ngo/settings", label: "Settings", icon: Settings },
]

export function NGOSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-sidebar min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href || (link.href.includes('?') && pathname === link.href.split('?')[0])
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : link.highlight
                    ? "text-primary hover:bg-primary/10"
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
