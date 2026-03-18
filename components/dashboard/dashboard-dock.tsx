"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
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

const DOCK_SEEN_KEY = "dock-guide-seen"

const volunteerItems = [
  { label: "Dashboard", href: "/volunteer/dashboard", icon: LayoutDashboard },
  { label: "Opportunities", href: "/volunteer/opportunities", icon: Search },
  { label: "Applications", href: "/volunteer/applications", icon: ClipboardList },
  { label: "Messages", href: "/volunteer/messages", icon: MessageSquare },
  { label: "Profile", href: "/volunteer/profile", icon: User },
]

const ngoItems = [
  { label: "Dashboard", href: "/ngo/dashboard", icon: LayoutDashboard },
  { label: "Post", href: "/ngo/post-project", icon: FileText },
  { label: "Applications", href: "/ngo/applications", icon: ClipboardList },
  { label: "Messages", href: "/ngo/messages", icon: MessageSquare },
  { label: "Organization", href: "/ngo/profile", icon: Building2 },
]

export function DashboardDock({ userType }: DashboardDockProps) {
  const pathname = usePathname()
  const items = userType === "volunteer" ? volunteerItems : ngoItems

  const [open, setOpen] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)

  // Check localStorage for first-time guide
  useEffect(() => {
    try {
      if (!localStorage.getItem(DOCK_SEEN_KEY)) {
        setIsFirstTime(true)
      }
    } catch {}
  }, [])

  // Mark guide as seen when dock is opened for the first time
  const markSeen = useCallback(() => {
    if (isFirstTime) {
      setIsFirstTime(false)
      try {
        localStorage.setItem(DOCK_SEEN_KEY, "1")
      } catch {}
    }
  }, [isFirstTime])

  // Listen for "D" key on desktop
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs, textareas, contenteditable, or select
      const tag = (e.target as HTMLElement)?.tagName
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }
      // Ignore if modifier keys held
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === "d" || e.key === "D") {
        e.preventDefault()
        setOpen((prev) => {
          if (!prev) markSeen()
          return !prev
        })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [markSeen])

  return (
    <>
      {/* ── Mobile: always-visible icon dock ── */}
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

      {/* ── Desktop: toggle with D key ── */}
      <div className="hidden md:block">
        {/* Dock panel — slides up/down */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full border border-border/50 bg-background/70 backdrop-blur-xl shadow-2xl shadow-black/10 px-2 py-1.5"
            >
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

              {/* Close hint inside dock */}
              <span className="ml-1 mr-1 flex items-center gap-1 text-[10px] text-muted-foreground/60 select-none">
                <kbd className="inline-flex items-center justify-center rounded border border-border/60 bg-muted/50 px-1 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                  D
                </kbd>
                <span>close</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint pill — visible when dock is closed */}
        <AnimatePresence>
          {!open && (
            <motion.button
              type="button"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={() => {
                setOpen(true)
                markSeen()
              }}
              className={cn(
                "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border backdrop-blur-md transition-all duration-300 cursor-pointer select-none",
                isFirstTime
                  ? "border-primary/30 bg-primary/5 px-4 py-2 shadow-lg shadow-primary/10 animate-pulse"
                  : "border-border/40 bg-background/60 px-3 py-1.5 shadow-md hover:bg-background/80"
              )}
            >
              <kbd className="inline-flex items-center justify-center rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] leading-none text-muted-foreground">
                D
              </kbd>
              <span
                className={cn(
                  "font-medium",
                  isFirstTime ? "text-xs text-foreground" : "text-[11px] text-muted-foreground"
                )}
              >
                {isFirstTime ? "Press D to open dock" : "Dock"}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
