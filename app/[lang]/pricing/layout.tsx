import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing Plans - Free & Premium Options for NGOs",
  description: "Explore JustBeCause Network pricing plans for NGOs. Access skilled impact agents, smart matching, and unlimited project postings. Start free — upgrade when you need more.",
  keywords: ["NGO pricing", "volunteer platform pricing", "nonprofit platform plans", "free volunteer platform", "CSR platform cost"],
  openGraph: {
    title: "Pricing Plans | JustBeCause Network",
    description: "Affordable plans for NGOs to access skilled professionals. Free plan available.",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
