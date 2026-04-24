import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Us - Get in Touch",
  description: "Get in touch with the JustBeCause Network team. We're here to help NGOs, candidates, and partners. Send us a message or reach out on social media.",
  keywords: ["contact JustBeCause", "volunteer platform support", "NGO help", "get in touch"],
  openGraph: {
    title: "Contact Us | JustBeCause Network",
    description: "Have questions? Reach out to the JustBeCause Network team anytime.",
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
