// Sample data for the platform
export const sampleProjects = [
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
    description: "Review and update our candidate agreements and liability waivers to ensure legal compliance.",
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
    mission: "Protecting biodiversity and promoting sustainable practices worldwide.",
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
  { name: "Digital Marketing", icon: "Megaphone", count: 45 },
  { name: "Website & App Development", icon: "Code", count: 52 },
  { name: "Content Creation & Design", icon: "Palette", count: 38 },
  { name: "Communication & Writing", icon: "MessageSquare", count: 32 },
  { name: "Fundraising Assistance", icon: "Heart", count: 28 },
  { name: "Finance & Accounting", icon: "Calculator", count: 24 },
  { name: "Planning & Operations", icon: "Users", count: 22 },
  { name: "Legal & Compliance", icon: "Scale", count: 15 },
  { name: "Data & Technology", icon: "Laptop", count: 18 },
]

export const impactMetrics = {
  volunteers: 2847,
  projectsCompleted: 456,
  ngosSupported: 128,
  hoursContributed: 34500,
  valueGenerated: 2450000,
}

export interface Testimonial {
  id: number
  quote: string
  highlight: string
  author: string
  role: string
  organization: string
  avatar: string
  type: "NGO" | "Volunteer"
  tag: string
}

export const featuredTestimonial: Testimonial = {
  id: 1,
  quote: "JustBecause connected us with a brilliant UX strategist who redesigned our donor portal in just three weeks. Online donations increased 140% the following quarter.",
  highlight: "Online donations increased 140%",
  author: "Amira Osei",
  role: "Executive Director",
  organization: "WaterBridge Foundation",
  avatar: "https://i.pravatar.cc/150?u=amira",
  type: "NGO",
  tag: "Impact",
}

export const testimonialRow1: Testimonial[] = [
  {
    id: 2,
    quote: "I wanted to use my product skills for something meaningful. Within days I was embedded with an education nonprofit, leading their mobile app launch.",
    highlight: "leading their mobile app launch",
    author: "Carlos Méndez",
    role: "Senior Product Designer",
    organization: "Pro-bono Volunteer",
    avatar: "https://i.pravatar.cc/150?u=carlos",
    type: "Volunteer",
    tag: "Design",
  },
  {
    id: 3,
    quote: "The matching algorithm found us a data engineer who automated our impact reporting. What took two weeks now takes two hours.",
    highlight: "two weeks now takes two hours",
    author: "Fatima Al-Rashid",
    role: "Programs Director",
    organization: "GreenLeaf Initiative",
    avatar: "https://i.pravatar.cc/150?u=fatima",
    type: "NGO",
    tag: "Data",
  },
  {
    id: 4,
    quote: "As a retired CFO, I thought my best years were behind me. JustBecause proved me wrong — I've helped three nonprofits restructure their finances.",
    highlight: "JustBecause proved me wrong",
    author: "David Chen",
    role: "Financial Advisor",
    organization: "Pro-bono Volunteer",
    avatar: "https://i.pravatar.cc/150?u=david",
    type: "Volunteer",
    tag: "Finance",
  },
  {
    id: 5,
    quote: "We struggled for months to find legal help we could afford. JustBecause matched us with a corporate lawyer who handled our entire compliance audit pro bono.",
    highlight: "entire compliance audit pro bono",
    author: "Priya Sharma",
    role: "Founder",
    organization: "SafeHaven Trust",
    avatar: "https://i.pravatar.cc/150?u=priya",
    type: "NGO",
    tag: "Legal",
  },
  {
    id: 6,
    quote: "The platform made it incredibly easy to find skilled volunteers. We onboarded a full development team in under a week and shipped our new website on time.",
    highlight: "in under a week",
    author: "Lena Johansson",
    role: "COO",
    organization: "Nordic Aid Alliance",
    avatar: "https://i.pravatar.cc/150?u=lena",
    type: "NGO",
    tag: "Tech",
  },
]

export const testimonialRow2: Testimonial[] = [
  {
    id: 7,
    quote: "After retiring from corporate law, I was looking for purpose. JustBecause connected me with an anti-trafficking NGO that needed exactly my expertise.",
    highlight: "an anti-trafficking NGO that needed exactly my expertise",
    author: "Margaret Okonkwo",
    role: "Legal Consultant",
    organization: "Pro-bono Volunteer",
    avatar: "https://i.pravatar.cc/150?u=margaret",
    type: "Volunteer",
    tag: "Legal",
  },
  {
    id: 8,
    quote: "Our fundraising campaign strategy was completely transformed by a volunteer marketing expert. We exceeded our annual goal by 60% in just six months.",
    highlight: "exceeded our annual goal by 60%",
    author: "Tomás Rivera",
    role: "Development Director",
    organization: "EduForward Foundation",
    avatar: "https://i.pravatar.cc/150?u=tomas",
    type: "NGO",
    tag: "Fundraising",
  },
  {
    id: 9,
    quote: "I'm a data scientist by day, and JustBecause lets me apply those skills where they matter most. I built a predictive model that helps allocate disaster relief resources.",
    highlight: "I built a predictive model",
    author: "Anika Patel",
    role: "Data Scientist",
    organization: "Pro-bono Volunteer",
    avatar: "https://i.pravatar.cc/150?u=anika",
    type: "Volunteer",
    tag: "Analytics",
  },
  {
    id: 10,
    quote: "Finding a pro-bono accountant felt impossible until JustBecause. Our matched volunteer saved us thousands in compliance costs and got our books audit-ready.",
    highlight: "saved us thousands in compliance costs",
    author: "James Nkomo",
    role: "Executive Director",
    organization: "Youth Forward Africa",
    avatar: "https://i.pravatar.cc/150?u=james",
    type: "NGO",
    tag: "Finance",
  },
  {
    id: 11,
    quote: "The skill-matching is remarkable. I listed graphic design and within 48 hours three NGOs reached out. Now I design impact reports that actually get read.",
    highlight: "within 48 hours three NGOs reached out",
    author: "Sophie Laurent",
    role: "Graphic Designer",
    organization: "Pro-bono Volunteer",
    avatar: "https://i.pravatar.cc/150?u=sophie",
    type: "Volunteer",
    tag: "Design",
  },
]

// Backward-compatible combined array
export const testimonials = [featuredTestimonial, ...testimonialRow1, ...testimonialRow2]
