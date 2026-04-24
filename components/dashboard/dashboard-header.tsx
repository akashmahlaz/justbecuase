"use client"

import LocaleLink from "@/components/locale-link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Menu, User, Settings, LogOut } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UnifiedSearchBar } from "@/components/unified-search-bar"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"
import { useNotificationStore } from "@/lib/store"
import { MessageNotificationBadge } from "@/components/messages/message-notification-badge"
import { signOut } from "@/lib/auth-client"

interface DashboardHeaderProps {
  userType: "volunteer" | "ngo"
  userName: string
  userAvatar?: string
}

export function DashboardHeader({ userType, userName, userAvatar }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const router = useRouter()
  const locale = useLocale()

  const mobileLinks =
    userType === "volunteer"
      ? [
          { href: "/volunteer/dashboard", label: "Dashboard" },
          { href: "/projects", label: "Browse Jobs" },
          { href: "/volunteer/applications", label: "My Applications" },
          { href: "/volunteer/opportunities", label: "Opportunities" },
          { href: "/volunteer/profile", label: "My Profile" },
        ]
      : [
          { href: "/ngo/dashboard", label: "Dashboard" },
          { href: "/ngo/projects", label: "My Requirements" },
          { href: "/ngo/post-project", label: "Post Requirement" },
          { href: "/ngo/applications", label: "Applications" },
          { href: "/ngo/profile", label: "Organization Profile" },
        ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-background">
              <div className="flex items-center gap-2 mb-8">
                <Image src="/logo-main.png" alt="JBC Logo" width={160} height={78} className="h-10 w-auto" />
              </div>
              <nav className="flex flex-col gap-2">
                {mobileLinks.map((link) => (
                  <LocaleLink
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </LocaleLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <LocaleLink href="/" className="flex items-center gap-2">
            <Image src="/logo-main.png" alt="JBC Logo" width={200} height={98} className="h-14 w-auto" />
          </LocaleLink>
        </div>

        {/* Search - Desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <UnifiedSearchBar
            variant="compact"
            placeholder={userType === "volunteer" 
              ? "Search jobs or Enterprises..." 
              : "Search candidates, skills, or projects..."}
            allowedTypes={userType === "volunteer" 
              ? ["opportunity", "ngo"] 
              : ["volunteer", "opportunity"]}
            className="w-full"
            onSubmit={(query) => {
              const target = userType === "volunteer"
                ? `/projects?q=${encodeURIComponent(query)}`
                : `/ngo/find-talent?q=${encodeURIComponent(query)}`
              router.push(localePath(target, locale))
            }}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Message Notifications */}
          <MessageNotificationBadge userType={userType} />
          
          {/* Bell Notifications */}
          <LocaleLink href={userType === "volunteer" ? "/volunteer/notifications" : "/ngo/notifications"}>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </LocaleLink>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <img
                  src={userAvatar || `/placeholder.svg?height=32&width=32&query=professional person avatar`}
                  alt={userName}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <span className="hidden sm:inline font-medium">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <LocaleLink href={userType === "volunteer" ? "/volunteer/profile" : "/ngo/profile"}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </LocaleLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <LocaleLink href={userType === "volunteer" ? "/volunteer/settings" : "/ngo/settings"}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </LocaleLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut()
                  window.location.href = localePath("/auth/signin", locale)
                }}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
