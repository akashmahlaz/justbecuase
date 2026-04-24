import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Browse Skilled Candidates & Volunteers",
  description: "Find skilled professionals ready to contribute to your Enterprise. Browse candidates with expertise in technology, marketing, finance, design, legal, and more.",
  keywords: [
    "skilled volunteers",
    "pro bono professionals",
    "Enterprise talent",
    "candidates",
    "volunteer database",
    "find volunteers",
    "nonprofit staffing",
  ],
  openGraph: {
    title: "Browse Candidates | JustBeCause Network",
    description: "Find skilled professionals ready to contribute to your Enterprise's mission.",
  },
}

export default function VolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
