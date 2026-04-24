import type { Metadata } from "next"
import { i18n, type Locale } from "@/lib/i18n-config"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"
export const SITE_NAME = "JustBeCause Network"

export const seoConfig = {
  url: SITE_URL,
  name: SITE_NAME,
  title: "JustBeCause Network - Skills-Based Impact Platform",
  description:
    "Connect your skills with meaningful causes. Join thousands of professionals making an impact worldwide through skills-based volunteering with Enterprises and nonprofits.",
  keywords: [
    "skills-based volunteering",
    "candidate",
    "Enterprise volunteering",
    "nonprofit volunteer platform",
    "social impact",
    "JustBeCause Network",
    "pro bono consulting",
    "volunteer matching",
    "skilled volunteering",
    "CSR platform",
    "volunteer opportunities",
    "Enterprise project matching",
    "social good platform",
    "professional volunteering",
    "impact marketplace",
  ],
  ogImage: `${SITE_URL}/og-image.png`,
  twitterHandle: "@justbecausenet",
  locale: "en_US",
}

/** Build full URL from path */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

/** Generate hreflang alternates for all supported locales */
export function generateAlternates(path: string = ""): Metadata["alternates"] {
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  const languages: Record<string, string> = {}

  for (const locale of i18n.locales) {
    languages[locale] = absoluteUrl(`/${locale}${cleanPath}`)
  }

  return {
    canonical: absoluteUrl(`/${i18n.defaultLocale}${cleanPath}`),
    languages,
  }
}

/** Generate base Open Graph metadata */
function baseOpenGraph(overrides: {
  title?: string
  description?: string
  url?: string
  images?: Array<{ url: string; width?: number; height?: number; alt?: string }>
  type?: "website" | "article" | "profile"
}) {
  return {
    siteName: SITE_NAME,
    locale: seoConfig.locale,
    type: overrides.type || ("website" as const),
    title: overrides.title || seoConfig.title,
    description: overrides.description || seoConfig.description,
    url: overrides.url || seoConfig.url,
    images: overrides.images || [
      {
        url: seoConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Skills-Based Impact Platform`,
      },
    ],
  }
}

/** Generate complete page metadata with OG, Twitter, alternates */
export function generatePageMetadata({
  title,
  description,
  path = "",
  keywords = [],
  ogType = "website",
  ogImages,
  noIndex = false,
}: {
  title: string
  description: string
  path?: string
  keywords?: string[]
  ogType?: "website" | "article" | "profile"
  ogImages?: Array<{ url: string; width?: number; height?: number; alt?: string }>
  noIndex?: boolean
}): Metadata {
  const pageUrl = absoluteUrl(path || "/")

  return {
    title,
    description,
    keywords: [...seoConfig.keywords, ...keywords],
    alternates: generateAlternates(
      path.replace(/^\/[a-z]{2}(\/|$)/, "$1") // strip locale prefix for alternates
    ),
    openGraph: baseOpenGraph({
      title,
      description,
      url: pageUrl,
      type: ogType,
      images: ogImages,
    }),
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: seoConfig.twitterHandle,
      creator: seoConfig.twitterHandle,
      images: ogImages?.map((img) => img.url) || [seoConfig.ogImage],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  }
}

/** JSON-LD Organization schema */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: seoConfig.url,
    logo: absoluteUrl("/logo-main.png"),
    description: seoConfig.description,
    sameAs: [
      "https://www.linkedin.com/in/just-because-network-07599a3a9/",
      "https://twitter.com/justbecausenet",
      "https://www.instagram.com/justbecausenet/",
      "https://www.facebook.com/people/Justbecausenetwork/61587223264929/",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: absoluteUrl("/en/contact"),
    },
  }
}

/** JSON-LD WebSite schema with search action */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: seoConfig.url,
    description: seoConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${seoConfig.url}/en/projects?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

/** JSON-LD BreadcrumbList */
export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  }
}

/** JSON-LD for a volunteer project listing */
export function projectJsonLd(project: {
  title: string
  description: string
  id: string
  lang: string
  ngoName?: string
  location?: string
  datePosted?: string
  skills?: string[]
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VolunteerAction",
    name: project.title,
    description: project.description,
    url: absoluteUrl(`/${project.lang}/projects/${project.id}`),
    ...(project.ngoName && {
      agent: {
        "@type": "Organization",
        name: project.ngoName,
      },
    }),
    ...(project.location && {
      location: {
        "@type": "Place",
        name: project.location,
      },
    }),
    ...(project.datePosted && {
      startTime: project.datePosted,
    }),
  }
}

/** JSON-LD for a person (volunteer/candidate profile) */
export function volunteerJsonLd(volunteer: {
  name: string
  title?: string
  id: string
  lang: string
  location?: string
  skills?: string[]
  image?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: volunteer.name,
    url: absoluteUrl(`/${volunteer.lang}/volunteers/${volunteer.id}`),
    ...(volunteer.title && { jobTitle: volunteer.title }),
    ...(volunteer.location && {
      address: {
        "@type": "PostalAddress",
        addressLocality: volunteer.location,
      },
    }),
    ...(volunteer.image && { image: volunteer.image }),
    ...(volunteer.skills?.length && {
      knowsAbout: volunteer.skills,
    }),
  }
}

/** JSON-LD for an Enterprise profile */
export function ngoJsonLd(ngo: {
  name: string
  description?: string
  id: string
  lang: string
  logo?: string
  location?: string
  website?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Enterprise",
    name: ngo.name,
    url: absoluteUrl(`/${ngo.lang}/ngos/${ngo.id}`),
    ...(ngo.description && { description: ngo.description }),
    ...(ngo.logo && { logo: ngo.logo }),
    ...(ngo.location && {
      address: {
        "@type": "PostalAddress",
        addressLocality: ngo.location,
      },
    }),
    ...(ngo.website && { sameAs: [ngo.website] }),
  }
}

/** JSON-LD for a blog article */
export function articleJsonLd(article: {
  title: string
  description: string
  slug: string
  lang: string
  author: string
  datePublished: string
  dateModified?: string
  image?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: absoluteUrl(`/${article.lang}/blog/${article.slug}`),
    author: {
      "@type": "Organization",
      name: article.author || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo-main.png"),
      },
    },
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    ...(article.image && {
      image: {
        "@type": "ImageObject",
        url: article.image,
      },
    }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/${article.lang}/blog/${article.slug}`),
    },
  }
}

/** JSON-LD for FAQ page */
export function faqJsonLd(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}
