import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Browse Volunteer Opportunities & NGO Projects",
  description: "Explore hundreds of volunteer opportunities from NGOs worldwide. Filter by skills, location, and cause area. Find the perfect project to make an impact with your expertise.",
  keywords: [
    "volunteer projects",
    "NGO opportunities",
    "remote volunteer work",
    "social impact projects",
    "skills matching",
    "nonprofit projects",
    "pro bono consulting",
    "online volunteering",
  ],
  openGraph: {
    title: "Browse Opportunities | JustBeCause Network",
    description: "Find the perfect volunteer opportunity matching your skills. Hundreds of NGO projects need your expertise.",
  },
}

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
