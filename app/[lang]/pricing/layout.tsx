import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing Plans - Free & Premium Options for Enterprises",
  description: "Explore JustBeCause Network pricing plans for Enterprises. Access skilled candidates, smart matching, and unlimited project postings. Start free — upgrade when you need more.",
  keywords: ["Enterprise pricing", "volunteer platform pricing", "nonprofit platform plans", "free volunteer platform", "CSR platform cost"],
  openGraph: {
    title: "Pricing Plans | JustBeCause Network",
    description: "Affordable plans for Enterprises to access skilled professionals. Free plan available.",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
