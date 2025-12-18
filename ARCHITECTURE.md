# Architecture: User Data Management

## Problem Statement

When using Next.js + MongoDB + Better-Auth, a common issue arises:
- Better-auth stores users in `user` collection with `_id`, `name`, `email`, `image`
- Application needs role-specific profiles (`volunteerProfiles`, `ngoProfiles`)
- **Pitfall**: Duplicating `name`/`image` in profiles leads to data inconsistency

## Solution: Single Source of Truth Pattern

### Core Principle
**The auth `user` table is the ONLY source of truth for basic user information.**

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                    │
│                                                               │
│  Auth 'user' Collection (better-auth)                       │
│  ├─ _id: string                                              │
│  ├─ name: string          ← AUTHORITATIVE SOURCE            │
│  ├─ email: string         ← AUTHORITATIVE SOURCE            │
│  ├─ image: string         ← AUTHORITATIVE SOURCE            │
│  └─ role: string                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ volunteerProfiles│  │   ngoProfiles    │
         ├──────────────────┤  ├──────────────────┤
         │ userId (ref)     │  │ userId (ref)     │
         │ name [SYNCED]    │  │ orgName          │
         │ avatar [SYNCED]  │  │ logo [SYNCED]    │
         │ bio              │  │ description      │
         │ skills []        │  │ causes []        │
         │ experience       │  │ registrationNum  │
         └──────────────────┘  └──────────────────┘
         
         [SYNCED] = Auto-synced for backward compatibility
         Other fields = Role-specific data only
```

### Implementation

#### 1. Centralized User Utilities (`lib/user-utils.ts`)

```typescript
/**
 * Always fetches from auth table FIRST, then enriches with profile data
 */
export async function getUserInfo(userId: string): Promise<UserInfo | null> {
  const authUser = await db.collection("user").findOne({ _id: userId })
  const profile = await getProfile(userId) // ngo or volunteer
  
  return {
    id: userId,
    name: profile.orgName || authUser.name,  // Auth is fallback
    image: profile.logo || authUser.image,    // Auth is fallback
    type: determineType(profile)
  }
}
```

#### 2. Automatic Sync Hooks (`lib/auth.ts`)

```typescript
export const auth = betterAuth({
  // ... config
  hooks: {
    after: [{
      matcher: (context) => context.path === "/user/update",
      handler: async (ctx) => {
        // Auto-sync name/image from auth to profiles
        await syncUserDataToProfile(ctx.user.id, {
          name: ctx.body.name,
          image: ctx.body.image
        })
      }
    }]
  }
})
```

#### 3. Profile Updates Sync Back (`lib/actions.ts`)

```typescript
export async function updateVolunteerProfile(updates) {
  // When volunteer updates name/avatar, sync to auth table
  if (updates.name || updates.avatar) {
    await syncUserDataToProfile(userId, {
      name: updates.name,
      image: updates.avatar
    })
  }
  
  // Then update profile
  await db.collection("volunteerProfiles").updateOne(...)
}
```

### Benefits

✅ **No Manual Migrations**: Works automatically in production  
✅ **Data Consistency**: Single source of truth prevents conflicts  
✅ **Backward Compatible**: Synced fields work with existing code  
✅ **Production Ready**: No recurring sync scripts needed  
✅ **Future Proof**: New users automatically follow the pattern  

### Collection Schema Reference

#### Auth Collection (`user` - better-auth managed)
```typescript
{
  _id: string,              // User ID (string, NOT ObjectId)
  name: string,             // SOURCE OF TRUTH
  email: string,            // SOURCE OF TRUTH
  image: string,            // SOURCE OF TRUTH
  role: "volunteer" | "ngo" | "admin",
  emailVerified: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Volunteer Profile (`volunteerProfiles`)
```typescript
{
  _id: ObjectId,
  userId: string,           // References user._id
  name: string,             // [AUTO-SYNCED] For backward compatibility
  avatar: string,           // [AUTO-SYNCED] For backward compatibility
  // Role-specific fields:
  bio: string,
  phone: string,
  location: string,
  skills: Array,
  experience: string,
  availability: string,
  languages: Array,
  interests: Array,
  linkedIn: string,
  portfolio: string,
  isAvailable: boolean,
  rating: number,
  completedProjects: number,
  createdAt: Date,
  updatedAt: Date
}
```

#### NGO Profile (`ngoProfiles`)
```typescript
{
  _id: ObjectId,
  userId: string,           // References user._id
  orgName: string,          // ROLE-SPECIFIC (not synced from auth)
  logo: string,             // [AUTO-SYNCED] For backward compatibility
  // Role-specific fields:
  description: string,
  mission: string,
  registrationNumber: string,
  website: string,
  phone: string,
  address: string,
  city: string,
  country: string,
  causes: Array,
  yearFounded: string,
  teamSize: string,
  contactPersonName: string,
  contactEmail: string,
  isVerified: boolean,
  subscriptionTier: string,
  activeProjects: number,
  createdAt: Date,
  updatedAt: Date
}
```

### Key Implementation Files

1. **[`lib/user-utils.ts`](lib/user-utils.ts)** - Core utilities
   - `getUserInfo(userId)` - Get single user info
   - `getUsersInfo(userIds[])` - Batch fetch user info
   - `syncUserDataToProfile(userId, data)` - Sync helper

2. **[`lib/auth.ts`](lib/auth.ts)** - Better-auth configuration
   - Hooks for automatic sync on user updates
   - Auth provider configuration

3. **[`lib/actions.ts`](lib/actions.ts)** - Server actions
   - `updateVolunteerProfile()` - Syncs name/avatar to auth
   - `updateNGOProfile()` - Syncs logo to auth
   - `getMyConversations()` - Uses `getUsersInfo()` for consistency

4. **[`lib/database.ts`](lib/database.ts)** - Database helpers
   - Collection name constants
   - Database operation wrappers

### Migration Guide (If Needed)

If you have existing profiles with missing names, run this once:

```bash
npx tsx lib/migrations/sync-user-names.ts
```

**Note**: After implementing the architecture above, this migration is only needed ONCE for existing data. New users will automatically follow the pattern.

### Best Practices

1. **Always use `getUserInfo()` or `getUsersInfo()`** instead of direct DB queries
2. **Never read `name` directly from profile tables** - always fetch from auth
3. **Profile fields should be role-specific only** (skills, bio, orgName, etc.)
4. **Use sync utilities when updating profiles** to maintain consistency
5. **Trust the auth table** as the single source of truth

### Common Mistakes to Avoid

❌ **Don't do this:**
```typescript
// Reading name from profile directly
const profile = await db.collection("volunteerProfiles").findOne({ userId })
const name = profile.name // ⚠️ May be outdated or missing
```

✅ **Do this instead:**
```typescript
// Use centralized utility
const userInfo = await getUserInfo(userId)
const name = userInfo.name // ✅ Always up-to-date from auth table
```

---

## For Other Developers

If you're building a Next.js + MongoDB + Better-Auth application:

1. **Don't duplicate basic user fields** (name, email, image) in your profile tables
2. **Use better-auth hooks** to sync data automatically
3. **Create centralized utilities** like `getUserInfo()` for consistency
4. **Document your architecture** so other developers understand the pattern

This architecture will save you from data inconsistency bugs and manual sync operations in production.

---

**Last Updated**: December 2024  
**Pattern**: Single Source of Truth for User Data
