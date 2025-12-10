"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Heart, Bell, Sun, Moon } from "lucide-react"
import { client } from "@/lib/auth-client" // Better Auth
import { useTheme } from "next-themes"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const { data: session, isPending } = client.useSession()
  const user = session?.user

  const initials = user?.name?.[0]?.toUpperCase() || "U"

  // ⭐ Role-based nav
  const baseLinks = [
    { href: "/projects", label: "Browse Projects" },
    { href: "/for-volunteers", label: "For Volunteers" },
    { href: "/for-ngos", label: "For NGOs" },
    { href: "/about", label: "About Us" },
  ]

  const adminLinks = [{ href: "/admin", label: "Admin Panel" }]
  const ngoLinks = [{ href: "/ngo/dashboard", label: "NGO Dashboard" }]
  const volunteerLinks = [{ href: "/volunteer/dashboard", label: "Volunteer Dashboard" }]

  const roleLinks =
    user?.role === "admin"
      ? adminLinks
      : user?.role === "ngo"
        ? ngoLinks
        : user?.role === "volunteer"
          ? volunteerLinks
          : []

  // ⭐ Notification demo
  const notifications = [
    { id: 1, text: "Your NGO application was approved." },
    { id: 2, text: "New volunteer request received." },
    { id: 3, text: "Your profile is now verified." },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="text-xl font-bold">
            JustBecause<span className="text-primary">.asia</span>
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-6">
          {[...baseLinks, ...roleLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition ${pathname === link.href
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT SIDE */}
        <div className="hidden md:flex items-center gap-3">

          {/* DARK MODE TOGGLE */}
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* NOTIFICATIONS */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-72" align="end">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                  >
                    {n.text}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* LOADING */}
          {isPending && <div className="animate-pulse bg-muted h-8 w-8 rounded-full" />}

          {/* LOGGED OUT */}
          {!isPending && !user && (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </>
          )}

          {/* USER AVATAR */}
          {!isPending && user && (
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
                  <Link href="/dashboard">My Dashboard</Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => client.signOut()}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-lg ${pathname === link.href
                      ? "text-primary font-semibold"
                      : "text-foreground"
                    }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-6 border-t flex flex-col gap-3">
                {!user ? (
                  <>
                    <Button asChild variant="outline">
                      <Link href="/auth/signin">Sign In</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/auth/signup">Get Started</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline">
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                    <Button
                      onClick={() => client.signOut()}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Logout
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
