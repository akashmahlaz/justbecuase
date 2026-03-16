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
      { id: "influencer-marketing", name: "Influencer Marketing" },
      { id: "analytics-reporting", name: "Analytics & Reporting (GA4 / Meta Insights)" },
      { id: "content-marketing", name: "Content Marketing Strategy" },
      { id: "crm-management", name: "CRM Management (HubSpot / Mailchimp / Zoho)" },
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
      { id: "crowdfunding", name: "Crowdfunding (GoFundMe / Ketto / Milaap)" },
      { id: "csr-partnerships", name: "CSR Partnerships" },
      { id: "donor-management", name: "Donor Database Management" },
    ],
  },
  {
    id: "website",
    name: "Website & App Development",
    icon: <Monitor className="h-4 w-4" />,
    subskills: [
      { id: "wordpress-development", name: "WordPress Development" },
      { id: "ux-ui", name: "UX / UI Design" },
      { id: "html-css", name: "HTML / CSS" },
      { id: "website-security", name: "Website Security" },
      { id: "cms-maintenance", name: "CMS Maintenance" },
      { id: "website-redesign", name: "Website Redesign" },
      { id: "landing-page-optimization", name: "Landing Page Optimization" },
      { id: "react-nextjs", name: "React / Next.js Development" },
      { id: "nodejs-backend", name: "Node.js / Backend Development" },
      { id: "shopify-ecommerce", name: "Shopify / E-Commerce" },
      { id: "webflow-nocode", name: "Webflow / No-Code Tools" },
      { id: "mobile-app-development", name: "Mobile App Development (React Native / Flutter)" },
      { id: "api-integration", name: "API Integration" },
      { id: "database-management", name: "Database Management (MongoDB / PostgreSQL)" },
      { id: "devops-hosting", name: "DevOps / Hosting (Vercel / AWS / DigitalOcean)" },
      { id: "python-scripting", name: "Python / Scripting & Automation" },
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
      { id: "tax-compliance", name: "Tax Compliance (80G / 12A / FCRA)" },
      { id: "audit-support", name: "Audit Support" },
      { id: "financial-modelling", name: "Financial Modelling & Analysis" },
    ],
  },
  {
    id: "content-creation",
    name: "Content Creation & Design",
    icon: <Palette className="h-4 w-4" />,
    subskills: [
      { id: "photography", name: "Photography (Event / Documentary)" },
      { id: "videography", name: "Videography / Shooting" },
      { id: "video-editing", name: "Video Editing (Premiere Pro / DaVinci)" },
      { id: "photo-editing", name: "Photo Editing / Retouching" },
      { id: "motion-graphics", name: "Motion Graphics / After Effects" },
      { id: "graphic-design", name: "Graphic Design (Canva / Figma / Photoshop)" },
      { id: "social-media-content", name: "Social Media Content (Reels / Shorts / Stories)" },
      { id: "podcast-production", name: "Podcast Production" },
      { id: "illustration", name: "Illustration / Infographics" },
      { id: "branding-identity", name: "Branding & Visual Identity" },
      { id: "ai-content-tools", name: "AI Content Tools (ChatGPT / Midjourney / Canva AI)" },
      { id: "presentation-design", name: "Presentation Design (PowerPoint / Google Slides)" },
    ],
  },
  {
    id: "communication",
    name: "Communication & Writing",
    icon: <MessageSquare className="h-4 w-4" />,
    subskills: [
      { id: "donor-communications", name: "Donor Communications" },
      { id: "email-copywriting", name: "Email Copywriting" },
      { id: "press-release", name: "Press Release / Media Outreach" },
      { id: "impact-story-writing", name: "Impact Story Writing" },
      { id: "annual-report-writing", name: "Annual Report Writing" },
      { id: "blog-article-writing", name: "Blog / Article Writing" },
      { id: "social-media-copywriting", name: "Social Media Copywriting" },
      { id: "proposal-writing", name: "Proposal / RFP Writing" },
      { id: "newsletter-creation", name: "Newsletter Creation" },
      { id: "translation-localization", name: "Translation / Localization" },
      { id: "public-speaking", name: "Public Speaking / Training" },
    ],
  },
  {
    id: "planning-support",
    name: "Planning & Operations",
    icon: <Users className="h-4 w-4" />,
    subskills: [
      { id: "volunteer-recruitment", name: "Volunteer Recruitment & Management" },
      { id: "event-planning", name: "Event Planning & Coordination" },
      { id: "event-onground-support", name: "Event On-Ground Support" },
      { id: "telecalling", name: "Telecalling / Outreach" },
      { id: "customer-support", name: "Customer / Beneficiary Support" },
      { id: "logistics-management", name: "Logistics & Supply Chain" },
      { id: "project-management", name: "Project Management (Notion / Trello / Asana)" },
      { id: "data-entry", name: "Data Entry & Documentation" },
      { id: "research-surveys", name: "Research & Surveys" },
      { id: "monitoring-evaluation", name: "Monitoring & Evaluation (M&E)" },
      { id: "hr-recruitment", name: "HR & Recruitment" },
      { id: "training-facilitation", name: "Training & Workshop Facilitation" },
    ],
  },
  {
    id: "legal",
    name: "Legal & Compliance",
    icon: <Scale className="h-4 w-4" />,
    subskills: [
      { id: "legal-advisory", name: "Legal Advisory / Pro Bono Counsel" },
      { id: "ngo-registration", name: "NGO Registration (Trust / Society / Section 8)" },
      { id: "fcra-compliance", name: "FCRA Compliance" },
      { id: "contract-drafting", name: "Contract Drafting & Review" },
      { id: "policy-drafting", name: "Policy Drafting (HR / Privacy / Governance)" },
      { id: "ip-trademark", name: "IP / Trademark Registration" },
      { id: "rti-advocacy", name: "RTI / Legal Advocacy" },
    ],
  },
  {
    id: "data-technology",
    name: "Data & Technology",
    icon: <Laptop className="h-4 w-4" />,
    subskills: [
      { id: "data-analysis", name: "Data Analysis (Excel / Google Sheets / Power BI)" },
      { id: "data-visualization", name: "Data Visualization (Tableau / Looker)" },
      { id: "ai-ml", name: "AI / Machine Learning" },
      { id: "chatbot-development", name: "Chatbot Development" },
      { id: "it-support", name: "IT Support & Setup" },
      { id: "cybersecurity", name: "Cybersecurity Basics" },
      { id: "google-workspace", name: "Google Workspace / Microsoft 365 Setup" },
      { id: "automation-zapier", name: "Automation (Zapier / Make / n8n)" },
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
] as const; // fix #12: removed onsite and hybrid options

export const volunteerTypes = [
  { id: "free", name: "Pro-Bono", description: "Contribute for free" },
  { id: "paid", name: "Paid", description: "Charge for your time" },
  { id: "both", name: "Both", description: "Flexible based on opportunity" },
] as const;

// ============================================
// UTILITY: Fast subskillId → display name resolver
// ============================================
// Pre-built flat map so every component can resolve IDs in O(1)
const _skillNameMap = new Map<string, string>()
for (const cat of skillCategories) {
  for (const sub of cat.subskills) {
    _skillNameMap.set(sub.id, sub.name)
  }
}

/** Resolve a subskillId to its human-readable name. Falls back to title-cased ID. */
export function resolveSkillName(subskillId: string): string {
  return _skillNameMap.get(subskillId) || subskillId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}
