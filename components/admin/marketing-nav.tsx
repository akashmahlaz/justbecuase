"use client"

import LocaleLink from "@/components/locale-link"
import { usePathname } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { cn } from "@/lib/utils"
import {
  Target,
  TrendingUp,
  Mail,
  Activity,
  Building2,
  Users,
  ArrowLeft,
} from "lucide-react"

const plays = [
  { title: "Enterprise Prospecting", href: "/admin/marketing/prospecting", icon: Target },
  { title: "Skills Demand", href: "/admin/marketing/skills-demand", icon: TrendingUp },
  { title: "Outreach Generator", href: "/admin/marketing/outreach", icon: Mail },
  { title: "Hiring Pulse", href: "/admin/marketing/hiring-pulse", icon: Activity },
  { title: "Enterprise Enrichment", href: "/admin/marketing/enrichment", icon: Building2 },
  { title: "Volunteer Match", href: "/admin/marketing/volunteer-match", icon: Users },
]

export function MarketingNav() {
  const pathname = usePathname()
  const locale = useLocale()

  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-4 px-2">
        <LocaleLink
          href="/admin/dashboard"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="size-3" />
          Admin
        </LocaleLink>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {plays.map((play) => {
            const isActive = pathname === localePath(play.href, locale)
            return (
              <LocaleLink
                key={play.href}
                href={play.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <play.icon className="size-3.5" />
                {play.title}
              </LocaleLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
