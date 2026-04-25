"use client"

import LocaleLink from "@/components/locale-link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, ExternalLink, Shield } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useLocale, localePath } from "@/hooks/use-locale"

interface MarketingHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function MarketingHeader({ user }: MarketingHeaderProps) {
  const router = useRouter()
  const locale = useLocale()

  const handleSignOut = async () => {
    await signOut()
    router.push(localePath("/", locale))
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <span className="text-sm font-medium text-foreground">Marketing Intelligence</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <LocaleLink href="/admin/dashboard" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </LocaleLink>
        </Button>

        <Button variant="ghost" size="sm" asChild>
          <LocaleLink href="/" target="_blank" className="flex items-center gap-1.5">
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">View Site</span>
          </LocaleLink>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-600/10 flex items-center justify-center text-sm font-medium text-orange-600">
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
              <LocaleLink href="/admin/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Settings
              </LocaleLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
