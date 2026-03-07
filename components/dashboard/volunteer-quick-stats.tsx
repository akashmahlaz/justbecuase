"use client"

import { useEffect, useState } from "react"
import { Clock, FolderKanban, Sparkles } from "lucide-react"
import LocaleLink from "@/components/locale-link"
import { useLocale, localePath } from "@/hooks/use-locale"

interface Stats {
  pending: number
  hoursContributed: number
  newMatches: number
}

export function VolunteerQuickStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const locale = useLocale()

  useEffect(() => {
    fetch("/api/volunteer/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
  }, [])

  const items = [
    {
      icon: FolderKanban,
      label: "Applications",
      value: stats?.pending ?? "—",
      sub: "pending",
      href: localePath("/volunteer/applications", locale),
      color: "text-amber-500",
    },
    {
      icon: Clock,
      label: "Hours",
      value: stats?.hoursContributed ?? "—",
      sub: "contributed",
      href: localePath("/volunteer/dashboard", locale),
      color: "text-emerald-500",
    },
    {
      icon: Sparkles,
      label: "Matches",
      value: stats?.newMatches ?? "—",
      sub: "for you",
      href: localePath("/volunteer/opportunities", locale),
      color: "text-violet-500",
    },
  ]

  return (
    <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
      {items.map((item) => (
        <LocaleLink
          key={item.label}
          href={item.href}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors group"
        >
          <item.icon className={`h-4 w-4 ${item.color} shrink-0`} />
          <span className="text-sm font-semibold tabular-nums">
            {stats ? item.value : <span className="animate-pulse">—</span>}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            {item.sub}
          </span>
        </LocaleLink>
      ))}
    </div>
  )
}
