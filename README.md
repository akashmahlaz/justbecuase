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

## 🏗️ Architecture: User Data Management

### Single Source of Truth Pattern

**IMPORTANT**: This project uses a "Single Source of Truth" pattern for user data to prevent synchronization issues between auth and profile tables.

#### Design Principles

1. **Auth `user` Collection = Source of Truth**
   - The better-auth `user` collection (`_id`, `name`, `email`, `image`) is the **ONLY** authoritative source for basic user information
   - Profile tables (`volunteerProfiles`, `ngoProfiles`) store **ONLY** role-specific data (skills, bio, orgName, etc.)
   - Never read `name` or basic info from profiles - always fetch from auth table first

2. **Automatic Synchronization**
   - Better-auth hooks automatically sync name/image updates to profile tables
   - Profile update actions (`updateVolunteerProfile`, `updateNGOProfile`) sync back to auth table
   - No manual migrations needed in production

3. **Database Schema**
   ```typescript
   // Auth table (better-auth) - SOURCE OF TRUTH
   user: {
     _id: string          // User ID (string, not ObjectId)
     name: string         // User's name
     email: string
     image: string        // Profile picture
     role: "volunteer" | "ngo" | "admin"
   }
   
   // Profile tables - ROLE-SPECIFIC DATA ONLY
   volunteerProfiles: {
     userId: string       // Reference to user._id
     name: string         // [SYNCED] Kept for backward compatibility
     avatar: string       // [SYNCED] Profile picture
     bio: string          // Role-specific
     skills: []           // Role-specific
     // ... other role-specific fields
   }
   
   ngoProfiles: {
     userId: string       // Reference to user._id
     orgName: string      // Organization name (NOT synced - role-specific)
     logo: string         // [SYNCED] Organization logo
     description: string  // Role-specific
     causes: []           // Role-specific
     // ... other role-specific fields
   }
   ```

4. **Implementation Files**
   - [`lib/user-utils.ts`](lib/user-utils.ts) - Centralized user info utilities
   - [`lib/auth.ts`](lib/auth.ts) - Better-auth hooks for auto-sync
   - [`lib/actions.ts`](lib/actions.ts) - Profile update actions with sync

#### For Other Developers Using Next.js + MongoDB + Better-Auth

**Common Pitfall**: Duplicating user data (name, email, image) in both auth and profile tables leads to:
- Data inconsistency issues
- Complex sync logic
- Production bugs when data gets out of sync

**Best Practice**: 
1. Use better-auth's `user` table as the single source of truth
2. Implement auto-sync hooks (see [`lib/auth.ts`](lib/auth.ts))
3. Always fetch from auth table first using utilities like [`getUserInfo()`](lib/user-utils.ts)
4. Profile tables should only store role/domain-specific data

This pattern ensures your app "just works" in production without manual intervention or sync scripts.

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
