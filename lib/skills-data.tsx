import React from "react"
import {
  Megaphone,
  HandCoins,
  Monitor,
  Calculator,
  Palette,
  MessageSquare,
  Users,
  GraduationCap,
  Stethoscope,
  Leaf,
  HeartHandshake,
  Baby,
  PawPrint,
  Tent,
  Scale,
  Music,
  Accessibility,
  Briefcase,
  Home,
  Building2,
  Globe,
  Laptop,
  Smartphone,
  Wifi
} from "lucide-react"

export const skillCategories = [
  {
    id: "digital-marketing",
    name: "Digital Marketing",
    icon: <Megaphone className="h-4 w-4" />,
    subskills: [
      { id: "community-management", name: "Community Management" },
      { id: "email-marketing", name: "Email Marketing / Automation" },
      { id: "social-media-ads", name: "Social Media Ads (Meta Ads / Facebook Ads)" },
      { id: "ppc-google-ads", name: "PPC / Google Ads" },
      { id: "seo-content", name: "SEO / Content" },
      { id: "social-media-strategy", name: "Social Media Strategy" },
      { id: "whatsapp-marketing", name: "WhatsApp Marketing" },
    ],
  },
  {
    id: "fundraising",
    name: "Fundraising Assistance",
    icon: <HandCoins className="h-4 w-4" />,
    subskills: [
      { id: "grant-writing", name: "Grant Writing" },
      { id: "grant-research", name: "Grant Research" },
      { id: "corporate-sponsorship", name: "Corporate Sponsorship" },
      { id: "major-gift-strategy", name: "Major Gift Strategy" },
      { id: "peer-to-peer-campaigns", name: "Peer-to-Peer Campaigns" },
      { id: "fundraising-pitch-deck", name: "Fundraising Pitch Deck Support" },
    ],
  },
  {
    id: "website",
    name: "Website Design & Maintenance",
    icon: <Monitor className="h-4 w-4" />,
    subskills: [
      { id: "wordpress-development", name: "WordPress Development" },
      { id: "ux-ui", name: "UX / UI" },
      { id: "html-css", name: "HTML / CSS" },
      { id: "website-security", name: "Website Security" },
      { id: "cms-maintenance", name: "CMS Maintenance" },
      { id: "website-redesign", name: "Website Redesign" },
      { id: "landing-page-optimization", name: "Landing Page Optimization" },
    ],
  },
  {
    id: "finance",
    name: "Finance & Accounting",
    icon: <Calculator className="h-4 w-4" />,
    subskills: [
      { id: "bookkeeping", name: "Bookkeeping" },
      { id: "budgeting-forecasting", name: "Budgeting & Forecasting" },
      { id: "payroll-processing", name: "Payroll Processing" },
      { id: "financial-reporting", name: "Financial Reporting" },
      { id: "accounting-software", name: "Accounting Software (Tally / QuickBooks / Zoho)" },
    ],
  },
  {
    id: "content-creation",
    name: "Content Creation",
    icon: <Palette className="h-4 w-4" />,
    subskills: [
      { id: "photography", name: "Photography (Event / Documentary)" },
      { id: "videography", name: "Videography / Shooting" },
      { id: "video-editing", name: "Video Editing" },
      { id: "photo-editing", name: "Photo Editing / Retouching" },
      { id: "motion-graphics", name: "Motion Graphics" },
      { id: "graphic-design", name: "Graphic Design" },
    ],
  },
  {
    id: "communication",
    name: "Communication",
    icon: <MessageSquare className="h-4 w-4" />,
    subskills: [
      { id: "donor-communications", name: "Donor Communications" },
      { id: "email-copywriting", name: "Email Copywriting" },
      { id: "press-release", name: "Press Release" },
      { id: "impact-story-writing", name: "Impact Story Writing" },
      { id: "annual-report-writing", name: "Annual Report Writing" },
    ],
  },
  {
    id: "planning-support",
    name: "Planning & Support",
    icon: <Users className="h-4 w-4" />,
    subskills: [
      { id: "volunteer-recruitment", name: "Volunteer Recruitment" },
      { id: "event-planning", name: "Event Planning" },
      { id: "event-onground-support", name: "Event On-Ground Support" },
      { id: "telecalling", name: "Telecalling" },
      { id: "customer-support", name: "Customer Support" },
      { id: "logistics-management", name: "Logistics Management" },
    ],
  },
] as const;

export const experienceLevels = [
  { id: "beginner", name: "Beginner", description: "Basic knowledge, internship-level" },
  { id: "intermediate", name: "Intermediate", description: "1–3 years experience" },
  { id: "advanced", name: "Advanced", description: "3–6 years experience" },
  { id: "expert", name: "Expert", description: "6+ years experience / specialist" },
] as const;

export const causes = [
  { id: "education", name: "Education", icon: <GraduationCap className="h-5 w-5" /> },
  { id: "healthcare", name: "Healthcare", icon: <Stethoscope className="h-5 w-5" /> },
  { id: "environment", name: "Environment", icon: <Leaf className="h-5 w-5" /> },
  { id: "poverty-alleviation", name: "Poverty Alleviation", icon: <HeartHandshake className="h-5 w-5" /> },
  { id: "women-empowerment", name: "Women Empowerment", icon: <Users className="h-5 w-5" /> },
  { id: "child-welfare", name: "Child Welfare", icon: <Baby className="h-5 w-5" /> },
  { id: "animal-welfare", name: "Animal Welfare", icon: <PawPrint className="h-5 w-5" /> },
  { id: "disaster-relief", name: "Disaster Relief", icon: <Tent className="h-5 w-5" /> },
  { id: "human-rights", name: "Human Rights", icon: <Scale className="h-5 w-5" /> },
  { id: "arts-culture", name: "Arts & Culture", icon: <Music className="h-5 w-5" /> },
  { id: "senior-citizens", name: "Senior Citizens", icon: <Accessibility className="h-5 w-5" /> },
  { id: "disability-support", name: "Disability Support", icon: <Accessibility className="h-5 w-5" /> },
] as const;

export const workModes = [
  { id: "remote", name: "Remote", icon: <Laptop className="h-6 w-6" /> },
  { id: "onsite", name: "On-site", icon: <Building2 className="h-6 w-6" /> },
  { id: "hybrid", name: "Hybrid", icon: <Globe className="h-6 w-6" /> },
] as const;

export const volunteerTypes = [
  { id: "free", name: "Pro-Bono", description: "Volunteer for free" },
  { id: "paid", name: "Paid", description: "Charge for your time" },
  { id: "both", name: "Both", description: "Flexible based on project" },
] as const;
