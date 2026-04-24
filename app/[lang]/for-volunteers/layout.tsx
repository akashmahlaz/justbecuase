import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "For Candidates & Volunteers - Make a Difference with Your Skills",
  description: "Use your professional skills for good. Browse Enterprise volunteer jobs, build your impact portfolio, get endorsed, and connect with causes that matter. Join JustBeCause Network for free.",
  keywords: [
    "volunteer jobs",
    "skills-based volunteering",
    "candidate",
    "remote volunteering",
    "pro bono work",
    "volunteer from home",
    "nonprofit volunteer",
    "make a difference",
  ],
  openGraph: {
    title: "For Candidates | JustBeCause Network",
    description: "Make a real difference with your professional skills. Browse jobs and join thousands of candidates worldwide.",
  },
}

export default function ForVolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
