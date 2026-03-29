import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Browse Skilled Impact Agents & Volunteers",
  description: "Find skilled professionals ready to contribute to your NGO. Browse impact agents with expertise in technology, marketing, finance, design, legal, and more.",
  keywords: [
    "skilled volunteers",
    "pro bono professionals",
    "NGO talent",
    "impact agents",
    "volunteer database",
    "find volunteers",
    "nonprofit staffing",
  ],
  openGraph: {
    title: "Browse Impact Agents | JustBeCause Network",
    description: "Find skilled professionals ready to contribute to your NGO's mission.",
  },
}

export default function VolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
