// Sample data for the platform
export const sampleProjects = [
  {
    id: "1",
    title: "Social Media Strategy for Environmental NGO",
    ngo: {
      name: "Green Earth Foundation",
      logo: "/green-leaf-logo.png",
      verified: true,
    },
    description:
      "Help us develop a comprehensive social media strategy to increase awareness about climate change initiatives in Southeast Asia.",
    skills: ["Social Media", "Marketing", "Content Strategy"],
    timeCommitment: "10-15 hours",
    projectType: "short-term",
    location: "Virtual",
    deadline: "Dec 15, 2025",
    applicants: 12,
    status: "active",
  },
  {
    id: "2",
    title: "Website Redesign for Education Nonprofit",
    ngo: {
      name: "Teach For Tomorrow",
      logo: "/education-book-logo.jpg",
      verified: true,
    },
    description:
      "Redesign our website to better showcase our education programs and attract more donors and volunteers.",
    skills: ["Web Design", "UI/UX", "Development"],
    timeCommitment: "25-40 hours",
    projectType: "long-term",
    location: "Virtual",
    deadline: "Jan 30, 2026",
    applicants: 8,
    status: "active",
  },
  {
    id: "3",
    title: "Grant Writing Support",
    ngo: {
      name: "Healthcare Access Initiative",
      logo: "/medical-cross-logo.png",
      verified: true,
    },
    description:
      "Support our team in writing grant proposals to secure funding for mobile health clinics in rural areas.",
    skills: ["Grant Writing", "Research", "Nonprofit Finance"],
    timeCommitment: "15-20 hours",
    projectType: "short-term",
    location: "Virtual",
    deadline: "Dec 20, 2025",
    applicants: 5,
    status: "active",
  },
  {
    id: "4",
    title: "Brand Identity Design",
    ngo: {
      name: "Youth Empowerment Network",
      logo: "/youth-star-logo.jpg",
      verified: false,
    },
    description:
      "Create a fresh brand identity including logo, color palette, and brand guidelines for our youth programs.",
    skills: ["Branding", "Graphic Design", "Visual Identity"],
    timeCommitment: "20-30 hours",
    projectType: "short-term",
    location: "Singapore",
    deadline: "Jan 10, 2026",
    applicants: 15,
    status: "active",
  },
  {
    id: "5",
    title: "Financial Planning Consultation",
    ngo: {
      name: "Community Food Bank",
      logo: "/food-heart-logo.jpg",
      verified: true,
    },
    description:
      "One-hour consultation to review our financial planning and provide recommendations for sustainable growth.",
    skills: ["Finance", "Strategic Planning", "Nonprofit Management"],
    timeCommitment: "1-2 hours",
    projectType: "consultation",
    location: "Virtual",
    deadline: "Dec 5, 2025",
    applicants: 3,
    status: "active",
  },
  {
    id: "6",
    title: "Legal Document Review",
    ngo: {
      name: "Animal Welfare Society",
      logo: "/paw-print-logo.png",
      verified: true,
    },
    description: "Review and update our volunteer agreements and liability waivers to ensure legal compliance.",
    skills: ["Legal", "Contract Review", "Compliance"],
    timeCommitment: "5-10 hours",
    projectType: "short-term",
    location: "Virtual",
    deadline: "Dec 25, 2025",
    applicants: 2,
    status: "active",
  },
]

export const sampleVolunteers = [
  {
    id: "1",
    name: "Sarah Chen",
    avatar: "/asian-woman-professional-headshot.png",
    location: "Singapore",
    headline: "Senior Marketing Manager | Pro Bono Consultant",
    skills: ["Marketing", "Social Media", "Brand Strategy"],
    rating: 4.9,
    completedProjects: 12,
    hoursContributed: 156,
  },
  {
    id: "2",
    name: "David Kim",
    avatar: "/korean-man-headshot.png",
    location: "Seoul, South Korea",
    headline: "Full-Stack Developer | Tech for Good Advocate",
    skills: ["Web Development", "React", "Node.js"],
    rating: 5.0,
    completedProjects: 8,
    hoursContributed: 240,
  },
  {
    id: "3",
    name: "Priya Sharma",
    avatar: "/indian-woman-professional-headshot.png",
    location: "Mumbai, India",
    headline: "Finance Director | Nonprofit Board Member",
    skills: ["Finance", "Fundraising", "Strategic Planning"],
    rating: 4.8,
    completedProjects: 15,
    hoursContributed: 180,
  },
]

export const sampleNGOs = [
  {
    id: "1",
    name: "Green Earth Foundation",
    logo: "/green-earth-environmental-logo.jpg",
    location: "Jakarta, Indonesia",
    mission: "Protecting biodiversity and promoting sustainable practices across Southeast Asia.",
    causes: ["Environment", "Climate Action", "Sustainability"],
    verified: true,
    projectsCompleted: 24,
    volunteersEngaged: 89,
  },
  {
    id: "2",
    name: "Teach For Tomorrow",
    logo: "/education-learning-logo.jpg",
    location: "Manila, Philippines",
    mission: "Providing quality education to underserved communities through innovative learning programs.",
    causes: ["Education", "Youth Development", "Community"],
    verified: true,
    projectsCompleted: 45,
    volunteersEngaged: 156,
  },
]

export const skillCategories = [
  { name: "Marketing & Communications", icon: "Megaphone", count: 45 },
  { name: "Web & Technology", icon: "Code", count: 38 },
  { name: "Design & Creative", icon: "Palette", count: 32 },
  { name: "Finance & Operations", icon: "Calculator", count: 28 },
  { name: "Strategy & Planning", icon: "Target", count: 24 },
  { name: "Legal & Compliance", icon: "Scale", count: 15 },
  { name: "HR & Training", icon: "Users", count: 18 },
  { name: "Fundraising & Grants", icon: "Heart", count: 22 },
]

export const impactMetrics = {
  volunteers: 2847,
  projectsCompleted: 456,
  ngosSupported: 128,
  hoursContributed: 34500,
  valueGenerated: 2450000,
}

export const testimonials = [
  {
    id: "1",
    quote:
      "JustBecause.asia connected me with an amazing designer who completely transformed our brand. The quality of work we received was exceptional.",
    author: "Maria Santos",
    role: "Executive Director",
    organization: "Youth Empowerment Network",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face",
    type: "ngo",
  },
  {
    id: "2",
    quote:
      "I wanted to use my marketing skills for good, and this platform made it so easy. The projects are meaningful, and the NGOs are genuinely grateful.",
    author: "James Tanaka",
    role: "Marketing Director",
    organization: "Volunteer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    type: "volunteer",
  },
  {
    id: "3",
    quote:
      "As a small nonprofit, we could never afford professional consulting. JustBecause.asia gave us access to incredible talent that helped us grow our impact.",
    author: "Dr. Ananya Patel",
    role: "Founder",
    organization: "Healthcare Access Initiative",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face",
    type: "ngo",
  },
]
