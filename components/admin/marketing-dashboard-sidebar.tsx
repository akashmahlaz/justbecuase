"use client"

import LocaleLink from "@/components/locale-link"
import { usePathname } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  Mail,
  Activity,
  Building2,
  Users,
  Megaphone,
  ArrowLeft,
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/marketing/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "NGO Prospecting", href: "/marketing/prospecting", icon: Target },
      { title: "Skills Demand", href: "/marketing/skills-demand", icon: TrendingUp },
      { title: "Hiring Pulse", href: "/marketing/hiring-pulse", icon: Activity },
    ],
  },
  {
    label: "Outreach",
    items: [
      { title: "Outreach Generator", href: "/marketing/outreach", icon: Mail },
      { title: "NGO Enrichment", href: "/marketing/enrichment", icon: Building2 },
      { title: "Volunteer Match", href: "/marketing/volunteer-match", icon: Users },
    ],
  },
]

export function MarketingDashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const locale = useLocale()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <LocaleLink href="/marketing/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <Megaphone className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Marketing Intel</span>
                  <span className="truncate text-xs text-muted-foreground">Growth & Prospecting</span>
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
                  const isActive = pathname.startsWith(localePath(item.href, locale))
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to Admin">
              <LocaleLink href="/admin/dashboard" className="text-muted-foreground">
                <ArrowLeft />
                <span>Back to Admin</span>
              </LocaleLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
