"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Bell, Menu, LogOut, User, Settings, ExternalLink, 
  LayoutDashboard, Users, Building2, FolderKanban, CreditCard, 
  BarChart3, Shield, Heart, UsersRound, Ban 
} from "lucide-react"
import { signOut } from "@/lib/auth-client"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const mobileNavItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Volunteers", href: "/admin/volunteers", icon: Heart },
  { title: "NGOs", href: "/admin/ngos", icon: Building2 },
  { title: "Projects", href: "/admin/projects", icon: FolderKanban },
  { title: "Payments", href: "/admin/payments", icon: CreditCard },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Reports", href: "/admin/reports", icon: BarChart3 },
  { title: "Team", href: "/admin/team", icon: UsersRound },
  { title: "Ban History", href: "/admin/bans", icon: Ban },
  { title: "Admin Accounts", href: "/admin/admins", icon: Shield },
  { title: "Settings", href: "/admin/settings", icon: Settings },
]

interface AdminHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Admin Panel</span>
                </div>
              </div>
              <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
                {mobileNavItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-bold text-primary">JustBecause</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Admin</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" target="_blank" className="flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              View Site
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
              3
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {user.name?.charAt(0) || user.email?.charAt(0) || "A"}
                </div>
                <span className="hidden md:inline-block text-sm font-medium">
                  {user.name || "Admin"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user.name || "Admin"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
