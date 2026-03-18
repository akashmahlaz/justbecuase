"use client"

import { usePathname } from "next/navigation"
import { Dock, DockIcon } from "@/components/ui/dock"
import LocaleLink from "@/components/locale-link"
import {
  LayoutDashboard,
  Search,
  FileText,
  MessageSquare,
  User,
  Building2,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DashboardDockProps {
  userType: "volunteer" | "ngo"
}

const volunteerItems = [
  { label: "Dashboard", href: "/volunteer/dashboard", icon: LayoutDashboard },
  { label: "Opportunities", href: "/projects", icon: Search },
  { label: "Applications", href: "/volunteer/applications", icon: ClipboardList },
  { label: "Messages", href: "/volunteer/messages", icon: MessageSquare },
  { label: "Profile", href: "/volunteer/profile", icon: User },
]

const ngoItems = [
  { label: "Dashboard", href: "/ngo/dashboard", icon: LayoutDashboard },
  { label: "Post", href: "/ngo/post-requirement", icon: FileText },
  { label: "Applications", href: "/ngo/applications", icon: ClipboardList },
  { label: "Messages", href: "/ngo/messages", icon: MessageSquare },
  { label: "Organization", href: "/ngo/organization", icon: Building2 },
]

export function DashboardDock({ userType }: DashboardDockProps) {
  const pathname = usePathname()
  const items = userType === "volunteer" ? volunteerItems : ngoItems

  return (
    <>
      {/* ── Mobile: icon-only floating dock with magnification ── */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center md:hidden">
        <TooltipProvider delayDuration={0}>
          <Dock
            iconSize={36}
            iconMagnification={52}
            iconDistance={120}
            className="h-14 gap-1 rounded-2xl border-border/60 bg-background/80 shadow-lg"
          >
            {items.map((item) => {
              const isActive = pathname?.includes(item.href)
              return (
                <DockIcon key={item.href} className={cn(isActive && "bg-primary/10")}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <LocaleLink href={item.href} className="flex items-center justify-center size-full">
                        <item.icon
                          className={cn(
                            "size-5 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </LocaleLink>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8} className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </DockIcon>
              )
            })}
          </Dock>
        </TooltipProvider>
      </div>

      {/* ── Desktop: floating command bar with labels ── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-1 rounded-full border border-border/50 bg-background/70 backdrop-blur-xl shadow-2xl shadow-black/10 px-2 py-1.5">
        {items.map((item) => {
          const isActive = pathname?.includes(item.href)
          return (
            <LocaleLink
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </LocaleLink>
          )
        })}
      </div>
    </>
  )
}
