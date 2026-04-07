"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Bell, Sun, Moon, Sparkles, CreditCard, Zap } from "lucide-react"
import Image from "next/image"
import { client } from "@/lib/auth-client" // Better Auth
import { useTheme } from "next-themes"
import { useSubscriptionStore, usePlatformSettingsStore } from "@/lib/store"
import LocaleLink from "@/components/locale-link"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useDictionary } from "@/components/dictionary-provider"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dict = useDictionary()

  const { data: session, isPending } = client.useSession()
  const user = session?.user
  
  // Get subscription status from store
  const ngoSubscription = useSubscriptionStore((state) => state.ngoSubscription)
  const volunteerSubscription = useSubscriptionStore((state) => state.volunteerSubscription)
  const setNGOSubscription = useSubscriptionStore((state) => state.setNGOSubscription)
  const setVolunteerSubscription = useSubscriptionStore((state) => state.setVolunteerSubscription)
  
  // Fetch subscription status when user logs in
  useEffect(() => {
    async function fetchSubscription() {
      if (!user) return
      
      try {
        const res = await fetch('/api/user/subscription')
        if (res.ok) {
          const data = await res.json()
          if (user.role === 'ngo' && data.ngoSubscription) {
            setNGOSubscription(data.ngoSubscription)
          } else if (user.role === 'volunteer' && data.volunteerSubscription) {
            setVolunteerSubscription(data.volunteerSubscription)
          }
        }
      } catch (e) {
        console.error('Failed to fetch subscription:', e)
      }
    }
    
    fetchSubscription()
  }, [user, setNGOSubscription, setVolunteerSubscription])
  
  // Get platform settings for branding
  const platformSettings = usePlatformSettingsStore((state) => state.settings)
  const platformName = platformSettings?.platformName || "JustBeCause Network"
  
  const isPro = user?.role === 'ngo' 
    ? ngoSubscription?.plan === 'pro' 
    : user?.role === 'volunteer' 
      ? volunteerSubscription?.plan === 'pro'
      : false

  const initials = user?.name?.[0]?.toUpperCase() || "U"

  // ⭐ Role-based nav
  const baseLinks = [
    { href: "/projects", label: dict.nav.browseOpportunities },
    { href: "/for-volunteers", label: dict.nav.forImpactAgents },
    { href: "/for-ngos", label: dict.nav.forNGOs },
    { href: "/about", label: dict.nav.aboutUs },
  ]

  const adminLinks = [{ href: "/admin", label: dict.nav?.adminPanel || "Admin Panel" }]
  const ngoLinks = [{ href: "/ngo/dashboard", label: dict.nav.myDashboard }]
  const volunteerLinks = [{ href: "/volunteer/dashboard", label: dict.nav.myDashboard }]

  const roleLinks =
    user?.role === "admin"
      ? adminLinks
      : user?.role === "ngo"
        ? ngoLinks
        : user?.role === "volunteer"
          ? volunteerLinks
          : []

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">

        {/* LOGO */}
        <LocaleLink href="/" className="flex items-center gap-2">
          <Image src="/logo-main.png" alt="JBC Logo" width={200} height={98} className="h-14 w-auto" priority />
        </LocaleLink>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-6">
          {[...baseLinks, ...roleLinks].map((link) => (
            <LocaleLink
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition ${pathname.endsWith(link.href) || pathname.includes(link.href + "/")
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {link.label}
            </LocaleLink>
          ))}
        </nav>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex items-center gap-3">

          {/* DARK MODE TOGGLE */}
          {/* <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button> */}

          {/* NOTIFICATIONS */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <LocaleLink href={user?.role === "ngo" ? "/ngo/notifications" : "/volunteer/notifications"}>
                    <Bell className="h-5 w-5" />
                  </LocaleLink>
                </Button>
              </DropdownMenuTrigger>
            </DropdownMenu>
          )}

          {/* LOADING */}
          {isPending && <div className="animate-pulse bg-muted h-8 w-8 rounded-full" />}

          {/* LOGGED OUT */}
          {!isPending && !user && (
            <>
              <LanguageSwitcher />
              <Button variant="ghost" asChild>
                <LocaleLink href="/auth/signin">{dict.common.signin}</LocaleLink>
              </Button>
              <Button asChild>
                <LocaleLink href="/auth/signup">{dict.common.getStarted}</LocaleLink>
              </Button>
            </>
          )}

          {/* USER AVATAR */}
          {!isPending && user && (
            <>
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none">
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user.image ?? ""} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <LocaleLink href={user?.role === "admin" ? "/admin" : user?.role === "ngo" ? "/ngo/dashboard" : "/volunteer/dashboard"}>{dict.nav.myDashboard}</LocaleLink>
                </DropdownMenuItem>

                {user?.role === "ngo" && (
                  <>
                    <DropdownMenuItem asChild>
                      <LocaleLink href="/ngo/settings?tab=billing" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {dict.nav?.billingPayments || "Billing & Payments"}
                      </LocaleLink>
                    </DropdownMenuItem>
                    {isPro ? (
                      <DropdownMenuItem disabled className="flex items-center gap-2 text-primary">
                        <Zap className="h-4 w-4" />
                        <span>{dict.common.pro}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">{dict.common?.active || "Active"}</Badge>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild>
                        <LocaleLink href="/pricing" className="flex items-center gap-2 text-primary">
                          <Sparkles className="h-4 w-4" />
                          {dict.common.upgrade}
                        </LocaleLink>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {user?.role === "volunteer" && (
                  <>
                    <DropdownMenuItem asChild>
                      <LocaleLink href="/volunteer/settings?tab=billing" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {dict.nav?.billing || "Billing"}
                      </LocaleLink>
                    </DropdownMenuItem>
                    {isPro ? (
                      <DropdownMenuItem disabled className="flex items-center gap-2 text-primary">
                        <Zap className="h-4 w-4" />
                        <span>{dict.common.pro}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">{dict.common?.active || "Active"}</Badge>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild>
                        <LocaleLink href="/pricing" className="flex items-center gap-2 text-primary">
                          <Sparkles className="h-4 w-4" />
                          {dict.common.upgrade}
                        </LocaleLink>
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => client.signOut()}
                >
                  {dict.common.signout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          )}
        </div>

        {/* MOBILE */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button size="icon" variant="ghost">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-[300px]">
            <div className="flex flex-col gap-6 pt-8">

              {/* MOBILE LINKS */}
              {[...baseLinks, ...roleLinks].map((link) => (
                <LocaleLink
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-lg ${pathname.endsWith(link.href) || pathname.includes(link.href + "/")
                      ? "text-primary font-semibold"
                      : "text-foreground"
                    }`}
                >
                  {link.label}
                </LocaleLink>
              ))}

              <div className="pt-6 border-t flex flex-col gap-3">
                {!user ? (
                  <>
                    <Button asChild variant="outline">
                      <LocaleLink href="/auth/signin">{dict.common.signin}</LocaleLink>
                    </Button>
                    <Button asChild>
                      <LocaleLink href="/auth/signup">{dict.common.getStarted}</LocaleLink>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline">
                      <LocaleLink href={user?.role === "admin" ? "/admin" : user?.role === "ngo" ? "/ngo/dashboard" : "/volunteer/dashboard"}>{dict.common.dashboard}</LocaleLink>
                    </Button>
                    <Button
                      onClick={() => client.signOut()}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {dict.common.signout}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
