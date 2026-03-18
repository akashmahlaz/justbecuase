"use client"

import LocaleLink from "@/components/locale-link"
import { usePathname } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { useDictionary } from "@/components/dictionary-provider"
import { useMemo, useCallback, useEffect, useState } from "react"
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Users,
  Building2,
  Settings,
  Bell,
  Search,
  CreditCard,
  Sparkles,
  MessageSquare,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const SIDEBAR_HINT_KEY = "sidebar-hint-seen"
const DOCK_HINT_KEY = "dock-guide-seen"

function SidebarShortcutHints() {
  const { toggleSidebar, open } = useSidebar()
  const [isFirstTime, setIsFirstTime] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(SIDEBAR_HINT_KEY)) setIsFirstTime(true)
    } catch {}
  }, [])

  const markSeen = useCallback(() => {
    if (isFirstTime) {
      setIsFirstTime(false)
      try { localStorage.setItem(SIDEBAR_HINT_KEY, "1") } catch {}
    }
  }, [isFirstTime])

  if (!open) return null

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">Shortcuts</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { markSeen(); toggleSidebar() }}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors cursor-pointer select-none ${
            isFirstTime
              ? "bg-primary/10 text-primary border border-primary/20 animate-pulse"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          <kbd className="inline-flex items-center justify-center rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[10px] leading-none">S</kbd>
          <span>Sidebar</span>
        </button>
      </div>
    </div>
  )
}

export function NGOAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const locale = useLocale()
  const dict = useDictionary()
  const d = dict.dashboard || {} as any

  const navGroups = useMemo(() => [
    {
      label: d.main || "Main",
      items: [
        { title: d.dashboard || "Dashboard", href: "/ngo/dashboard", icon: LayoutDashboard },
        { title: d.postRequirement || "Post Requirement", href: "/ngo/post-project", icon: PlusCircle },
        { title: d.myRequirements || "My Requirements", href: "/ngo/projects", icon: FolderKanban },
        { title: d.applications || "Applications", href: "/ngo/applications", icon: Users },
        { title: d.findTalent || "Find Talent", href: "/ngo/find-talent", icon: Search },
        { title: d.messages || "Messages", href: "/ngo/messages", icon: MessageSquare },
      ],
    },
    {
      label: d.account || "Account",
      items: [
        { title: d.notifications || "Notifications", href: "/ngo/notifications", icon: Bell },
        { title: d.organization || "Organization", href: "/ngo/profile", icon: Building2 },
        { title: d.billing || "Billing", href: "/ngo/settings?tab=billing", icon: CreditCard },
        { title: d.upgradePlan || "Upgrade Plan", href: "/pricing", icon: Sparkles, highlight: true },
        { title: d.settings || "Settings", href: "/ngo/settings", icon: Settings },
      ],
    },
  ], [d])

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <LocaleLink href="/ngo/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{d.ngoDashboard || "NGO Dashboard"}</span>
                  <span className="truncate text-xs text-muted-foreground">{d.manageOrganization || "Manage your organization"}</span>
                </div>
              </LocaleLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === localePath(item.href, locale) ||
                    (item.href.includes("?") && pathname === localePath(item.href.split("?")[0], locale))
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={item.highlight && !isActive ? "text-primary" : undefined}
                      >
                        <LocaleLink href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </LocaleLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarShortcutHints />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
