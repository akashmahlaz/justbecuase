"use client"

import LocaleLink from "@/components/locale-link"
import { usePathname } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import {
  Target,
  TrendingUp,
  Mail,
  Activity,
  Building2,
  Users,
  Megaphone,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
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
    label: "TheirStack Plays",
    items: [
      { title: "Enterprise Prospecting", href: "/admin/marketing/prospecting", icon: Target },
      { title: "Skills Demand", href: "/admin/marketing/skills-demand", icon: TrendingUp },
      { title: "Outreach Generator", href: "/admin/marketing/outreach", icon: Mail },
      { title: "Hiring Pulse", href: "/admin/marketing/hiring-pulse", icon: Activity },
      { title: "Enterprise Enrichment", href: "/admin/marketing/enrichment", icon: Building2 },
      { title: "Volunteer Match", href: "/admin/marketing/volunteer-match", icon: Users },
    ],
  },
]

export function MarketingSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const locale = useLocale()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <LocaleLink href="/admin/marketing/prospecting">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <Megaphone className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Marketing Intel</span>
                  <span className="truncate text-xs text-muted-foreground">TheirStack</span>
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
                  const isActive = pathname === localePath(item.href, locale)
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

      <SidebarRail />
    </Sidebar>
  )
}
