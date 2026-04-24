import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Browse Volunteer Jobs & NGO Projects",
  description: "Explore hundreds of volunteer jobs from NGOs worldwide. Filter by skills, location, and cause area. Find the perfect project to make an impact with your expertise.",
  keywords: [
    "volunteer projects",
    "NGO jobs",
    "remote volunteer work",
    "social impact projects",
    "skills matching",
    "nonprofit projects",
    "pro bono consulting",
    "online volunteering",
  ],
  openGraph: {
    title: "Browse Jobs | JustBeCause Network",
    description: "Find the perfect volunteer job matching your skills. Hundreds of NGO projects need your expertise.",
  },
}

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
