# JustBecause.Asia

> Skills-based volunteer platform connecting NGOs with skilled professionals across Asia

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green?style=for-the-badge&logo=mongodb)](https://mongodb.com)

## 🌟 Overview

JustBecause.Asia is a skills-based volunteer platform that connects NGOs with skilled professionals. Unlike traditional volunteer platforms, we focus on matching specific skills (design, development, marketing, legal, etc.) with NGO needs.

### Key Features

- **For Volunteers**: Create a skills profile, browse projects, apply to opportunities
- **For NGOs**: Post projects, find skilled volunteers, manage applications
- **Smart Matching**: AI-powered matching based on skills, availability, and interests
- **Reverse Monetization**: Free volunteers = NGOs pay to unlock contact details. Paid volunteers = Full visibility for NGOs

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- MongoDB database
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/akashmahlaz/justbecause.asia.git
   cd justbecause.asia
   ```

2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env.local
   ```

4. Update `.env.local` with your values:
   ```env
   # Database
   MONGODB_URI=your-mongodb-connection-string

   # Authentication (Better Auth)
   BETTER_AUTH_SECRET=your-secret-key
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Razorpay Payments
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id

   # Cloudinary Image Uploads
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=volunteer_avatars
   ```

5. Run the development server:
   ```bash
   bun dev
   # or
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/                  # Next.js App Router pages
│   ├── admin/           # Admin dashboard pages
│   ├── auth/            # Authentication pages
│   ├── ngo/             # NGO dashboard & features
│   ├── volunteer/       # Volunteer dashboard & features
│   └── api/             # API routes
├── components/          # React components
│   ├── ui/              # Shadcn/ui components
│   ├── dashboard/       # Dashboard components
│   └── home/            # Landing page components
├── lib/                 # Utilities & configurations
│   ├── auth.ts          # Better Auth configuration
│   ├── actions.ts       # Server actions
│   ├── database.ts      # Database operations
│   └── types/           # TypeScript types
└── public/              # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS + Shadcn/ui
- **Deployment**: Vercel

## 📝 Scripts

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
bun type-check   # Run TypeScript check
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## 📄 License

This project is private and proprietary.

---

Built with ❤️ for the NGO community in Asia
