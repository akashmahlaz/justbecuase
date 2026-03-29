import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { i18n, type Locale, isRtlLocale } from "@/lib/i18n-config"
import { getDictionary } from "./dictionaries"
import { DictionaryProvider } from "@/components/dictionary-provider"
import { HtmlDirSetter } from "@/components/html-dir-setter"
import { absoluteUrl } from "@/lib/seo"

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  return {
    alternates: {
      canonical: absoluteUrl(`/${lang}`),
      languages: Object.fromEntries(
        i18n.locales.map((l) => [l, absoluteUrl(`/${l}`)])
      ),
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  // Validate locale — show 404 for unsupported locales
  if (!i18n.locales.includes(lang as Locale)) {
    notFound()
  }

  const dict = await getDictionary(lang as Locale)
  const dir = isRtlLocale(lang) ? "rtl" : "ltr"

  return (
    <DictionaryProvider dictionary={dict}>
      <HtmlDirSetter lang={lang} dir={dir} />
      {children}
    </DictionaryProvider>
  )
}
