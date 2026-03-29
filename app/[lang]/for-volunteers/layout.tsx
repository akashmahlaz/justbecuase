import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "For Impact Agents & Volunteers - Make a Difference with Your Skills",
  description: "Use your professional skills for good. Browse NGO volunteer opportunities, build your impact portfolio, get endorsed, and connect with causes that matter. Join JustBeCause Network for free.",
  keywords: [
    "volunteer opportunities",
    "skills-based volunteering",
    "impact agent",
    "remote volunteering",
    "pro bono work",
    "volunteer from home",
    "nonprofit volunteer",
    "make a difference",
  ],
  openGraph: {
    title: "For Impact Agents | JustBeCause Network",
    description: "Make a real difference with your professional skills. Browse opportunities and join thousands of impact agents worldwide.",
  },
}

export default function ForVolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
