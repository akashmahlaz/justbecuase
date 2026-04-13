import { NextRequest, NextResponse } from "next/server"
import { elasticSearch, elasticSuggest } from "@/lib/es-search"
// MongoDB fallback (kept for graceful degradation)
import { unifiedSearch, getSearchSuggestions } from "@/lib/search-indexes"
import { trackEvent } from "@/lib/analytics"
import { isESAvailable, markESFailed } from "@/lib/elasticsearch"
import { getAlgoliaSearchClient, ALGOLIA_INDEXES } from "@/lib/algolia"
import { skillCategories, causes as causesList } from "@/lib/skills-data"
import { searchAnalyticsDb, teamMembersDb } from "@/lib/database"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { sendEmail, getZeroResultAlertEmailHtml, getIrrelevantResultAlertEmailHtml } from "@/lib/email"
import { adminSettingsDb } from "@/lib/database"
import crypto from "crypto"

const DEBUG_SEARCH = process.env.DEBUG_SEARCH === "true"

// ============================================
// FUTURE-PROOF SEARCH INTELLIGENCE
// Auto-builds role → skill mappings from platform data so any new
// skill added to skills-data.tsx is instantly searchable.
// ============================================

// ---- 1. Build skill & category lookups from platform data ----
const ALL_SKILL_NAMES: string[] = []
const CATEGORY_TO_SKILLS: Record<string, string[]> = {}
const SKILL_TO_CATEGORY_SKILLS: Record<string, string[]> = {}

for (const cat of skillCategories) {
  const skills = cat.subskills.map(s => s.name)
  ALL_SKILL_NAMES.push(...skills)
  CATEGORY_TO_SKILLS[cat.name.toLowerCase()] = skills
  CATEGORY_TO_SKILLS[cat.id] = skills
  // Map each skill name → its full category siblings (for related-skill expansion)
  for (const sub of cat.subskills) {
    SKILL_TO_CATEGORY_SKILLS[sub.name.toLowerCase()] = skills
  }
}

// ---- 2. Build cause name lookup for cause-based searches ----
const CAUSE_SEARCH_MAP: Record<string, string> = {}
for (const c of causesList) {
  CAUSE_SEARCH_MAP[c.name.toLowerCase()] = c.name
  CAUSE_SEARCH_MAP[c.id] = c.name
  // Common variations
  const words = c.name.toLowerCase().split(/[\s&-]+/).filter(w => w.length >= 3)
  for (const w of words) CAUSE_SEARCH_MAP[w] = c.name
}

// ---- 3. Comprehensive ROLE → SKILL manual mapping ----
// Covers every role/term a user might search, mapped to platform skill names.
// This is intentionally exhaustive — covers 200+ search terms.
const ROLE_TO_SKILLS: Record<string, string[]> = {
  // ======== Content Creation & Design ========
  "content creator": ["Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)", "Photo Editing / Retouching", "Graphic Design (Canva / Figma / Photoshop)", "Social Media Copywriting"],
  "content creation": ["Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)", "Photo Editing / Retouching", "Graphic Design (Canva / Figma / Photoshop)"],
  "video editor": ["Video Editing (Premiere Pro / DaVinci)", "Motion Graphics / After Effects"],
  "video editing": ["Video Editing (Premiere Pro / DaVinci)", "Motion Graphics / After Effects"],
  "video maker": ["Video Editing (Premiere Pro / DaVinci)", "Videography / Shooting", "Motion Graphics / After Effects"],
  "video creator": ["Video Editing (Premiere Pro / DaVinci)", "Videography / Shooting", "Social Media Content (Reels / Shorts / Stories)"],
  "videographer": ["Videography / Shooting", "Video Editing (Premiere Pro / DaVinci)"],
  "videography": ["Videography / Shooting", "Video Editing (Premiere Pro / DaVinci)"],
  "photographer": ["Photography (Event / Documentary)", "Photo Editing / Retouching"],
  "photography": ["Photography (Event / Documentary)", "Photo Editing / Retouching"],
  "photo editor": ["Photo Editing / Retouching", "Graphic Design (Canva / Figma / Photoshop)"],
  "photo editing": ["Photo Editing / Retouching"],
  "graphic designer": ["Graphic Design (Canva / Figma / Photoshop)", "Branding & Visual Identity", "Illustration / Infographics"],
  "graphic design": ["Graphic Design (Canva / Figma / Photoshop)", "Branding & Visual Identity"],
  "logo designer": ["Graphic Design (Canva / Figma / Photoshop)", "Branding & Visual Identity", "Illustration / Infographics"],
  "logo design": ["Graphic Design (Canva / Figma / Photoshop)", "Branding & Visual Identity"],
  "illustrator": ["Illustration / Infographics", "Graphic Design (Canva / Figma / Photoshop)"],
  "illustration": ["Illustration / Infographics", "Graphic Design (Canva / Figma / Photoshop)"],
  "infographic": ["Illustration / Infographics", "Data Visualization (Tableau / Looker)"],
  "animator": ["Motion Graphics / After Effects", "Video Editing (Premiere Pro / DaVinci)"],
  "animation": ["Motion Graphics / After Effects"],
  "motion designer": ["Motion Graphics / After Effects"],
  "motion graphics": ["Motion Graphics / After Effects"],
  "after effects": ["Motion Graphics / After Effects"],
  "podcaster": ["Podcast Production"],
  "podcast": ["Podcast Production"],
  "podcast production": ["Podcast Production"],
  "brand designer": ["Branding & Visual Identity", "Graphic Design (Canva / Figma / Photoshop)"],
  "branding expert": ["Branding & Visual Identity", "Graphic Design (Canva / Figma / Photoshop)"],
  "branding": ["Branding & Visual Identity", "Graphic Design (Canva / Figma / Photoshop)"],
  "visual identity": ["Branding & Visual Identity"],
  "presentation designer": ["Presentation Design (PowerPoint / Google Slides)"],
  "presentation design": ["Presentation Design (PowerPoint / Google Slides)"],
  "powerpoint": ["Presentation Design (PowerPoint / Google Slides)"],
  "google slides": ["Presentation Design (PowerPoint / Google Slides)"],
  "ui designer": ["UX / UI Design"],
  "ux designer": ["UX / UI Design"],
  "ux ui designer": ["UX / UI Design"],
  "ui ux": ["UX / UI Design"],
  "figma": ["UX / UI Design", "Graphic Design (Canva / Figma / Photoshop)"],
  "photoshop": ["Graphic Design (Canva / Figma / Photoshop)", "Photo Editing / Retouching"],
  "canva": ["Graphic Design (Canva / Figma / Photoshop)", "Social Media Content (Reels / Shorts / Stories)"],
  "canva designer": ["Graphic Design (Canva / Figma / Photoshop)", "Social Media Content (Reels / Shorts / Stories)"],
  "canva expert": ["Graphic Design (Canva / Figma / Photoshop)", "Social Media Content (Reels / Shorts / Stories)"],
  "reel maker": ["Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)"],
  "reels editor": ["Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)"],
  "reels": ["Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)"],
  "shorts creator": ["Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)"],
  "youtube editor": ["Video Editing (Premiere Pro / DaVinci)", "Social Media Content (Reels / Shorts / Stories)"],
  "thumbnail designer": ["Graphic Design (Canva / Figma / Photoshop)", "Photo Editing / Retouching"],
  "ai content": ["AI Content Tools (ChatGPT / Midjourney / Canva AI)"],
  "midjourney": ["AI Content Tools (ChatGPT / Midjourney / Canva AI)"],
  "chatgpt": ["AI Content Tools (ChatGPT / Midjourney / Canva AI)"],
  "ai tools": ["AI Content Tools (ChatGPT / Midjourney / Canva AI)", "AI / Machine Learning"],
  "designer": ["Graphic Design (Canva / Figma / Photoshop)", "UX / UI Design", "Branding & Visual Identity"],
  "designing": ["Graphic Design (Canva / Figma / Photoshop)", "UX / UI Design"],
  "creative": ["Graphic Design (Canva / Figma / Photoshop)", "Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)"],

  // ======== Digital Marketing ========
  "social media manager": ["Social Media Strategy", "Social Media Content (Reels / Shorts / Stories)", "Social Media Ads (Meta Ads / Facebook Ads)", "Social Media Copywriting"],
  "social media expert": ["Social Media Strategy", "Social Media Content (Reels / Shorts / Stories)", "Social Media Ads (Meta Ads / Facebook Ads)"],
  "social media": ["Social Media Strategy", "Social Media Content (Reels / Shorts / Stories)", "Social Media Ads (Meta Ads / Facebook Ads)"],
  "social media marketing": ["Social Media Strategy", "Social Media Content (Reels / Shorts / Stories)", "Social Media Ads (Meta Ads / Facebook Ads)"],
  "digital marketer": ["Social Media Strategy", "Content Marketing Strategy", "SEO / Content", "Social Media Ads (Meta Ads / Facebook Ads)"],
  "digital marketing": ["Social Media Strategy", "Content Marketing Strategy", "SEO / Content", "Social Media Ads (Meta Ads / Facebook Ads)"],
  "seo expert": ["SEO / Content", "Content Marketing Strategy"],
  "seo specialist": ["SEO / Content", "Content Marketing Strategy"],
  "seo": ["SEO / Content", "Content Marketing Strategy"],
  "marketer": ["Social Media Strategy", "Content Marketing Strategy", "Email Marketing / Automation"],
  "marketing": ["Social Media Strategy", "Content Marketing Strategy", "Email Marketing / Automation", "Social Media Ads (Meta Ads / Facebook Ads)"],
  "marketing manager": ["Social Media Strategy", "Content Marketing Strategy", "Analytics & Reporting (GA4 / Meta Insights)"],
  "ads expert": ["Social Media Ads (Meta Ads / Facebook Ads)", "PPC / Google Ads"],
  "ads manager": ["Social Media Ads (Meta Ads / Facebook Ads)", "PPC / Google Ads"],
  "facebook ads": ["Social Media Ads (Meta Ads / Facebook Ads)"],
  "meta ads": ["Social Media Ads (Meta Ads / Facebook Ads)"],
  "google ads": ["PPC / Google Ads"],
  "ppc": ["PPC / Google Ads"],
  "email marketer": ["Email Marketing / Automation", "Newsletter Creation"],
  "email marketing": ["Email Marketing / Automation", "Email Copywriting"],
  "community manager": ["Community Management", "Social Media Strategy"],
  "community management": ["Community Management"],
  "instagram manager": ["Social Media Strategy", "Social Media Content (Reels / Shorts / Stories)"],
  "influencer": ["Influencer Marketing", "Social Media Strategy"],
  "influencer marketing": ["Influencer Marketing"],
  "growth hacker": ["Social Media Strategy", "Content Marketing Strategy", "Analytics & Reporting (GA4 / Meta Insights)"],
  "analytics expert": ["Analytics & Reporting (GA4 / Meta Insights)", "Data Analysis (Excel / Google Sheets / Power BI)"],
  "analytics": ["Analytics & Reporting (GA4 / Meta Insights)", "Data Analysis (Excel / Google Sheets / Power BI)"],
  "crm manager": ["CRM Management (HubSpot / Mailchimp / Zoho)"],
  "crm": ["CRM Management (HubSpot / Mailchimp / Zoho)"],
  "hubspot": ["CRM Management (HubSpot / Mailchimp / Zoho)"],
  "mailchimp": ["CRM Management (HubSpot / Mailchimp / Zoho)", "Email Marketing / Automation"],
  "whatsapp marketer": ["WhatsApp Marketing"],
  "whatsapp marketing": ["WhatsApp Marketing"],
  "whatsapp": ["WhatsApp Marketing"],

  // ======== Social media platforms ========
  "instagram": ["Social Media Content (Reels / Shorts / Stories)", "Social Media Strategy"],
  "youtube": ["Video Editing (Premiere Pro / DaVinci)", "Social Media Content (Reels / Shorts / Stories)"],
  "tiktok": ["Social Media Content (Reels / Shorts / Stories)", "Video Editing (Premiere Pro / DaVinci)"],
  "facebook": ["Social Media Strategy", "Social Media Ads (Meta Ads / Facebook Ads)"],
  "linkedin": ["Social Media Strategy", "Social Media Copywriting"],
  "twitter": ["Social Media Strategy", "Social Media Copywriting"],

  // ======== Web & App Development ========
  "web developer": ["React / Next.js Development", "HTML / CSS", "WordPress Development", "Node.js / Backend Development"],
  "web development": ["React / Next.js Development", "HTML / CSS", "WordPress Development", "Node.js / Backend Development"],
  "frontend developer": ["React / Next.js Development", "HTML / CSS"],
  "frontend dev": ["React / Next.js Development", "HTML / CSS"],
  "frontend development": ["React / Next.js Development", "HTML / CSS"],
  "frontend": ["React / Next.js Development", "HTML / CSS"],
  "backend developer": ["Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)", "API Integration"],
  "backend dev": ["Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)"],
  "backend development": ["Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)"],
  "backend": ["Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)"],
  "fullstack developer": ["React / Next.js Development", "Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)"],
  "full stack developer": ["React / Next.js Development", "Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)"],
  "full stack": ["React / Next.js Development", "Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)"],
  "fullstack": ["React / Next.js Development", "Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)"],
  "app developer": ["Mobile App Development (React Native / Flutter)"],
  "app development": ["Mobile App Development (React Native / Flutter)"],
  "mobile developer": ["Mobile App Development (React Native / Flutter)"],
  "mobile development": ["Mobile App Development (React Native / Flutter)"],
  "ios developer": ["Mobile App Development (React Native / Flutter)"],
  "android developer": ["Mobile App Development (React Native / Flutter)"],
  "react developer": ["React / Next.js Development"],
  "react": ["React / Next.js Development"],
  "nextjs developer": ["React / Next.js Development"],
  "nextjs": ["React / Next.js Development"],
  "next.js": ["React / Next.js Development"],
  "node developer": ["Node.js / Backend Development"],
  "nodejs": ["Node.js / Backend Development"],
  "node.js": ["Node.js / Backend Development"],
  "wordpress developer": ["WordPress Development", "CMS Maintenance"],
  "wordpress expert": ["WordPress Development", "CMS Maintenance"],
  "wordpress": ["WordPress Development", "CMS Maintenance"],
  "shopify developer": ["Shopify / E-Commerce"],
  "shopify": ["Shopify / E-Commerce"],
  "ecommerce": ["Shopify / E-Commerce"],
  "e-commerce": ["Shopify / E-Commerce"],
  "webflow designer": ["Webflow / No-Code Tools"],
  "webflow": ["Webflow / No-Code Tools"],
  "no-code developer": ["Webflow / No-Code Tools"],
  "no code": ["Webflow / No-Code Tools"],
  "nocode": ["Webflow / No-Code Tools"],
  "devops engineer": ["DevOps / Hosting (Vercel / AWS / DigitalOcean)"],
  "devops": ["DevOps / Hosting (Vercel / AWS / DigitalOcean)"],
  "aws": ["DevOps / Hosting (Vercel / AWS / DigitalOcean)"],
  "vercel": ["DevOps / Hosting (Vercel / AWS / DigitalOcean)"],
  "python developer": ["Python / Scripting & Automation"],
  "python": ["Python / Scripting & Automation", "AI / Machine Learning"],
  "software engineer": ["React / Next.js Development", "Node.js / Backend Development", "Database Management (MongoDB / PostgreSQL)", "Python / Scripting & Automation"],
  "software development": ["React / Next.js Development", "Node.js / Backend Development", "Python / Scripting & Automation"],
  "programmer": ["React / Next.js Development", "Node.js / Backend Development", "Python / Scripting & Automation"],
  "programming": ["React / Next.js Development", "Node.js / Backend Development", "Python / Scripting & Automation"],
  "coder": ["React / Next.js Development", "Node.js / Backend Development", "Python / Scripting & Automation"],
  "coding": ["React / Next.js Development", "Node.js / Backend Development", "Python / Scripting & Automation"],
  "website designer": ["WordPress Development", "UX / UI Design", "HTML / CSS"],
  "web designer": ["WordPress Development", "UX / UI Design", "HTML / CSS"],
  "web design": ["WordPress Development", "UX / UI Design", "HTML / CSS"],
  "website builder": ["WordPress Development", "Webflow / No-Code Tools", "HTML / CSS"],
  "developer": ["React / Next.js Development", "Node.js / Backend Development", "WordPress Development"],
  "development": ["React / Next.js Development", "Node.js / Backend Development"],
  "api developer": ["API Integration", "Node.js / Backend Development"],
  "api integration": ["API Integration"],
  "database": ["Database Management (MongoDB / PostgreSQL)"],
  "mongodb": ["Database Management (MongoDB / PostgreSQL)"],
  "postgresql": ["Database Management (MongoDB / PostgreSQL)"],
  "html": ["HTML / CSS"],
  "css": ["HTML / CSS"],
  "website security": ["Website Security"],
  "website redesign": ["Website Redesign", "UX / UI Design"],
  "landing page": ["Landing Page Optimization", "HTML / CSS"],
  "react native": ["Mobile App Development (React Native / Flutter)"],
  "flutter": ["Mobile App Development (React Native / Flutter)"],

  // ======== Communication & Writing ========
  "content writer": ["Blog / Article Writing", "Content Marketing Strategy", "SEO / Content", "Social Media Copywriting"],
  "content writing": ["Blog / Article Writing", "Content Marketing Strategy", "SEO / Content"],
  "blog writer": ["Blog / Article Writing", "Content Marketing Strategy"],
  "blogger": ["Blog / Article Writing", "Content Marketing Strategy", "SEO / Content"],
  "blogging": ["Blog / Article Writing", "Content Marketing Strategy"],
  "article writer": ["Blog / Article Writing"],
  "copywriter": ["Email Copywriting", "Social Media Copywriting", "Blog / Article Writing"],
  "copywriting": ["Email Copywriting", "Social Media Copywriting", "Blog / Article Writing"],
  "writer": ["Blog / Article Writing", "Email Copywriting", "Social Media Copywriting", "Impact Story Writing"],
  "writing": ["Blog / Article Writing", "Email Copywriting", "Social Media Copywriting"],
  "type writing": ["Data Entry & Documentation", "Blog / Article Writing"],
  "typewriting": ["Data Entry & Documentation", "Blog / Article Writing"],
  "typing": ["Data Entry & Documentation"],
  "typist": ["Data Entry & Documentation"],
  "editor": ["Video Editing (Premiere Pro / DaVinci)", "Photo Editing / Retouching", "Blog / Article Writing"],
  "grant writer": ["Grant Writing", "Grant Research", "Proposal / RFP Writing"],
  "grant writing": ["Grant Writing", "Grant Research"],
  "proposal writer": ["Proposal / RFP Writing", "Grant Writing"],
  "translator": ["Translation / Localization"],
  "translation": ["Translation / Localization"],
  "localization": ["Translation / Localization"],
  "public speaker": ["Public Speaking / Training"],
  "public speaking": ["Public Speaking / Training"],
  "communications manager": ["Donor Communications", "Press Release / Media Outreach", "Email Copywriting"],
  "pr manager": ["Press Release / Media Outreach"],
  "press release": ["Press Release / Media Outreach"],
  "media outreach": ["Press Release / Media Outreach"],
  "newsletter writer": ["Newsletter Creation", "Email Copywriting"],
  "newsletter": ["Newsletter Creation", "Email Copywriting"],
  "story writer": ["Impact Story Writing", "Blog / Article Writing"],
  "report writer": ["Annual Report Writing", "Financial Reporting"],
  "annual report": ["Annual Report Writing"],
  "donor communications": ["Donor Communications"],

  // ======== Finance & Accounting ========
  "accountant": ["Bookkeeping", "Financial Reporting", "Tax Compliance (80G / 12A / FCRA)"],
  "accounting": ["Bookkeeping", "Financial Reporting", "Accounting Software (Tally / QuickBooks / Zoho)"],
  "bookkeeper": ["Bookkeeping", "Accounting Software (Tally / QuickBooks / Zoho)"],
  "bookkeeping": ["Bookkeeping", "Accounting Software (Tally / QuickBooks / Zoho)"],
  "financial analyst": ["Financial Modelling & Analysis", "Budgeting & Forecasting"],
  "auditor": ["Audit Support", "Financial Reporting"],
  "audit": ["Audit Support"],
  "tax consultant": ["Tax Compliance (80G / 12A / FCRA)"],
  "tax expert": ["Tax Compliance (80G / 12A / FCRA)"],
  "tax": ["Tax Compliance (80G / 12A / FCRA)"],
  "payroll specialist": ["Payroll Processing"],
  "payroll": ["Payroll Processing"],
  "finance manager": ["Financial Modelling & Analysis", "Budgeting & Forecasting", "Financial Reporting"],
  "finance": ["Bookkeeping", "Financial Reporting", "Budgeting & Forecasting", "Financial Modelling & Analysis"],
  "ca": ["Bookkeeping", "Tax Compliance (80G / 12A / FCRA)", "Audit Support"],
  "chartered accountant": ["Bookkeeping", "Tax Compliance (80G / 12A / FCRA)", "Audit Support", "Financial Reporting"],
  "tally": ["Accounting Software (Tally / QuickBooks / Zoho)"],
  "quickbooks": ["Accounting Software (Tally / QuickBooks / Zoho)"],
  "zoho": ["Accounting Software (Tally / QuickBooks / Zoho)", "CRM Management (HubSpot / Mailchimp / Zoho)"],
  "budgeting": ["Budgeting & Forecasting"],
  "forecasting": ["Budgeting & Forecasting"],

  // ======== Fundraising ========
  "fundraiser": ["Grant Writing", "Crowdfunding (GoFundMe / Ketto / Milaap)", "Fundraising Pitch Deck Support"],
  "fundraising": ["Grant Writing", "Crowdfunding (GoFundMe / Ketto / Milaap)", "Fundraising Pitch Deck Support", "Grant Research"],
  "grant researcher": ["Grant Research", "Grant Writing"],
  "grant research": ["Grant Research"],
  "crowdfunding expert": ["Crowdfunding (GoFundMe / Ketto / Milaap)"],
  "crowdfunding": ["Crowdfunding (GoFundMe / Ketto / Milaap)"],
  "gofundme": ["Crowdfunding (GoFundMe / Ketto / Milaap)"],
  "ketto": ["Crowdfunding (GoFundMe / Ketto / Milaap)"],
  "donor manager": ["Donor Database Management", "Major Gift Strategy"],
  "donor management": ["Donor Database Management", "Major Gift Strategy"],
  "csr expert": ["CSR Partnerships", "Corporate Sponsorship"],
  "csr": ["CSR Partnerships"],
  "sponsorship manager": ["Corporate Sponsorship"],
  "sponsorship": ["Corporate Sponsorship"],
  "pitch deck": ["Fundraising Pitch Deck Support"],

  // ======== Operations & Planning ========
  "event planner": ["Event Planning & Coordination", "Event On-Ground Support"],
  "event planning": ["Event Planning & Coordination", "Event On-Ground Support"],
  "event manager": ["Event Planning & Coordination", "Event On-Ground Support"],
  "event coordinator": ["Event Planning & Coordination"],
  "event": ["Event Planning & Coordination", "Event On-Ground Support"],
  "project manager": ["Project Management (Notion / Trello / Asana)"],
  "project management": ["Project Management (Notion / Trello / Asana)"],
  "program manager": ["Project Management (Notion / Trello / Asana)", "Monitoring & Evaluation (M&E)"],
  "program coordinator": ["Project Management (Notion / Trello / Asana)"],
  "recruiter": ["HR & Recruitment"],
  "recruitment": ["HR & Recruitment"],
  "hr manager": ["HR & Recruitment", "Training & Workshop Facilitation"],
  "hr": ["HR & Recruitment"],
  "human resources": ["HR & Recruitment"],
  "operations manager": ["Project Management (Notion / Trello / Asana)", "Logistics & Supply Chain"],
  "operations": ["Project Management (Notion / Trello / Asana)", "Logistics & Supply Chain"],
  "volunteer coordinator": ["Volunteer Recruitment & Management"],
  "volunteer manager": ["Volunteer Recruitment & Management"],
  "volunteer recruitment": ["Volunteer Recruitment & Management"],
  "researcher": ["Research & Surveys"],
  "research": ["Research & Surveys"],
  "data entry": ["Data Entry & Documentation"],
  "data entry operator": ["Data Entry & Documentation"],
  "telecaller": ["Telecalling / Outreach"],
  "telecalling": ["Telecalling / Outreach"],
  "customer support": ["Customer / Beneficiary Support"],
  "customer service": ["Customer / Beneficiary Support"],
  "outreach coordinator": ["Telecalling / Outreach", "Community Management"],
  "field worker": ["Event On-Ground Support", "Research & Surveys"],
  "field coordinator": ["Event On-Ground Support", "Logistics & Supply Chain"],
  "logistics": ["Logistics & Supply Chain"],
  "supply chain": ["Logistics & Supply Chain"],
  "trainer": ["Training & Workshop Facilitation", "Public Speaking / Training"],
  "training": ["Training & Workshop Facilitation"],
  "workshop facilitator": ["Training & Workshop Facilitation"],
  "monitoring evaluation": ["Monitoring & Evaluation (M&E)"],
  "m&e": ["Monitoring & Evaluation (M&E)"],
  "m&e specialist": ["Monitoring & Evaluation (M&E)"],
  "notion": ["Project Management (Notion / Trello / Asana)"],
  "trello": ["Project Management (Notion / Trello / Asana)"],
  "asana": ["Project Management (Notion / Trello / Asana)"],

  // ======== NGO / Social Sector ========
  "teacher": ["Public Speaking / Training", "Training & Workshop Facilitation"],
  "teaching": ["Public Speaking / Training", "Training & Workshop Facilitation"],
  "tutor": ["Public Speaking / Training", "Training & Workshop Facilitation"],
  "mentor": ["Training & Workshop Facilitation"],
  "mentoring": ["Training & Workshop Facilitation"],
  "coach": ["Training & Workshop Facilitation"],
  "counselor": ["Training & Workshop Facilitation"],
  "counsellor": ["Training & Workshop Facilitation"],
  "social worker": ["Volunteer Recruitment & Management", "Community Management"],
  "ngo consultant": ["Project Management (Notion / Trello / Asana)", "Monitoring & Evaluation (M&E)"],
  "impact analyst": ["Monitoring & Evaluation (M&E)", "Data Analysis (Excel / Google Sheets / Power BI)"],
  "campaigner": ["Social Media Strategy", "Press Release / Media Outreach"],
  "activist": ["Social Media Strategy", "Press Release / Media Outreach"],

  // ======== Legal & Compliance ========
  "lawyer": ["Legal Advisory / Pro Bono Counsel", "Contract Drafting & Review"],
  "advocate": ["Legal Advisory / Pro Bono Counsel"],
  "legal advisor": ["Legal Advisory / Pro Bono Counsel", "FCRA Compliance", "NGO Registration (Trust / Society / Section 8)"],
  "legal": ["Legal Advisory / Pro Bono Counsel", "Contract Drafting & Review", "FCRA Compliance"],
  "compliance officer": ["FCRA Compliance", "Policy Drafting (HR / Privacy / Governance)"],
  "compliance": ["FCRA Compliance", "Policy Drafting (HR / Privacy / Governance)"],
  "company secretary": ["Legal Advisory / Pro Bono Counsel", "Policy Drafting (HR / Privacy / Governance)"],
  "ngo registration": ["NGO Registration (Trust / Society / Section 8)"],
  "fcra": ["FCRA Compliance"],
  "contract": ["Contract Drafting & Review"],
  "policy drafting": ["Policy Drafting (HR / Privacy / Governance)"],
  "trademark": ["IP / Trademark Registration"],
  "ip": ["IP / Trademark Registration"],
  "rti": ["RTI / Legal Advocacy"],

  // ======== Data & Technology ========
  "data analyst": ["Data Analysis (Excel / Google Sheets / Power BI)", "Data Visualization (Tableau / Looker)"],
  "data analysis": ["Data Analysis (Excel / Google Sheets / Power BI)", "Data Visualization (Tableau / Looker)"],
  "data scientist": ["Data Analysis (Excel / Google Sheets / Power BI)", "AI / Machine Learning", "Data Visualization (Tableau / Looker)"],
  "data science": ["Data Analysis (Excel / Google Sheets / Power BI)", "AI / Machine Learning"],
  "ai engineer": ["AI / Machine Learning"],
  "ml engineer": ["AI / Machine Learning"],
  "ai": ["AI / Machine Learning", "AI Content Tools (ChatGPT / Midjourney / Canva AI)"],
  "machine learning": ["AI / Machine Learning"],
  "chatbot developer": ["Chatbot Development"],
  "chatbot": ["Chatbot Development"],
  "it support": ["IT Support & Setup", "Google Workspace / Microsoft 365 Setup"],
  "it expert": ["IT Support & Setup", "Google Workspace / Microsoft 365 Setup"],
  "it": ["IT Support & Setup"],
  "cybersecurity expert": ["Cybersecurity Basics"],
  "cybersecurity": ["Cybersecurity Basics"],
  "cyber security": ["Cybersecurity Basics"],
  "automation expert": ["Automation (Zapier / Make / n8n)"],
  "automation": ["Automation (Zapier / Make / n8n)", "Python / Scripting & Automation"],
  "zapier": ["Automation (Zapier / Make / n8n)"],
  "excel expert": ["Data Analysis (Excel / Google Sheets / Power BI)"],
  "excel": ["Data Analysis (Excel / Google Sheets / Power BI)"],
  "google sheets": ["Data Analysis (Excel / Google Sheets / Power BI)"],
  "power bi": ["Data Analysis (Excel / Google Sheets / Power BI)", "Data Visualization (Tableau / Looker)"],
  "tableau": ["Data Visualization (Tableau / Looker)"],
  "looker": ["Data Visualization (Tableau / Looker)"],
  "google workspace": ["Google Workspace / Microsoft 365 Setup"],
  "microsoft 365": ["Google Workspace / Microsoft 365 Setup"],

  // ======== Generic catch-all role terms ========
  "manager": ["Project Management (Notion / Trello / Asana)"],
  "consultant": ["Project Management (Notion / Trello / Asana)", "Monitoring & Evaluation (M&E)"],
  "strategist": ["Social Media Strategy", "Content Marketing Strategy"],
  "specialist": ["Social Media Strategy"],
  "coordinator": ["Event Planning & Coordination", "Project Management (Notion / Trello / Asana)"],
  "assistant": ["Data Entry & Documentation", "Customer / Beneficiary Support"],
  "intern": ["Data Entry & Documentation", "Research & Surveys"],

  // ======== Platform term ========
  "impact agent": ["Volunteer Recruitment & Management"],
  "volunteer": ["Volunteer Recruitment & Management"],
}

// ---- 4. Auto-generate reverse entries from all platform skill names ----
// This ensures ANY skill name (including future additions) is searchable.
// e.g. "video editing" auto-maps to its category siblings.
for (const cat of skillCategories) {
  for (const sub of cat.subskills) {
    const fullName = sub.name.toLowerCase()
    if (!ROLE_TO_SKILLS[fullName]) {
      ROLE_TO_SKILLS[fullName] = [sub.name]
    }
    // Also index the simplified name (strip parenthetical details)
    // e.g. "Video Editing (Premiere Pro / DaVinci)" → "video editing"
    const simplified = fullName.replace(/\s*\(.*\)$/, "").trim()
    if (simplified !== fullName && !ROLE_TO_SKILLS[simplified]) {
      ROLE_TO_SKILLS[simplified] = ROLE_TO_SKILLS[fullName]
    }
    // Index by subskill ID slug: "blog-article-writing" → "blog article writing"
    const fromId = sub.id.replace(/-/g, " ")
    if (!ROLE_TO_SKILLS[fromId]) {
      ROLE_TO_SKILLS[fromId] = ROLE_TO_SKILLS[fullName]
    }
  }
}

// Pre-sort role keys by length descending (for longest-match-first lookups)
const ROLE_KEYS_SORTED = Object.keys(ROLE_TO_SKILLS).sort((a, b) => b.length - a.length)

/** Simple stemming — strips common English suffixes for fuzzy matching */
function simpleStem(word: string): string {
  let w = word.toLowerCase().trim()
  if (w.length <= 4) return w
  if (w.endsWith("ation")) return w.slice(0, -5)
  if (w.endsWith("ment")) return w.slice(0, -4)
  if (w.endsWith("ness")) return w.slice(0, -4)
  if (w.endsWith("ists")) return w.slice(0, -4)
  if (w.endsWith("ting")) return w.slice(0, -4)
  if (w.endsWith("ings")) return w.slice(0, -4)
  if (w.endsWith("iers")) return w.slice(0, -4)
  if (w.endsWith("ers")) return w.slice(0, -3)
  if (w.endsWith("ing")) return w.slice(0, -3)
  if (w.endsWith("ist")) return w.slice(0, -3)
  if (w.endsWith("ity")) return w.slice(0, -3)
  if (w.endsWith("ion")) return w.slice(0, -3)
  if (w.endsWith("ous")) return w.slice(0, -3)
  if (w.endsWith("ive")) return w.slice(0, -3)
  if (w.endsWith("er")) return w.slice(0, -2)
  if (w.endsWith("ed")) return w.slice(0, -2)
  if (w.endsWith("or")) return w.slice(0, -2)
  if (w.endsWith("ly")) return w.slice(0, -2)
  if (w.endsWith("al")) return w.slice(0, -2)
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1)
  return w
}

/**
 * Expand a user query into platform skill names.
 *
 * Resolution order:
 *  1. Exact match in ROLE_TO_SKILLS
 *  2. Skill category name match (e.g. "finance" → all finance skills)
 *  3. Longest role phrase found inside the query
 *  4. Stemmed query match
 *  5. Multi-word: combine skills from each matching word
 *  6. Direct word-to-skill-name fuzzy match (handles any future skill)
 */
function expandRoleToSkills(query: string): string[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  // 1. Exact match
  if (ROLE_TO_SKILLS[q]) return ROLE_TO_SKILLS[q]

  // 2. Category match — "finance help", "legal", "marketing skills"
  const qClean = q.replace(/\b(help|skills?|expert|assistance|support|services?|specialist|work)\b/gi, "").trim()
  for (const [catKey, skills] of Object.entries(CATEGORY_TO_SKILLS)) {
    if (qClean === catKey || q === catKey) return skills
  }

  // 3. Longest role phrase inside the query
  for (const role of ROLE_KEYS_SORTED) {
    if (q.includes(role)) return ROLE_TO_SKILLS[role]
  }

  // 4. Stemmed query match — "designers" → "design", "programming" → "programm"
  const stemmed = q.split(/\s+/).map(simpleStem).join(" ")
  if (stemmed !== q && ROLE_TO_SKILLS[stemmed]) return ROLE_TO_SKILLS[stemmed]
  // Also try stemmed lookup in the sorted keys
  for (const role of ROLE_KEYS_SORTED) {
    const roleStemmed = role.split(/\s+/).map(simpleStem).join(" ")
    if (stemmed.includes(roleStemmed) && roleStemmed.length >= 4) return ROLE_TO_SKILLS[role]
  }

  // 5. Multi-word: split query into words and collect skills from each
  const words = q.split(/\s+/).filter(w => w.length >= 3)
  if (words.length >= 2) {
    const combined = new Set<string>()
    for (const word of words) {
      if (ROLE_TO_SKILLS[word]) {
        for (const s of ROLE_TO_SKILLS[word]) combined.add(s)
      }
    }
    if (combined.size > 0) return Array.from(combined).slice(0, 8)
  }

  // 6. Fuzzy: match query words directly against ALL_SKILL_NAMES
  //    This is the key future-proofing — any new skill is auto-searchable.
  const qWords = q.split(/\s+/).filter(w => w.length >= 3)
  const fuzzyMatches: string[] = []
  for (const skillName of ALL_SKILL_NAMES) {
    const sLower = skillName.toLowerCase()
    const sSimplified = sLower.replace(/\s*\(.*\)$/, "")
    const sWords = sSimplified.split(/[\s/&]+/).filter(w => w.length >= 3)
    // Accept if any query word matches any skill word (stemmed)
    const matchCount = qWords.filter(qw => {
      const qStem = simpleStem(qw)
      return sWords.some(sw => {
        const sStem = simpleStem(sw)
        return qStem === sStem || sw.includes(qw) || qw.includes(sw)
      })
    }).length
    if (matchCount > 0 && (matchCount >= Math.ceil(qWords.length / 2) || qWords.length === 1)) {
      fuzzyMatches.push(skillName)
    }
  }
  if (fuzzyMatches.length > 0) return fuzzyMatches.slice(0, 6)

  return []
}

// ============================================
// Unified Search API — Algolia-first, ES + MongoDB fallback
// ============================================

const ALGOLIA_ENABLED = !!(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY)
const ELASTICSEARCH_ENABLED = !!(process.env.ELASTICSEARCH_URL && process.env.ELASTICSEARCH_API_KEY)

function parseHoursPerWeekUpperBound(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) return Number(rangeMatch[2])

  const plusMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\+/)
  if (plusMatch) return Number(plusMatch[1])

  const numberMatch = normalized.match(/\d+(?:\.\d+)?/)
  return numberMatch ? Number(numberMatch[0]) : null
}

function parseHoursPerWeekLowerBound(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) return Number(rangeMatch[1])

  const plusMatch = normalized.match(/(\d+(?:\.\d+)?)\s*\+/)
  if (plusMatch) return Number(plusMatch[1])

  const numberMatch = normalized.match(/\d+(?:\.\d+)?/)
  return numberMatch ? Number(numberMatch[0]) : null
}

function parseNaturalLanguageFilters(rawQuery: string) {
  let q = rawQuery.trim().replace(/\s+/g, " ")
  const f: Record<string, any> = {}

  // Helper: consume first matching pattern
  function consume(patterns: Array<[RegExp, string]>, key: string) {
    for (const [pat, val] of patterns) {
      if (pat.test(q)) {
        f[key] = val
        q = q.replace(pat, " ")
        return true
      }
    }
    return false
  }

  // 1. Work mode
  consume([
    [/\b(remote|wfh|work\s*from\s*home|virtual|online)\b/i, "remote"],
    [/\b(on-?site|on\s+site|in-?\s*person|in\s+person|office)\b/i, "onsite"],
    [/\bhybrid\b/i, "hybrid"],
  ], "workMode")

  // 2. Volunteer type
  consume([
    [/\b(pro[\s-]?bono)\b/i, "free"],
    [/\bfree\b/i, "free"],
    [/\bpaid\b/i, "paid"],
    [/\b(either|both)\b/i, "both"],
  ], "volunteerType")

  // 3. Experience level (Algolia facet values on opportunities)
  consume([
    [/\b(beginner|entry[\s-]?level|junior)\b/i, "beginner"],
    [/\b(intermediate|mid[\s-]?level)\b/i, "intermediate"],
    [/\badvanced\b/i, "advanced"],
    [/\bexpert\b/i, "expert"],
  ], "experienceLevel")

  // 4. Availability (Algolia facet on volunteers)
  consume([
    [/\b(weekdays?|week\s*days?)\b/i, "weekdays"],
    [/\b(weekends?|week\s*ends?)\b/i, "weekends"],
    [/\b(evenings?|after[\s-]?hours?|nights?)\b/i, "evenings"],
    [/\bflexible\b/i, "flexible"],
  ], "availability")

  // 5. Verified filter
  const verifiedMatch = q.match(/\b(verified|trusted)\b/i)
  if (verifiedMatch) {
    f.isVerified = true
    q = q.replace(verifiedMatch[0], " ")
  }

  // 6. Rating — explicit numeric ("4 stars", "4+ rated", "rating above 3")
  const ratingPatterns = [
    /\b(\d+(?:\.\d+)?)\s*\+?\s*stars?\b/i,
    /\b(\d+(?:\.\d+)?)\s*\+?\s*rated?\b/i,
    /\bratings?\s*(?:above|over|>=?|at\s*least)\s*(\d+(?:\.\d+)?)\b/i,
  ]
  for (const pat of ratingPatterns) {
    const m = q.match(pat)
    if (m) {
      f.minRating = Math.min(Number(m[1]), 5)
      q = q.replace(m[0], " ")
      break
    }
  }
  // Quality keywords → implied minRating 4
  if (!f.minRating) {
    const qualityMatch = q.match(/\b(top[\s-]?rated|highly[\s-]?rated|best|top\s+quality)\b/i)
    if (qualityMatch) {
      f.minRating = 4
      q = q.replace(qualityMatch[0], " ")
    }
  }

  // 7. Hours per week — parse BEFORE money to avoid "10 hours" matching dollar patterns
  //    Supports: "5 hours a week", "10-20 hrs/week", "5 to 10 hours per week"
  const hrsRangeMatch = q.match(/\b(\d+)\s*(?:to|-)\s*(\d+)\s*(?:hours?|hrs?)\s*(?:per|\/|a)?\s*week\b/i)
  if (hrsRangeMatch) {
    f.maxHoursPerWeek = Number(hrsRangeMatch[2])
    q = q.replace(hrsRangeMatch[0], " ")
  } else {
    const hrsSingleMatch = q.match(/\b(\d+)\s*(?:hours?|hrs?)\s*(?:per|\/|a)?\s*week\b/i)
    if (hrsSingleMatch) {
      f.maxHoursPerWeek = Number(hrsSingleMatch[1])
      q = q.replace(hrsSingleMatch[0], " ")
    }
  }

  // Part-time / full-time → implied hours
  if (!f.maxHoursPerWeek && !f.minHoursPerWeek) {
    const ptMatch = q.match(/\b(part[\s-]?time)\b/i)
    if (ptMatch) {
      f.maxHoursPerWeek = 20
      q = q.replace(ptMatch[0], " ")
    } else {
      const ftMatch = q.match(/\b(full[\s-]?time)\b/i)
      if (ftMatch) {
        f.minHoursPerWeek = 35
        q = q.replace(ftMatch[0], " ")
      }
    }
  }

  // 8. Money + time-period detection
  //    Handle: "$10/hr", "10 dollars per week", "under $50 per hour",
  //    "10$/week", "10 bucks", "€50/month", "₹500"
  const currencySymbols = /[$€£₹]/
  const currencyWords = /(?:usd|dollars?|bucks?|inr|rupees?|rs\.?|eur(?:os?)?|gbp|pounds?)/i
  const timePeriods = /(?:per|a|an|\/|every)\s*(?:hour|hr|week|wk|month|mo)\b/i

  // Pattern A: explicit "$ amount / period" — e.g. "under $50 per hour", "$10/week"
  const moneyWithPeriod = q.match(
    new RegExp(
      `\\b(?:under|below|less\\s*than|upto|up\\s*to|max(?:imum)?|budget(?:\\s*of)?|within)?\\s*` +
      `(?:${currencySymbols.source})?\\s*(\\d+(?:\\.\\d+)?)\\s*` +
      `(?:${currencySymbols.source})?\\s*` +
      `(?:${currencyWords.source})?\\s*` +
      `(?:per|a|an|\\/|every)\\s*(hour|hr|week|wk|month|mo)\\b`,
      "i"
    )
  )

  if (moneyWithPeriod) {
    const amount = Number(moneyWithPeriod[1])
    const period = moneyWithPeriod[2].toLowerCase()
    q = q.replace(moneyWithPeriod[0], " ")
    if (period === "hour" || period === "hr") f.maxHourlyRate = amount
    else if (period === "week" || period === "wk") f.maxWeeklyBudget = amount
    else if (period === "month" || period === "mo") f.maxMonthlyBudget = amount
  } else {
    // Pattern B: dollar amount without explicit period
    //   e.g. "under $50", "$10", "10 dollars", "10$", "₹500"
    const bareMoney = q.match(
      new RegExp(
        `\\b(?:under|below|less\\s*than|upto|up\\s*to|max(?:imum)?|budget(?:\\s*of)?|within)?\\s*` +
        `(?:${currencySymbols.source})\\s*(\\d+(?:\\.\\d+)?)(?:\\s*${currencyWords.source})?\\b`,
        "i"
      )
    ) || q.match(
      new RegExp(
        `\\b(\\d+(?:\\.\\d+)?)\\s*(?:${currencySymbols.source})(?:\\s*${currencyWords.source})?\\b`,
        "i"
      )
    ) || q.match(
      new RegExp(
        `\\b(?:under|below|less\\s*than|upto|up\\s*to|max(?:imum)?|budget(?:\\s*of)?)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${currencyWords.source})\\b`,
        "i"
      )
    ) || q.match(
      new RegExp(
        `\\b(\\d+(?:\\.\\d+)?)\\s+(?:${currencyWords.source})\\b`,
        "i"
      )
    )

    if (bareMoney) {
      const amount = Number(bareMoney[1])
      q = q.replace(bareMoney[0], " ")

      // Check if a trailing period word remains after removing the dollar phrase
      const trailingPeriod = q.match(/\b(?:per|a|an|\/|every)\s*(hour|hr|week|wk|month|mo)\b/i)
      if (trailingPeriod) {
        q = q.replace(trailingPeriod[0], " ")
        const period = trailingPeriod[1].toLowerCase()
        if (period === "hour" || period === "hr") f.maxHourlyRate = amount
        else if (period === "week" || period === "wk") f.maxWeeklyBudget = amount
        else if (period === "month" || period === "mo") f.maxMonthlyBudget = amount
      } else {
        // No period → default to hourly rate
        f.maxHourlyRate = amount
      }
    }
  }

  // 9. Strip conversational intent phrases — comprehensive list
  //    "someone who makes videos" → "videos"
  //    "i need someone for social media" → "social media"
  //    "looking for a designer" → "designer"
  //    "help me find a writer" → "writer"
  //    "can you suggest a good accountant" → "accountant"
  //    "we are hiring a developer" → "developer"
  //    "where can i find a lawyer" → "lawyer"
  q = q
    .replace(/\b(?:i\s+(?:am\s+)?(?:need|want|looking\s+for|searching\s+for)|(?:we|i)\s+(?:need|want|are\s+looking\s+for|are\s+searching\s+for|are\s+hiring)|find\s+(?:me|us)|help\s+(?:me|us)\s+find|looking\s+for|searching\s+for|search\s+for|someone\s+(?:who|that|for|to)\s+(?:can|does|makes?|creates?|knows?|is|will|would|could|handles?|manages?|helps?\s+with|works?\s+(?:on|with|in))?|someone\s+(?:for|to)|(?:we\s+are|i\s+am)\s+looking\s+for|please\s+(?:find|suggest|recommend|show|get)|can\s+you\s+(?:find|suggest|recommend|show|get)|show\s+me|get\s+me|suggest\s+(?:me|us)?|recommend\s+(?:me|us)?|need\s+(?:a|an)|where\s+(?:can\s+)?(?:i|we)\s+(?:find|get|hire)|(?:i|we)\s+(?:want|need)\s+to\s+(?:find|hire|get)|hire\s+(?:a|an)?|hiring\s+(?:a|an)?|do\s+you\s+have)\s*/gi, " ")
    // Strip leading articles after intent removal
    .replace(/^\s*\b(a|an|the|some|any|good|best|top|experienced|skilled|professional|me|us)\b\s*/i, " ")
    // "freelance" / "freelancer" → treat as volunteerType:paid if not already set
    .replace(/\bfreelance[r]?\b/gi, () => {
      if (!f.volunteerType) f.volunteerType = "paid"
      return " "
    })
    // Strip trailing noise words
    .replace(/\b(help|assistance|support|services?|work|tasks?|jobs?|opportunities?|gig|needed|required|wanted|available|near\s+me|nearby|in\s+my\s+area)\s*$/gi, " ")
    // Strip leading noise after all stripping
    .replace(/^\s*\b(for|with|in|on|at|to|who|that|and|or)\b\s*/i, " ")

  // 10. Cleanup residual noise
  q = q
    .replace(/\b(per|an?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return { cleanedQuery: q, inferredFilters: f }
}

function normalizeSearchToken(value: string): string {
  let normalized = value.toLowerCase().trim()
  if (!normalized) return ""

  normalized = normalized.replace(/[^a-z0-9]+/g, "")
  if (normalized.endsWith("ment") && normalized.length > 6) normalized = normalized.slice(0, -4)
  if (normalized.endsWith("ers") && normalized.length > 5) normalized = normalized.slice(0, -3)
  else if (normalized.endsWith("er") && normalized.length > 4) normalized = normalized.slice(0, -2)
  else if (normalized.endsWith("ing") && normalized.length > 5) normalized = normalized.slice(0, -3)
  else if (normalized.endsWith("ed") && normalized.length > 4) normalized = normalized.slice(0, -2)
  return normalized
}

function getMeaningfulQueryTerms(query: string): string[] {
  const stopWords = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "with"])
  return Array.from(new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .map(normalizeSearchToken)
      .filter((term) => term.length >= 3 && !stopWords.has(term))
  ))
}

function hasStrongLexicalMatch(result: Record<string, any>, query: string, roleSkillNames?: string[]): boolean {
  const terms = getMeaningfulQueryTerms(query)
  if (terms.length <= 1 && (!roleSkillNames || roleSkillNames.length === 0)) return true

  const candidateParts = [
    result.title,
    result.subtitle,
    result.description,
    result.location,
    result.ngoName,
    ...(Array.isArray(result.skills) ? result.skills : []),
    ...(Array.isArray(result.causes) ? result.causes : []),
  ].filter(Boolean)

  const normalizedText = candidateParts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")

  // Standard term matching
  let matchedTerms = 0
  for (const term of terms) {
    if (!term) continue
    if (normalizedText.includes(term)) matchedTerms += 1
  }

  const directMatch = matchedTerms >= Math.min(2, terms.length)
  if (directMatch) return true

  // Role-skill overlap: accept results whose skills overlap with the
  // expanded skill set. Handles full skill names like
  // "Video Editing (Premiere Pro / DaVinci)" by stripping parentheticals
  // and matching core words.
  if (roleSkillNames && roleSkillNames.length > 0) {
    const resultSkills = (Array.isArray(result.skills) ? result.skills : []) as string[]
    for (const skill of roleSkillNames) {
      // Strip parenthetical detail for matching: "Video Editing (Premiere Pro / DaVinci)" → "video editing"
      const coreSkill = skill.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]+/g, " ").trim()
      if (normalizedText.includes(coreSkill)) return true
      // Also check each result skill's core name
      for (const rs of resultSkills) {
        const rsCore = rs.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]+/g, " ").trim()
        if (rsCore.includes(coreSkill) || coreSkill.includes(rsCore)) return true
      }
    }
  }

  // For single-term queries, always pass (Algolia relevance handles ranking)
  if (terms.length <= 1) return true

  return false
}

function mapTypes(types: string[] | undefined): ("volunteer" | "ngo" | "project" | "blog" | "page")[] | undefined {
  if (!types) return undefined
  return types.map(t => t === "opportunity" ? "project" : t) as any
}

function mapResultType(type: string): string {
  return type === "project" ? "opportunity" : type
}

// ============================================
// REQUEST METADATA EXTRACTION FOR ENHANCED TRACKING
// ============================================
function extractRequestMeta(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"
  const referer = request.headers.get("referer") || undefined

  // Detect device type from user-agent
  let deviceType = "desktop"
  const uaLower = userAgent.toLowerCase()
  if (/bot|crawler|spider|slurp|googlebot|bingbot/i.test(uaLower)) {
    deviceType = "bot"
  } else if (/mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile/i.test(uaLower)) {
    deviceType = /ipad|tablet/i.test(uaLower) ? "tablet" : "mobile"
  }

  // Generate anonymous ID from IP+UA for anonymous user grouping
  const anonymousId = crypto.createHash("sha256").update(`${ip}:${userAgent}`).digest("hex").slice(0, 16)

  // Extract userId from cookie/session if available (non-blocking)
  const sessionCookie = request.cookies.get("better-auth.session_token")?.value
  const userId = sessionCookie ? undefined : undefined // Will be enriched later if session exists

  return { ip, userAgent, deviceType, anonymousId, referer, userId }
}

// Rate-limit zero-result alerts: max 1 email per query per hour
const zeroResultAlertCache = new Map<string, number>()

async function sendZeroResultAlert(query: string, engine: string, filters?: Record<string, any>) {
  try {
    const cacheKey = query.toLowerCase().trim()
    const lastSent = zeroResultAlertCache.get(cacheKey)
    if (lastSent && Date.now() - lastSent < 3600000) return // 1 hour cooldown

    zeroResultAlertCache.set(cacheKey, Date.now())
    // Clean old entries
    if (zeroResultAlertCache.size > 500) {
      const cutoff = Date.now() - 3600000
      for (const [k, v] of zeroResultAlertCache) {
        if (v < cutoff) zeroResultAlertCache.delete(k)
      }
    }

    // Send to all team members + admin
    const teamEmails = await getTeamEmails()
    const html = getZeroResultAlertEmailHtml(query, engine, filters)
    await Promise.allSettled(
      teamEmails.map(email =>
        sendEmail({
          to: email,
          subject: `[JBC Search Alert] Zero results for "${query}"`,
          html,
        })
      )
    )
  } catch (err) {
    console.error("[Search] Failed to send zero-result alert:", err)
  }
}

// Rate-limit irrelevant result alerts
const irrelevantAlertCache = new Map<string, number>()

async function sendIrrelevantResultAlert(query: string, engine: string, resultCount: number, topResultTitles: string[]) {
  try {
    const cacheKey = query.toLowerCase().trim()
    const lastSent = irrelevantAlertCache.get(cacheKey)
    if (lastSent && Date.now() - lastSent < 3600000) return

    irrelevantAlertCache.set(cacheKey, Date.now())
    if (irrelevantAlertCache.size > 500) {
      const cutoff = Date.now() - 3600000
      for (const [k, v] of irrelevantAlertCache) {
        if (v < cutoff) irrelevantAlertCache.delete(k)
      }
    }

    const teamEmails = await getTeamEmails()
    const html = getIrrelevantResultAlertEmailHtml(query, engine, resultCount, topResultTitles)
    await Promise.allSettled(
      teamEmails.map(email =>
        sendEmail({
          to: email,
          subject: `[JBC Search Alert] Potentially irrelevant results for "${query}"`,
          html,
        })
      )
    )
  } catch (err) {
    console.error("[Search] Failed to send irrelevant result alert:", err)
  }
}

/** Get all team member emails for notifications */
async function getTeamEmails(): Promise<string[]> {
  const emails = new Set<string>()
  emails.add("admin@justbecausenetwork.com")
  try {
    const teamMembers = await teamMembersDb.findActive()
    for (const m of teamMembers) {
      if (m.email) emails.add(m.email)
    }
  } catch (err) {
    console.error("[Search] Failed to fetch team emails:", err)
  }
  return Array.from(emails)
}

/** Search external opportunities and map to unified result format (looks like native) */
async function searchExternalOpportunities(query: string, limit: number = 10): Promise<any[]> {
  try {
    const results = await externalOpportunitiesDb.search(query, limit)
    return results.map((opp: any) => ({
      id: `ext-${opp._id?.toString() || opp.externalId}`,
      mongoId: `ext-${opp._id?.toString() || opp.externalId}`,
      type: "opportunity",
      title: opp.title || "",
      subtitle: opp.organization || "",
      description: opp.shortDescription || opp.title || "",
      url: opp.sourceUrl || "",
      score: 80,
      highlights: [],
      location: opp.location || undefined,
      skills: opp.skillTags || undefined,
      causes: opp.causes || undefined,
      workMode: opp.workMode || undefined,
      ngoName: opp.organization || undefined,
      experienceLevel: opp.experienceLevel || undefined,
      verified: false,
      isExternal: true,
      sourceplatform: opp.sourceplatform || undefined,
    }))
  } catch (err) {
    console.error("[Search] External opportunities search failed:", err)
    return []
  }
}

function mergeExternalIntoResults(baseResults: any[], externalResults: any[], limit: number): any[] {
  if (externalResults.length === 0) return baseResults.slice(0, limit)

  const merged: any[] = []
  const seen = new Set(baseResults.map((result: any) => `${result.type}:${result.id}`))
  const dedupedExternal = externalResults.filter((result: any) => {
    const key = `${result.type}:${result.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  let baseIndex = 0
  let externalIndex = 0

  while (merged.length < limit && (baseIndex < baseResults.length || externalIndex < dedupedExternal.length)) {
    for (let count = 0; count < 3 && merged.length < limit && baseIndex < baseResults.length; count++) {
      merged.push(baseResults[baseIndex++])
    }

    if (merged.length < limit && externalIndex < dedupedExternal.length) {
      merged.push(dedupedExternal[externalIndex++])
    }

    if (baseIndex >= baseResults.length) {
      while (merged.length < limit && externalIndex < dedupedExternal.length) {
        merged.push(dedupedExternal[externalIndex++])
      }
    }
  }

  return merged.slice(0, limit)
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get("q") || ""
    const typesParam = searchParams.get("types")
    const limitParam = searchParams.get("limit")
    const mode = searchParams.get("mode") || "full"
    const sort = (searchParams.get("sort") || "relevance") as "relevance" | "newest" | "rating"
    const filtersParam = searchParams.get("filters")
    const engine = searchParams.get("engine") || (ALGOLIA_ENABLED ? "algolia" : ELASTICSEARCH_ENABLED && isESAvailable() ? "es" : "mongo")

    // Extract request metadata for enhanced tracking
    const reqMeta = extractRequestMeta(request)

    const { cleanedQuery, inferredFilters } = parseNaturalLanguageFilters(rawQuery)
    const query = cleanedQuery || rawQuery.trim()

    if (DEBUG_SEARCH) console.log(`\n🔍 [Search API] ========== ${mode.toUpperCase()} REQUEST ==========`)
    if (DEBUG_SEARCH) console.log(`🔍 [Search API] Query: "${rawQuery}"`)
    if (DEBUG_SEARCH) console.log(`🔍 [Search API] Mode: ${mode} | Engine: ${engine} | Types: ${typesParam || "all"} | Limit: ${limitParam || "default"} | Sort: ${sort}`)
    if (DEBUG_SEARCH) console.log(`🔍 [Search API] ALGOLIA_ENABLED: ${ALGOLIA_ENABLED} | ES_ENABLED: ${ELASTICSEARCH_ENABLED} | ES_AVAILABLE: ${ELASTICSEARCH_ENABLED ? isESAvailable() : "N/A"}`)
    if (cleanedQuery !== rawQuery.trim()) {
      if (DEBUG_SEARCH) console.log(`🔍 [Search API] Cleaned query: "${query}"`)
    }
    if (Object.keys(inferredFilters).length > 0) {
      if (DEBUG_SEARCH) console.log(`🔍 [Search API] Inferred filters:`, JSON.stringify(inferredFilters))
    }

    if (!query && Object.keys(inferredFilters).length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        suggestions: [],
        message: "Query too short",
        query: "",
        count: 0,
        engine,
      })
    }

    const rawTypes = typesParam ? typesParam.split(",") : undefined
    const limit = limitParam ? parseInt(limitParam, 10) : 20

    // Explicit filters from API params (hard — sent to Algolia directly)
    let explicitFilters: Record<string, any> | undefined
    if (filtersParam) {
      try {
        explicitFilters = JSON.parse(filtersParam)
      } catch {
        // ignore invalid filters
      }
    }
    // Merged filters: NLP-inferred + explicit (for index selection and post-filtering)
    const allFilters: Record<string, any> = {
      ...inferredFilters,
      ...(explicitFilters || {}),
    }
    const hasFilters = Object.keys(allFilters).length > 0
    if (hasFilters) if (DEBUG_SEARCH) console.log(`🔍 [Search API] All filters:`, JSON.stringify(allFilters))
    if (explicitFilters) if (DEBUG_SEARCH) console.log(`🔍 [Search API] Explicit (hard) filters:`, JSON.stringify(explicitFilters))

    // ---- ALGOLIA ENGINE (PRIMARY) ----
    if (engine === "algolia" && ALGOLIA_ENABLED) {
      try {
        const algoliaClient = getAlgoliaSearchClient()
        if (DEBUG_SEARCH) console.log(`🟢 [Search API] Using ALGOLIA engine`)

        // Always search ALL requested indexes — NLP-inferred filters are
        // applied as post-filters, so restricting indexes up-front can
        // eliminate entire result types (e.g. "free content creator" would
        // skip opportunities because volunteerType is volunteer-specific).
        // Only explicit API param `types` restricts indexes.
        const indexNames: string[] = []
        if (!rawTypes || rawTypes.includes("ngo")) indexNames.push(ALGOLIA_INDEXES.NGOS)
        if (!rawTypes || rawTypes.includes("opportunity")) indexNames.push(ALGOLIA_INDEXES.OPPORTUNITIES)
        if (!rawTypes || rawTypes.includes("volunteer")) indexNames.push(ALGOLIA_INDEXES.VOLUNTEERS)
        if (DEBUG_SEARCH) console.log(`🟢 [Search API] Searching indexes: [${indexNames.join(", ")}]`)

        // ---- ROLE → SKILL expansion for Algolia ----
        // If the query matches a known role ("content creator", "web developer"),
        // expand it into optionalFilters on skillNames so Algolia boosts results
        // that have those skills — even if the text doesn't literally say "content creator".
        const roleSkills = expandRoleToSkills(query)
        if (roleSkills.length > 0) {
          if (DEBUG_SEARCH) console.log(`🟢 [Search API] Role expansion: "${query}" → [${roleSkills.slice(0, 5).join(", ")}${roleSkills.length > 5 ? "..." : ""}]`)
        }

        if (mode === "suggestions") {
          // Multi-index search for autocomplete suggestions
          const requests = indexNames.map(indexName => ({
            indexName,
            query: query.trim(),
            hitsPerPage: Math.min(limit, 4),
            attributesToRetrieve: ["objectID", "type", "name", "orgName", "title", "headline", "description", "skillNames", "causeNames", "city", "avatar", "logo", "workMode"],
            attributesToHighlight: ["name", "orgName", "title", "headline", "skillNames"],
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
          }))

          if (DEBUG_SEARCH) console.log(`🟢 [Search API] SUGGESTIONS mode — sending ${requests.length} multi-index requests`)
          const algoliaT0 = Date.now()
          const { results } = await algoliaClient.search({ requests })
          const algoliaMs = Date.now() - algoliaT0
          if (DEBUG_SEARCH) console.log(`🟢 [Search API] Algolia responded in ${algoliaMs}ms — ${results.length} index results`)
          const suggestions: any[] = []

          for (const indexResult of results) {
            if (!("hits" in indexResult)) continue
            const ir = indexResult as any
            if (DEBUG_SEARCH) console.log(`🟢 [Search API] Index "${ir.index}": ${ir.nbHits} total hits, ${ir.hits.length} returned, processingTimeMS=${ir.processingTimeMS}ms`)
            for (const hit of indexResult.hits as any[]) {
              const type = hit.type || (ir.index?.includes("volunteer") ? "volunteer" : ir.index?.includes("ngo") ? "ngo" : "opportunity")
              let text = hit.name || hit.orgName || hit.title || ""
              let subtitle = hit.headline || hit.description?.slice(0, 60) || ""
              if (type === "opportunity") {
                text = hit.title || ""
                subtitle = [hit.workMode === "remote" ? "Remote" : hit.location, hit.skillNames?.slice(0, 2).join(", ")].filter(Boolean).join(" · ")
              } else if (type === "ngo") {
                text = hit.name || hit.orgName || ""
                subtitle = hit.description?.slice(0, 60) || "Organization"
              } else {
                subtitle = hit.headline || hit.skillNames?.slice(0, 3).join(", ") || ""
              }
              if (DEBUG_SEARCH) console.log(`   📌 [${type}] "${text}" — ${subtitle || "(no subtitle)"} [id: ${hit.objectID}]`)
              suggestions.push({
                text,
                type: type === "project" ? "opportunity" : type,
                id: hit.objectID,
                subtitle,
              })
            }
          }

          const took = Date.now() - startTime
          if (DEBUG_SEARCH) console.log(`🟢 [Search API] ✅ SUGGESTIONS DONE — ${suggestions.length} total suggestions in ${took}ms (Algolia: ${algoliaMs}ms)`)
          if (DEBUG_SEARCH) console.log(`🔍 [Search API] ==========================================\n`)
          trackEvent("search", "suggest", { metadata: { query, engine: "algolia", count: suggestions.length } })
          // Track suggestion analytics (fire-and-forget)
          searchAnalyticsDb.track({
            query: rawQuery, normalizedQuery: query, resultCount: suggestions.length,
            engine: "algolia", took, isSuggestion: true, isZeroResult: suggestions.length === 0,
            roleExpansionUsed: false, filtersRelaxed: false,
            ip: reqMeta.ip, userAgent: reqMeta.userAgent, deviceType: reqMeta.deviceType,
            anonymousId: reqMeta.anonymousId, referer: reqMeta.referer,
          }).catch(() => {})
          return NextResponse.json({
            success: true,
            suggestions: suggestions.slice(0, limit),
            query,
            count: suggestions.length,
            engine: "algolia",
            took,
          })
        }

        // Full search — multi-index with per-index filter building
        if (DEBUG_SEARCH) console.log(`🟢 [Search API] FULL SEARCH mode`)

        // Only EXPLICIT filters go to Algolia as hard facet filters.
        // NLP-inferred filters are applied as post-filters with soft fallback.
        const commonFacets: string[] = []
        const volunteerFacets: string[] = []
        const opportunityFacets: string[] = []
        if (explicitFilters) {
          if (explicitFilters.workMode) commonFacets.push(`workMode:${explicitFilters.workMode}`)
          if (explicitFilters.isVerified) commonFacets.push(`isVerified:true`)
          if (explicitFilters.causes) {
            const causeList = Array.isArray(explicitFilters.causes) ? explicitFilters.causes : [explicitFilters.causes]
            for (const c of causeList) commonFacets.push(`causeNames:${c}`)
          }
          if (explicitFilters.skills) {
            const skillList = Array.isArray(explicitFilters.skills) ? explicitFilters.skills : [explicitFilters.skills]
            for (const s of skillList) commonFacets.push(`skillNames:${s}`)
          }
          if (explicitFilters.volunteerType) volunteerFacets.push(`volunteerType:${explicitFilters.volunteerType}`)
          if (explicitFilters.availability) volunteerFacets.push(`availability:${explicitFilters.availability}`)
          if (explicitFilters.experienceLevel) opportunityFacets.push(`experienceLevel:${explicitFilters.experienceLevel}`)
        }

        if (DEBUG_SEARCH) console.log(`🟢 [Search API] Common facets: [${commonFacets.join(", ")}]`)
        if (volunteerFacets.length) if (DEBUG_SEARCH) console.log(`🟢 [Search API] Volunteer facets: [${volunteerFacets.join(", ")}]`)
        if (opportunityFacets.length) if (DEBUG_SEARCH) console.log(`🟢 [Search API] Opportunity facets: [${opportunityFacets.join(", ")}]`)

        // Build per-index requests with only the filters that index supports
        // + optionalFilters from role→skill expansion for relevance boost
        const skillBoostFilters = roleSkills.map(s => `skillNames:${s}`)
        const requests = indexNames.map(indexName => {
          const isVolunteer = indexName === ALGOLIA_INDEXES.VOLUNTEERS
          const isOpportunity = indexName === ALGOLIA_INDEXES.OPPORTUNITIES
          const facets = [...commonFacets]
          if (isVolunteer) facets.push(...volunteerFacets)
          if (isOpportunity) facets.push(...opportunityFacets)
          return {
            indexName,
            query: query.trim(),
            hitsPerPage: Math.min(limit, 50),
            facetFilters: facets.length > 0 ? facets : undefined,
            // optionalFilters boost matching results without excluding non-matches
            optionalFilters: skillBoostFilters.length > 0 ? skillBoostFilters : undefined,
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
          }
        })

        if (DEBUG_SEARCH) console.log(`🟢 [Search API] Sending ${requests.length} multi-index full search requests`)
        const algoliaT0 = Date.now()
        const { results } = await algoliaClient.search({ requests })
        const algoliaMs = Date.now() - algoliaT0
        if (DEBUG_SEARCH) console.log(`🟢 [Search API] Algolia responded in ${algoliaMs}ms — ${results.length} index results`)
        const mappedResults: any[] = []

        for (const indexResult of results) {
          if (!("hits" in indexResult)) continue
          const ir = indexResult as any
          if (DEBUG_SEARCH) console.log(`🟢 [Search API] Index "${ir.index}": ${ir.nbHits} total hits, ${ir.hits.length} returned, processingTimeMS=${ir.processingTimeMS}ms`)
          for (const hit of indexResult.hits as any[]) {
            const type = hit.type || (indexResult.index?.includes("volunteer") ? "volunteer" : indexResult.index?.includes("ngo") ? "ngo" : "opportunity")
            const mappedType = type === "project" ? "opportunity" : type

            // Sort skills so query-matching ones appear first
            let skills = hit.skillNames || undefined
            if (skills && query) {
              const queryTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length >= 2)
              skills = [...skills].sort((a: string, b: string) => {
                const aMatch = queryTerms.some((t: string) => a.toLowerCase().includes(t))
                const bMatch = queryTerms.some((t: string) => b.toLowerCase().includes(t))
                if (aMatch && !bMatch) return -1
                if (!aMatch && bMatch) return 1
                return 0
              })
            }

            // Build highlight snippets from Algolia _highlightResult
            const highlights: string[] = []
            if (hit._highlightResult) {
              for (const [key, val] of Object.entries(hit._highlightResult as Record<string, any>)) {
                if (val?.matchLevel === "full" || val?.matchLevel === "partial") {
                  highlights.push(val.value)
                }
              }
            }

            mappedResults.push({
              id: hit.objectID,
              mongoId: hit.objectID,
              userId: hit.objectID,
              type: mappedType,
              title: mappedType === "opportunity" ? hit.title : (hit.name || hit.orgName || ""),
              subtitle: hit.headline || hit.description?.slice(0, 80) || "",
              description: hit.description || hit.bio || hit.mission || "",
              url: mappedType === "volunteer" ? `/volunteers/${hit.objectID}` : mappedType === "ngo" ? `/ngos/${hit.objectID}` : `/opportunities/${hit.objectID}`,
              score: (hit as any)._rankingInfo?.firstMatchedWord ?? 1,
              highlights,
              avatar: hit.avatar || hit.logo || undefined,
              location: [hit.city, hit.country].filter(Boolean).join(", ") || hit.location || undefined,
              skills,
              verified: hit.isVerified || false,
              volunteerType: hit.volunteerType || undefined,
              workMode: hit.workMode || undefined,
              hoursPerWeek: hit.hoursPerWeek || undefined,
              hourlyRate: hit.hourlyRate || undefined,
              experienceLevel: hit.experienceLevel || undefined,
              rating: hit.rating || undefined,
              availability: hit.availability || undefined,
              causes: hit.causeNames || undefined,
              ngoName: hit.ngoName || undefined,
              status: hit.status || undefined,
            })
          }
        }

        // ---- Post-filters: ALL NLP-inferred filters applied here with soft fallback ----
        const maxHoursPerWeek = typeof allFilters.maxHoursPerWeek === "number" ? allFilters.maxHoursPerWeek : null
        const minHoursPerWeek = typeof allFilters.minHoursPerWeek === "number" ? allFilters.minHoursPerWeek : null
        const maxWeeklyBudget = typeof allFilters.maxWeeklyBudget === "number" ? allFilters.maxWeeklyBudget : null
        const maxMonthlyBudget = typeof allFilters.maxMonthlyBudget === "number" ? allFilters.maxMonthlyBudget : null
        const maxHourlyRate = typeof allFilters.maxHourlyRate === "number" ? allFilters.maxHourlyRate : null
        const minRating = typeof allFilters.minRating === "number" ? allFilters.minRating : null
        const filterWorkMode = allFilters.workMode || null
        const filterVolunteerType = allFilters.volunteerType || null
        const filterAvailability = allFilters.availability || null
        const filterExperienceLevel = allFilters.experienceLevel || null
        const filterIsVerified = allFilters.isVerified || false

        const hasPostFilters = maxHoursPerWeek !== null || minHoursPerWeek !== null ||
          maxWeeklyBudget !== null || maxMonthlyBudget !== null ||
          maxHourlyRate !== null || minRating !== null ||
          filterWorkMode !== null || filterVolunteerType !== null ||
          filterAvailability !== null || filterExperienceLevel !== null ||
          filterIsVerified

        // Lexical relevance filter (always applied when query is non-empty)
        // Pass roleSkills so role-based queries like "content creator" also match
        // results that have the expanded skill names (Video Editing, etc.)
        const lexicalResults = query
          ? mappedResults.filter((result) => hasStrongLexicalMatch(result, query, roleSkills))
          : mappedResults

        // Apply all NLP-inferred post-filters on top of lexical results
        const strictResults = !hasPostFilters ? lexicalResults : lexicalResults.filter((result) => {
          // Facet-style filters (apply to all types that have the field)
          if (filterWorkMode !== null && result.workMode && result.workMode !== filterWorkMode) return false
          if (filterIsVerified && !result.verified) return false

          // Volunteer-specific filters
          if (result.type === "volunteer") {
            if (filterVolunteerType !== null && result.volunteerType && result.volunteerType !== filterVolunteerType) return false
            if (filterAvailability !== null && result.availability && result.availability !== filterAvailability) return false

            const rate = typeof result.hourlyRate === "number" ? result.hourlyRate : null
            const rating = typeof result.rating === "number" ? result.rating : null
            if (maxHourlyRate !== null && rate !== null && rate > maxHourlyRate) return false
            if (minRating !== null && rating !== null && rating < minRating) return false
            if (maxHoursPerWeek !== null) {
              const upper = parseHoursPerWeekUpperBound(result.hoursPerWeek)
              if (upper !== null && upper > maxHoursPerWeek) return false
            }
            if (minHoursPerWeek !== null) {
              const lower = parseHoursPerWeekLowerBound(result.hoursPerWeek)
              if (lower !== null && lower < minHoursPerWeek) return false
            }
            if (maxWeeklyBudget !== null && rate !== null) {
              const minHrs = parseHoursPerWeekLowerBound(result.hoursPerWeek)
              if (minHrs !== null && rate * minHrs > maxWeeklyBudget) return false
            }
            if (maxMonthlyBudget !== null && rate !== null) {
              const minHrs = parseHoursPerWeekLowerBound(result.hoursPerWeek)
              if (minHrs !== null && rate * minHrs * 4.33 > maxMonthlyBudget) return false
            }
          }

          // Opportunity-specific filters
          if (result.type === "opportunity") {
            if (filterExperienceLevel !== null && result.experienceLevel && result.experienceLevel !== filterExperienceLevel) return false
          }

          return true
        })

        // Soft fallback: if post-filters eliminated ALL results, show lexical matches
        // but sort so budget-matching results come first
        let finalResults = strictResults.length > 0 ? strictResults : lexicalResults
        let filtersRelaxed = hasPostFilters && strictResults.length === 0 && lexicalResults.length > 0

        // When filters relaxed, sort so budget-plausible results come first
        if (filtersRelaxed && maxWeeklyBudget !== null) {
          finalResults = [...finalResults].sort((a: any, b: any) => {
            const aRate = typeof a.hourlyRate === "number" ? a.hourlyRate : null
            const bRate = typeof b.hourlyRate === "number" ? b.hourlyRate : null
            // Results with no rate data → middle (unknown, not penalized harshly)
            // Results within budget → top
            // Results over budget → bottom
            const aScore = aRate === null ? 1 : (aRate <= maxWeeklyBudget! ? 0 : 2)
            const bScore = bRate === null ? 1 : (bRate <= maxWeeklyBudget! ? 0 : 2)
            return aScore - bScore
          })
        }
        if (filtersRelaxed && maxMonthlyBudget !== null) {
          finalResults = [...finalResults].sort((a: any, b: any) => {
            const aRate = typeof a.hourlyRate === "number" ? a.hourlyRate : null
            const bRate = typeof b.hourlyRate === "number" ? b.hourlyRate : null
            const aScore = aRate === null ? 1 : (aRate * 4.33 <= maxMonthlyBudget! ? 0 : 2)
            const bScore = bRate === null ? 1 : (bRate * 4.33 <= maxMonthlyBudget! ? 0 : 2)
            return aScore - bScore
          })
        }

        // ── SKILL-RELEVANCE FILTER (volunteers) ────────────────────
        // When role expansion matched skills, prioritize volunteers whose
        // skills overlap with the expanded set. Volunteers with NO skills
        // listed are kept (unknown ≠ non-match). Those whose skills don't
        // overlap are demoted (moved to end) rather than removed outright.
        if (roleSkills.length > 0) {
          const withSkillMatch: typeof finalResults = []
          const withoutSkillMatch: typeof finalResults = []
          for (const result of finalResults) {
            if (result.type !== "volunteer") { withSkillMatch.push(result); continue }
            if (!result.skills || result.skills.length === 0) { withoutSkillMatch.push(result); continue }
            const hasOverlap = result.skills.some((skill: string) => {
              const sCore = skill.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
              return roleSkills.some((rs: string) => {
                const rsCore = rs.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
                return sCore.includes(rsCore) || rsCore.includes(sCore)
              })
            })
            if (hasOverlap) withSkillMatch.push(result)
            else withoutSkillMatch.push(result)
          }
          // Skill-matched first, then unknowns/non-matches
          finalResults = [...withSkillMatch, ...withoutSkillMatch]
          if (DEBUG_SEARCH) console.log(`🟢 [Search API] Skill-relevance sort: ${withSkillMatch.length} with matching skills, ${withoutSkillMatch.length} demoted`)
        }

        // ── ROLE-EXPANSION FALLBACK ──────────────────────────────────
        // If the primary text search returned very few results AND the query
        // matches a known role, do a supplementary Algolia search using
        // expanded skill names. This handles cases like "content writer" or
        // "blogger" where Algolia's text index has no literal match but
        // volunteers/NGOs with the related skills exist.
        if (finalResults.length < 3 && roleSkills.length > 0) {
          if (DEBUG_SEARCH) console.log(`🟡 [Search API] Only ${finalResults.length} results — running role-expansion fallback with skills: [${roleSkills.slice(0, 6).join(", ")}...]`)
          // Search for each expanded skill name individually across all indexes.
          // Strip parenthetical details and split compound names for cleaner queries:
          // "Video Editing (Premiere Pro / DaVinci)" → "Video Editing"
          // "Legal Advisory / Pro Bono Counsel" → "Legal Advisory", "Pro Bono Counsel"
          // "Contract Drafting & Review" → "Contract Drafting"
          const rawSkillQueries: string[] = []
          for (const s of roleSkills.slice(0, 5)) {
            const stripped = s.replace(/\s*\(.*\)$/, "").trim()
            // Split on " / " or " & " for compound skill names
            if (stripped.includes(" / ")) {
              rawSkillQueries.push(...stripped.split(" / ").map(p => p.trim()).filter(p => p.length >= 3))
            } else if (stripped.includes(" & ")) {
              rawSkillQueries.push(stripped.split(" & ")[0].trim()) // Just first part
            } else {
              rawSkillQueries.push(stripped)
            }
          }
          // Dedupe after splitting
          const uniqueSkillQueries = [...new Set(rawSkillQueries)].slice(0, 8)
          const fallbackRequests: any[] = []
          for (const sq of uniqueSkillQueries) {
            for (const indexName of indexNames) {
              fallbackRequests.push({
                indexName,
                query: sq,
                hitsPerPage: 10,
                highlightPreTag: "<mark>",
                highlightPostTag: "</mark>",
              })
            }
          }
          if (DEBUG_SEARCH) console.log(`🟡 [Search API] Fallback: ${fallbackRequests.length} requests for skills: [${uniqueSkillQueries.join(", ")}]`)
          try {
            const fbT0 = Date.now()
            const { results: fbResults } = await algoliaClient.search({ requests: fallbackRequests })
            const fbMs = Date.now() - fbT0
            if (DEBUG_SEARCH) console.log(`🟡 [Search API] Fallback search returned in ${fbMs}ms`)
            const existingIds = new Set(finalResults.map((r: any) => r.id))
            for (const indexResult of fbResults) {
              if (!("hits" in indexResult)) continue
              for (const hit of indexResult.hits as any[]) {
                if (existingIds.has(hit.objectID)) continue
                const type = hit.type || (indexResult.index?.includes("volunteer") ? "volunteer" : indexResult.index?.includes("ngo") ? "ngo" : "opportunity")
                const mappedType = type === "project" ? "opportunity" : type
                let skills = hit.skillNames || undefined
                // Check if this result has at least one skill that overlaps with the role expansion.
                // Compare core skill names (without parentheticals) for robust matching.
                const hasSkillOverlap = skills && roleSkills.some((rs: string) => {
                  const rsCore = rs.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
                  const rsCoreWords = rsCore.split(/\s+/).filter((w: string) => w.length >= 3)
                  return skills.some((s: string) => {
                    const sCore = s.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
                    // Accept if the core names overlap well
                    if (rsCore === sCore || sCore.includes(rsCore) || rsCore.includes(sCore)) return true
                    const matched = rsCoreWords.filter((w: string) => sCore.includes(w)).length
                    return matched >= Math.ceil(rsCoreWords.length / 2)
                  })
                })
                if (!hasSkillOverlap) continue
                existingIds.add(hit.objectID)
                finalResults.push({
                  id: hit.objectID,
                  mongoId: hit.objectID,
                  userId: hit.objectID,
                  type: mappedType,
                  title: mappedType === "opportunity" ? hit.title : (hit.name || hit.orgName || ""),
                  subtitle: hit.headline || hit.description?.slice(0, 80) || "",
                  description: hit.description || hit.bio || hit.mission || "",
                  url: mappedType === "volunteer" ? `/volunteers/${hit.objectID}` : mappedType === "ngo" ? `/ngos/${hit.objectID}` : `/opportunities/${hit.objectID}`,
                  score: 0.8,
                  highlights: [],
                  avatar: hit.avatar || hit.logo || undefined,
                  location: [hit.city, hit.country].filter(Boolean).join(", ") || hit.location || undefined,
                  skills,
                  verified: hit.isVerified || false,
                  volunteerType: hit.volunteerType || undefined,
                  workMode: hit.workMode || undefined,
                  hoursPerWeek: hit.hoursPerWeek || undefined,
                  hourlyRate: hit.hourlyRate || undefined,
                  experienceLevel: hit.experienceLevel || undefined,
                  rating: hit.rating || undefined,
                  availability: hit.availability || undefined,
                  causes: hit.causeNames || undefined,
                  ngoName: hit.ngoName || undefined,
                  status: hit.status || undefined,
                })
              }
            }
            // Re-apply post-filters on the expanded set (including budget filters)
            if (hasPostFilters && finalResults.length > 0) {
              const refiltered = finalResults.filter((result: any) => {
                if (filterWorkMode !== null && result.workMode && result.workMode !== filterWorkMode) return false
                if (filterIsVerified && !result.verified) return false
                if (result.type === "volunteer") {
                  if (filterVolunteerType !== null && result.volunteerType && result.volunteerType !== filterVolunteerType) return false
                  if (filterAvailability !== null && result.availability && result.availability !== filterAvailability) return false
                  const rate = typeof result.hourlyRate === "number" ? result.hourlyRate : null
                  const rating = typeof result.rating === "number" ? result.rating : null
                  if (maxHourlyRate !== null && rate !== null && rate > maxHourlyRate) return false
                  if (minRating !== null && rating !== null && rating < minRating) return false
                  // Budget filters — also apply in fallback
                  if (maxWeeklyBudget !== null && rate !== null) {
                    const minHrs = parseHoursPerWeekLowerBound(result.hoursPerWeek)
                    if (minHrs !== null && rate * minHrs > maxWeeklyBudget) return false
                  }
                  if (maxMonthlyBudget !== null && rate !== null) {
                    const minHrs = parseHoursPerWeekLowerBound(result.hoursPerWeek)
                    if (minHrs !== null && rate * minHrs * 4.33 > maxMonthlyBudget) return false
                  }
                }
                if (result.type === "opportunity") {
                  if (filterExperienceLevel !== null && result.experienceLevel && result.experienceLevel !== filterExperienceLevel) return false
                }
                return true
              })
              // Soft fallback — don't let post-filters eliminate everything
              if (refiltered.length > 0) {
                finalResults = refiltered
              } else {
                filtersRelaxed = true
                // Even when relaxed, sort budget-plausible results first
                if (maxWeeklyBudget !== null) {
                  finalResults = [...finalResults].sort((a: any, b: any) => {
                    const aRate = typeof a.hourlyRate === "number" ? a.hourlyRate : null
                    const bRate = typeof b.hourlyRate === "number" ? b.hourlyRate : null
                    const aScore = aRate === null ? 1 : (aRate <= maxWeeklyBudget! ? 0 : 2)
                    const bScore = bRate === null ? 1 : (bRate <= maxWeeklyBudget! ? 0 : 2)
                    return aScore - bScore
                  })
                }
              }
            }
            if (DEBUG_SEARCH) console.log(`🟡 [Search API] After fallback: ${finalResults.length} total results`)
          } catch (fbErr: any) {
            console.warn(`⚠️ [Search API] Role-expansion fallback failed: ${fbErr?.message}`)
          }
        }

        const took = Date.now() - startTime
        if (DEBUG_SEARCH) console.log(`🟢 [Search API] ✅ FULL SEARCH DONE — ${finalResults.length} results in ${took}ms (Algolia: ${algoliaMs}ms)${filtersRelaxed ? " [post-filters relaxed — no exact budget matches]" : ""}`)
        for (const r of finalResults.slice(0, 10)) {
          if (DEBUG_SEARCH) console.log(`   📌 [${r.type}] "${r.title}" — skills: [${(r.skills || []).slice(0, 3).join(", ")}] — ${r.location || "no location"} [id: ${r.id}]`)
        }
        if (finalResults.length > 10) if (DEBUG_SEARCH) console.log(`   ... and ${finalResults.length - 10} more`)
        if (DEBUG_SEARCH) console.log(`🔍 [Search API] ==========================================\n`)
        trackEvent("search", "query", { metadata: { query: rawQuery, normalizedQuery: query, engine: "algolia", count: finalResults.length, took } })

        // Track search analytics (fire-and-forget)
        const resultTypes = { volunteers: 0, ngos: 0, opportunities: 0 }
        for (const r of finalResults) {
          if (r.type === "volunteer") resultTypes.volunteers++
          else if (r.type === "ngo") resultTypes.ngos++
          else if (r.type === "opportunity") resultTypes.opportunities++
        }
        const topResultTitles = finalResults.slice(0, 5).map((r: any) => r.title || r.name || "Untitled")
        const analyticsId = searchAnalyticsDb.track({
          query: rawQuery, normalizedQuery: query, resultCount: finalResults.length,
          engine: "algolia", took, isSuggestion: false,
          isZeroResult: finalResults.length === 0,
          roleExpansionUsed: roleSkills.length > 0,
          filtersRelaxed: !!filtersRelaxed,
          inferredFilters: Object.keys(inferredFilters).length > 0 ? inferredFilters : undefined,
          resultTypes,
          ip: reqMeta.ip, userAgent: reqMeta.userAgent, deviceType: reqMeta.deviceType,
          anonymousId: reqMeta.anonymousId, referer: reqMeta.referer, topResultTitles,
        }).catch(() => "")

        // Send zero-result email alert (fire-and-forget)
        if (finalResults.length === 0) {
          sendZeroResultAlert(rawQuery, "algolia", inferredFilters)
        }

        // Detect potentially irrelevant results (has results but none match query intent)
        if (finalResults.length > 0 && finalResults.length <= 3 && filtersRelaxed) {
          sendIrrelevantResultAlert(rawQuery, "algolia", finalResults.length, topResultTitles)
        }

        const searchEventId = await analyticsId

        // Merge external opportunities into results (look like native)
        if (!rawTypes || rawTypes.includes("opportunity")) {
          const externalResults = await searchExternalOpportunities(query, 10)
          finalResults = mergeExternalIntoResults(finalResults, externalResults, limit)
        }

        return NextResponse.json({
          success: true,
          results: finalResults.slice(0, limit),
          query: rawQuery,
          normalizedQuery: query,
          count: finalResults.length,
          took,
          engine: "algolia",
          searchEventId: searchEventId || undefined,
          ...(Object.keys(inferredFilters).length > 0 && { inferredFilters }),
          ...(filtersRelaxed && { filtersRelaxed: true }),
        })
      } catch (algoliaError: any) {
        console.error(`❌ [Search API] Algolia FAILED: ${algoliaError?.message}`, algoliaError)
        if (DEBUG_SEARCH) console.log(`🟡 [Search API] Falling through to ES/MongoDB...`)
        // Fall through to ES or MongoDB
      }
    }

    // ---- ELASTICSEARCH ENGINE ----
    if (engine === "es" && ELASTICSEARCH_ENABLED) {
      // Autocomplete suggestions
      if (mode === "suggestions") {
        const suggestions = await elasticSuggest({
          query,
          types: mapTypes(rawTypes),
          limit: Math.min(limit, 8),
        })

        // Filter suggestions to only include requested types (the ES suggester
        // may inject in-memory skill/cause suggestions that don't match the filter).
        // Always allow skill/cause suggestions through — they help refine searches
        // regardless of the selected entity type.
        const requestedTypes = rawTypes ? new Set(rawTypes) : null
        const mappedSuggestions = suggestions
          .map(s => ({
            text: s.text,
            type: mapResultType(s.type),
            id: s.id,
            subtitle: s.subtitle,
          }))
          .filter(s => !requestedTypes || requestedTypes.has(s.type) || s.type === "skill" || s.type === "cause")

        return NextResponse.json({
          success: true,
          suggestions: mappedSuggestions,
          query,
          count: mappedSuggestions.length,
          engine: "elasticsearch",
        })
      }

      // Full search
      const result = await elasticSearch({
        query,
        types: mapTypes(rawTypes),
        filters: hasFilters ? allFilters : undefined,
        limit: Math.min(limit, 50),
        sort,
      })

      // Map types back and flatten metadata for frontend card components.
      // CRITICAL: For volunteer results, we expose THREE ID fields:
      //   - id:      ES document _id (= user._id = Better Auth user ID)
      //   - mongoId: same as id for volunteers
      //   - userId:  from ES source.userId (= user._id.toString(), set by es-sync)
      // The client uses (r.userId || r.mongoId || r.id) to extract the volunteer ID
      // for cross-referencing with the pre-loaded volunteer list.
      const mappedResults = result.results.map(r => {
        const m = r.metadata || {}
        const locationParts = [m.city, m.country].filter(Boolean)
        const location = m.location || (locationParts.length > 0 ? locationParts.join(", ") : undefined)

        // Sort skills so query-matching ones appear first on cards
        let skills = Array.isArray(m.skillNames) && m.skillNames.length > 0 ? m.skillNames : undefined
        if (skills && query) {
          const queryTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length >= 2)
          skills = [...skills].sort((a: string, b: string) => {
            const aMatch = queryTerms.some((t: string) => a.toLowerCase().includes(t))
            const bMatch = queryTerms.some((t: string) => b.toLowerCase().includes(t))
            if (aMatch && !bMatch) return -1
            if (!aMatch && bMatch) return 1
            return 0
          })
        }

        return {
          id: r.id,
          mongoId: r.mongoId,
          userId: m.userId || undefined,
          type: mapResultType(r.type),
          title: r.title,
          subtitle: r.subtitle,
          description: r.description,
          url: r.url,
          score: r.score,
          highlights: r.highlights,
          avatar: m.avatar || m.logo || undefined,
          location,
          skills,
          verified: m.isVerified || false,
          matchedField: r.highlights?.length > 0 ? r.highlights[0] : undefined,
          volunteerType: m.volunteerType || undefined,
          workMode: m.workMode || undefined,
          experienceLevel: m.experienceLevel || undefined,
          rating: m.rating || undefined,
          causes: Array.isArray(m.causeNames) && m.causeNames.length > 0 ? m.causeNames : undefined,
          ngoName: m.ngoName || undefined,
          status: m.status || undefined,
        }
      })

      // Strictly enforce type filter on the final result set — even if ES
      // returned cross-index matches, only send back what was requested.
      let finalResults = mappedResults
      if (rawTypes && rawTypes.length > 0) {
        const allowedSet = new Set(rawTypes.map(t => t === "project" ? "opportunity" : t))
        finalResults = mappedResults.filter(r => allowedSet.has(r.type))
      }

      // Skill-relevance sort: prioritize volunteers with matching skills.
      const esRoleSkills = expandRoleToSkills(query)
      if (esRoleSkills.length > 0) {
        const matched: typeof finalResults = []
        const rest: typeof finalResults = []
        for (const r of finalResults) {
          if (r.type !== "volunteer") { matched.push(r); continue }
          if (!r.skills || r.skills.length === 0) { rest.push(r); continue }
          const hasOverlap = r.skills.some((skill: string) => {
            const sCore = skill.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
            return esRoleSkills.some(rs => {
              const rsCore = rs.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
              return sCore.includes(rsCore) || rsCore.includes(sCore)
            })
          })
          if (hasOverlap) matched.push(r); else rest.push(r)
        }
        finalResults = [...matched, ...rest]
      }

      // When ES returns no results, fall back to MongoDB.
      // Skip fallback for pure work-mode queries (remote/onsite/hybrid).
      const isPureWorkModeQuery = /^(remote|onsite|on-site|on site|in-person|in person|office|wfh|work from home|virtual|online|hybrid)$/i.test(query.trim())
      if (finalResults.length === 0 && mode !== "suggestions" && !isPureWorkModeQuery) {
        if (DEBUG_SEARCH) console.log(`[Search API] ES returned 0 results for "${query}" — falling back to MongoDB`)
        const mongoFallbackTypes = rawTypes as ("volunteer" | "ngo" | "opportunity")[] | undefined
        try {
          const mongoResults = await unifiedSearch({ query, types: mongoFallbackTypes, limit: Math.min(limit, 50) })
          return NextResponse.json({
            success: true,
            results: mongoResults,
            query,
            count: mongoResults.length,
            engine: "mongodb-fallback",
          })
        } catch (mongoErr) {
          console.error("[Search API] MongoDB fallback also failed:", mongoErr)
        }
      }

      if (!rawTypes || rawTypes.includes("opportunity")) {
        const externalResults = await searchExternalOpportunities(query, 10)
        finalResults = mergeExternalIntoResults(finalResults, externalResults, limit)
      }

      return NextResponse.json({
        success: true,
        results: finalResults,
        query,
        count: finalResults.length,
        took: result.took,
        didYouMean: (result as any).didYouMean || undefined,
        engine: "elasticsearch",
      })
    }

    // ---- MONGODB FALLBACK ENGINE ----
    const mongoTypes = rawTypes as ("volunteer" | "ngo" | "opportunity")[] | undefined

    if (mode === "suggestions") {
      const suggestions = await getSearchSuggestions({
        query,
        types: mongoTypes,
        limit: Math.min(limit, 8),
      })
      trackEvent("search", "suggest", { metadata: { query, engine: "mongodb", count: suggestions.length } })
      searchAnalyticsDb.track({
        query, normalizedQuery: query, resultCount: suggestions.length,
        engine: "mongodb", took: Date.now() - startTime, isSuggestion: true,
        isZeroResult: suggestions.length === 0, roleExpansionUsed: false, filtersRelaxed: false,
        ip: reqMeta.ip, userAgent: reqMeta.userAgent, deviceType: reqMeta.deviceType,
        anonymousId: reqMeta.anonymousId, referer: reqMeta.referer,
      }).catch(() => {})
      return NextResponse.json({
        success: true,
        suggestions,
        query,
        count: suggestions.length,
        engine: "mongodb",
      })
    }

    let results = await unifiedSearch({
      query,
      types: mongoTypes,
      limit: Math.min(limit, 50),
    })

    // Skill-relevance sort for MongoDB results
    const mongoRoleSkills = expandRoleToSkills(query)
    if (mongoRoleSkills.length > 0) {
      const matched: any[] = []
      const rest: any[] = []
      for (const r of results) {
        if (r.type !== "volunteer") { matched.push(r); continue }
        if (!r.skills || r.skills.length === 0) { rest.push(r); continue }
        const hasOverlap = r.skills.some((skill: string) => {
          const sCore = skill.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
          return mongoRoleSkills.some(rs => {
            const rsCore = rs.toLowerCase().replace(/\s*\(.*\)$/, "").replace(/[^a-z0-9\s]/g, " ").trim()
            return sCore.includes(rsCore) || rsCore.includes(sCore)
          })
        })
        if (hasOverlap) matched.push(r); else rest.push(r)
      }
      results = [...matched, ...rest]
    }

    const mongoTook = Date.now() - startTime
    trackEvent("search", "query", { metadata: { query, engine: "mongodb", count: results.length, took: mongoTook } })
    const mongoTopTitles = results.slice(0, 5).map((r: any) => r.title || r.name || "Untitled")
    searchAnalyticsDb.track({
      query, normalizedQuery: query, resultCount: results.length,
      engine: "mongodb", took: mongoTook, isSuggestion: false,
      isZeroResult: results.length === 0, roleExpansionUsed: false, filtersRelaxed: false,
      ip: reqMeta.ip, userAgent: reqMeta.userAgent, deviceType: reqMeta.deviceType,
      anonymousId: reqMeta.anonymousId, referer: reqMeta.referer, topResultTitles: mongoTopTitles,
    }).catch(() => {})
    if (results.length === 0) sendZeroResultAlert(query, "mongodb")

    // Merge external opportunities (look like native)
    if (!rawTypes || rawTypes.includes("opportunity")) {
      const externalResults = await searchExternalOpportunities(query, 10)
      results = mergeExternalIntoResults(results, externalResults, limit)
    }

    return NextResponse.json({
      success: true,
      results,
      query,
      count: results.length,
      engine: "mongodb",
    })
  } catch (error: any) {
    console.error(`[Search API] ERROR after ${Date.now() - startTime}ms:`, error?.message || error)

    // Mark ES circuit open so subsequent requests skip ES immediately
    markESFailed()

    // If ES fails, try MongoDB fallback
    if (ELASTICSEARCH_ENABLED) {
      try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("q") || ""
        const mode = searchParams.get("mode")
        const typesParam = searchParams.get("types")
        const fallbackTypes = typesParam ? typesParam.split(",") as ("volunteer" | "ngo" | "opportunity")[] : undefined

        if (mode === "suggestions") {
          const suggestions = await getSearchSuggestions({
            query,
            types: fallbackTypes,
            limit: 6,
          })
          return NextResponse.json({
            success: true,
            suggestions,
            query,
            count: suggestions.length,
            engine: "mongodb-fallback",
          })
        }

        const results = await unifiedSearch({ query, types: fallbackTypes, limit: 20 })
        return NextResponse.json({
          success: true,
          results,
          query,
          count: results.length,
          engine: "mongodb-fallback",
        })
      } catch (fallbackError: any) {
        console.error("[Unified Search API] Fallback also failed:", fallbackError)
      }
    }

    return NextResponse.json(
      { success: false, error: error.message || "Search failed", results: [], count: 0 },
      { status: 500 }
    )
  }
}
