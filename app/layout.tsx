import type React from "react"
import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { seoConfig, generateAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/seo"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.url),
  title: {
    default: seoConfig.title,
    template: `%s | ${seoConfig.name}`,
  },
  description: seoConfig.description,
  keywords: seoConfig.keywords,
  authors: [{ name: seoConfig.name, url: seoConfig.url }],
  creator: seoConfig.name,
  publisher: seoConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: generateAlternates(),
  openGraph: {
    type: "website",
    locale: seoConfig.locale,
    url: seoConfig.url,
    siteName: seoConfig.name,
    title: seoConfig.title,
    description: seoConfig.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${seoConfig.name} - Connect Skills with Causes`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoConfig.title,
    description: seoConfig.description,
    site: seoConfig.twitterHandle,
    creator: seoConfig.twitterHandle,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-light-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/logo-main.png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Replace with actual verification codes after registering:
    // google: "your-google-search-console-code",
    // other: { "msvalidate.01": "your-bing-webmaster-code" },
  },
  category: "nonprofit",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd(), websiteJsonLd()]),
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" duration={4000} />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
