// Centralized logo URL resolver for external/scraped opportunities.
//
// Priority:
//   1. Explicit organizationLogo from the source (Idealist, Impactpool save these).
//   2. Clearbit logo derived from the org's own domain (TheirStack passes
//      company_domain → organizationUrl).
//   3. Empty string → caller should show initials fallback.
//
// We intentionally do NOT fall back to `sourceUrl`, because for ReliefWeb,
// Idealist, Catchafire etc. the sourceUrl host is the platform, and using it
// would render the platform's logo on every job from that source.

const PLATFORM_HOSTS = new Set([
  "reliefweb.int",
  "idealist.org",
  "www.idealist.org",
  "catchafire.org",
  "www.catchafire.org",
  "theirstack.com",
  "www.theirstack.com",
  "impactpool.org",
  "www.impactpool.org",
  "linkedin.com",
  "www.linkedin.com",
  "indeed.com",
  "www.indeed.com",
  "glassdoor.com",
  "www.glassdoor.com",
])

function hostOf(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return null
  }
}

export function deriveLogoUrl(opp: {
  organizationLogo?: string | null
  organizationUrl?: string | null
  sourceUrl?: string | null
}): string {
  if (opp.organizationLogo) return opp.organizationLogo

  const orgHost = hostOf(opp.organizationUrl)
  if (orgHost && !PLATFORM_HOSTS.has(orgHost)) {
    return `https://logo.clearbit.com/${orgHost}`
  }

  return ""
}
