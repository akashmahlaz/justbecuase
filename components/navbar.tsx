"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Bell, Sun, Moon, Sparkles, CreditCard, Zap, Search, Users, Building2, Info, LayoutDashboard, LogOut, UserPlus, LogIn } from "lucide-react"
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  // Close on route change
  const closeMenu = useCallback(() => setIsOpen(false), [])

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

  // â­ Role-based nav
  const baseLinks = [
    { href: "/projects", label: dict.nav.browseOpportunities, icon: Search },
    { href: "/for-volunteers", label: dict.nav.forImpactAgents, icon: Users },
    { href: "/for-ngos", label: dict.nav.forNGOs, icon: Building2 },
    { href: "/about", label: dict.nav.aboutUs, icon: Info },
  ]

  const adminLinks = [{ href: "/admin", label: dict.nav?.adminPanel || "Admin Panel", icon: LayoutDashboard }]
  const ngoLinks = [{ href: "/ngo/dashboard", label: dict.nav.myDashboard, icon: LayoutDashboard }]
  const volunteerLinks = [{ href: "/volunteer/dashboard", label: dict.nav.myDashboard, icon: LayoutDashboard }]

  const roleLinks =
    user?.role === "admin"
      ? adminLinks
      : user?.role === "ngo"
        ? ngoLinks
        : user?.role === "volunteer"
          ? volunteerLinks
          : []

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background shadow-sm">
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

        {/* MOBILE TOGGLE */}
        <div className="flex md:hidden items-center gap-1">
          {user && (
            <Button variant="ghost" size="icon" asChild>
              <LocaleLink href={user?.role === "ngo" ? "/ngo/notifications" : "/volunteer/notifications"}>
                <Bell className="h-5 w-5" />
              </LocaleLink>
            </Button>
          )}
          <LanguageSwitcher />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative z-60 flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            aria-label="Toggle menu"
          >
            <span className="sr-only">Menu</span>
            <div className="relative h-5 w-5">
              <span className={`absolute left-0 block h-0.5 w-5 bg-current transition-all duration-300 ${isOpen ? "top-2.5 rotate-45" : "top-1"}`} />
              <span className={`absolute left-0 top-2.5 block h-0.5 w-5 bg-current transition-opacity duration-300 ${isOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 block h-0.5 w-5 bg-current transition-all duration-300 ${isOpen ? "top-2.5 -rotate-45" : "top-4"}`} />
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE FULLSCREEN MENU */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeMenu}
        />

        {/* Menu panel */}
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-sm bg-background shadow-2xl transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">

            {/* Header */}
            <div className="flex items-center px-5 h-16 border-b">
              <Image src="/logo-main.png" alt="JBC Logo" width={120} height={58} className="h-9 w-auto" />
            </div>

            {/* User card */}
            {user ? (
              <LocaleLink
                href={user?.role === "admin" ? "/admin" : user?.role === "ngo" ? "/ngo/dashboard" : "/volunteer/dashboard"}
                onClick={closeMenu}
                className="flex items-center gap-3 mx-4 mt-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={user.image ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                {isPro && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                    <Zap className="h-3 w-3 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </LocaleLink>
            ) : (
              <div className="mx-4 mt-4 p-3 rounded-xl bg-muted/50">
                <p className="font-semibold text-sm">{platformName}</p>
                <p className="text-xs text-muted-foreground">Connecting Skills to Purpose</p>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {dict.nav?.explore || "Explore"}
              </p>
              <ul className="space-y-0.5">
                {baseLinks.map((link, i) => {
                  const isActive = pathname.endsWith(link.href) || pathname.includes(link.href + "/")
                  const Icon = link.icon
                  return (
                    <li key={link.href}>
                      <LocaleLink
                        href={link.href}
                        onClick={closeMenu}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground hover:bg-muted active:scale-[0.98]"
                        }`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        {link.label}
                      </LocaleLink>
                    </li>
                  )
                })}
              </ul>

              {user && (
                <>
                  <p className="px-2 pt-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {dict.nav?.account || "Account"}
                  </p>
                  <ul className="space-y-0.5">
                    {roleLinks.map((link) => {
                      const isActive = pathname.endsWith(link.href) || pathname.includes(link.href + "/")
                      const Icon = link.icon
                      return (
                        <li key={link.href}>
                          <LocaleLink
                            href={link.href}
                            onClick={closeMenu}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground hover:bg-muted active:scale-[0.98]"
                            }`}
                          >
                            <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                            {link.label}
                          </LocaleLink>
                        </li>
                      )
                    })}
                    {(user?.role === "ngo" || user?.role === "volunteer") && (
                      <li>
                        <LocaleLink
                          href={user?.role === "ngo" ? "/ngo/settings?tab=billing" : "/volunteer/settings?tab=billing"}
                          onClick={closeMenu}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-muted active:scale-[0.98] transition-all duration-200"
                        >
                          <CreditCard className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                          {dict.nav?.billingPayments || dict.nav?.billing || "Billing"}
                        </LocaleLink>
                      </li>
                    )}
                    {!isPro && (user?.role === "ngo" || user?.role === "volunteer") && (
                      <li>
                        <LocaleLink
                          href="/pricing"
                          onClick={closeMenu}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 active:scale-[0.98] transition-all duration-200"
                        >
                          <Sparkles className="h-4.5 w-4.5 shrink-0" />
                          {dict.common.upgrade}
                        </LocaleLink>
                      </li>
                    )}
                  </ul>
                </>
              )}
            </nav>

            {/* Bottom */}
            <div className="px-4 py-4 border-t space-y-2">
              {!user ? (
                <>
                  <Button asChild size="lg" className="w-full h-12 font-semibold rounded-xl">
                    <LocaleLink href="/auth/signup" onClick={closeMenu}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {dict.common.getStarted}
                    </LocaleLink>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full h-12 font-semibold rounded-xl">
                    <LocaleLink href="/auth/signin" onClick={closeMenu}>
                      <LogIn className="h-4 w-4 mr-2" />
                      {dict.common.signin}
                    </LocaleLink>
                  </Button>
                </>
              ) : (
                <button
                  onClick={() => { client.signOut(); closeMenu() }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all duration-200"
                >
                  <LogOut className="h-4.5 w-4.5 shrink-0" />
                  {dict.common.signout}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  )
}

