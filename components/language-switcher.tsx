"use client"

import { usePathname, useRouter } from "next/navigation"
import { i18n, type Locale } from "@/lib/i18n-config"
import { localePath } from "@/hooks/use-locale"
import { useLocale } from "@/hooks/use-locale"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

const localeLabels: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
  ur: "اردو",
  fr: "Français",
  ta: "தமிழ்",
}

const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  hi: "🇮🇳",
  pa: "🇮🇳",
  ur: "🇮🇳",
  fr: "🇫🇷",
  ta: "🇮🇳",
}

export function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()

  function switchLocale(newLocale: Locale) {
    if (newLocale === currentLocale) return

    // Save preference in cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;samesite=lax`

    // Navigate to the same page with the new locale
    const newPath = localePath(pathname, newLocale)
    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Switch language">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {i18n.locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLocale(locale)}
            className={currentLocale === locale ? "bg-accent font-medium" : ""}
          >
            <span className="mr-2">{localeFlags[locale]}</span>
            {localeLabels[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
