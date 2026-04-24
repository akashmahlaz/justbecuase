const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://justbecausenetwork.com"

export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JustBeCause Network",
    url: SITE_URL,
    logo: `${SITE_URL}/logo-main.png`,
    description:
      "Connect your skills with meaningful causes. A platform matching skilled professionals with NGOs and nonprofits worldwide.",
    sameAs: [
      "https://www.linkedin.com/in/just-because-network-07599a3a9/",
      "https://twitter.com/justbecausenet",
      "https://www.instagram.com/justbecausenet/",
      "https://www.facebook.com/people/Justbecausenetwork/61587223264929/",
    ],
    foundingDate: "2025",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${SITE_URL}/en/contact`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function WebSiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "JustBeCause Network",
    url: SITE_URL,
    description: "Skills-based volunteering platform connecting professionals with NGOs and nonprofits worldwide.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/en/projects?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: ["en", "hi", "pa", "ur", "fr", "ta"],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function JobPostingJsonLd({
  title,
  description,
  orgName,
  location,
  datePosted,
  deadline,
  employmentType,
  url,
}: {
  title: string
  description: string
  orgName: string
  location?: string
  datePosted?: string
  deadline?: string
  employmentType?: string
  url: string
}) {
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "VolunteerAction",
    name: title,
    description: description?.slice(0, 500),
    url,
    agent: {
      "@type": "Organization",
      name: orgName,
    },
    location: location
      ? {
          "@type": "Place",
          name: location,
        }
      : {
          "@type": "VirtualLocation",
          name: "Remote",
        },
  }

  if (datePosted) {
    jsonLd.startTime = datePosted
  }
  if (deadline) {
    jsonLd.endTime = deadline
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[]
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function BlogPostJsonLd({
  title,
  description,
  author,
  datePublished,
  url,
}: {
  title: string
  description: string
  author: string
  datePublished: string
  url: string
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description?.slice(0, 500),
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: "JustBeCause Network",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-main.png`,
      },
    },
    datePublished,
    url,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
