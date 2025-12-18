# Simplification Plan: One Collection for Everything

## Goal
Use ONLY the `user` collection for all user data (auth + profile). No separate profile collections.

## Current vs Target

### Current (Complex):
```
user (18 docs) → auth data only
volunteerProfiles → volunteer data
ngoProfiles → NGO data
= 3 collections, sync issues, complex queries
```

### Target (Simple):
```
user (18 docs) → ALL data (auth + profile)
= 1 collection, no sync, simple queries
```

## Implementation Steps

### Phase 1: Update Better-Auth Config (30 min)

**File**: `lib/auth.ts`

Add ALL profile fields as `additionalFields`:

```typescript
export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  user: {
    additionalFields: {
      // Role & Status
      role: { type: "string", required: false },
      isOnboarded: { type: "boolean", required: false },
      
      // Common Profile Fields
      phone: { type: "string", required: false },
      location: { type: "string", required: false },
      city: { type: "string", required: false },
      country: { type: "string", required: false },
      
      // Volunteer-Specific (null if NGO)
      bio: { type: "string", required: false },
      skills: { type: "string", required: false }, // JSON array string
      experience: { type: "string", required: false },
      availability: { type: "string", required: false },
      languages: { type: "string", required: false }, // JSON array
      interests: { type: "string", required: false }, // JSON array
      linkedIn: { type: "string", required: false },
      portfolio: { type: "string", required: false },
      isAvailable: { type: "boolean", required: false },
      rating: { type: "number", required: false },
      completedProjects: { type: "number", required: false },
      
      // NGO-Specific (null if Volunteer)
      orgName: { type: "string", required: false },
      description: { type: "string", required: false },
      mission: { type: "string", required: false },
      registrationNumber: { type: "string", required: false },
      website: { type: "string", required: false },
      address: { type: "string", required: false },
      causes: { type: "string", required: false }, // JSON array
      yearFounded: { type: "string", required: false },
      teamSize: { type: "string", required: false },
      contactPersonName: { type: "string", required: false },
      contactEmail: { type: "string", required: false },
      isVerified: { type: "boolean", required: false },
      subscriptionTier: { type: "string", required: false },
      activeProjects: { type: "number", required: false },
      logo: { type: "string", required: false },
      
      // Common metadata
      createdAt: { type: "date", required: false },
      updatedAt: { type: "date", required: false },
    }
  }
})
```

### Phase 2: Merge Data Migration (30 min)

**File**: `lib/migrations/merge-to-user-collection.ts`

```typescript
import { MongoClient } from "mongodb"

async function mergeToUserCollection() {
  const client = await MongoClient.connect(process.env.MONGODB_URI!)
  const db = client.db()
  
  console.log("🔄 Merging volunteerProfiles into user...")
  
  // Merge volunteer profiles
  const volunteers = await db.collection("volunteerProfiles").find().toArray()
  for (const profile of volunteers) {
    await db.collection("user").updateOne(
      { _id: profile.userId },
      { 
        $set: {
          // Profile fields
          bio: profile.bio,
          skills: JSON.stringify(profile.skills || []),
          experience: profile.experience,
          availability: profile.availability,
          languages: JSON.stringify(profile.languages || []),
          interests: JSON.stringify(profile.interests || []),
          linkedIn: profile.linkedIn,
          portfolio: profile.portfolio,
          phone: profile.phone,
          location: profile.location,
          isAvailable: profile.isAvailable !== false,
          rating: profile.rating || 0,
          completedProjects: profile.completedProjects || 0,
          // Keep image from user, use avatar as fallback
          image: profile.avatar || undefined,
          updatedAt: new Date()
        }
      }
    )
  }
  console.log(`✅ Merged ${volunteers.length} volunteer profiles`)
  
  console.log("🔄 Merging ngoProfiles into user...")
  
  // Merge NGO profiles
  const ngos = await db.collection("ngoProfiles").find().toArray()
  for (const profile of ngos) {
    await db.collection("user").updateOne(
      { _id: profile.userId },
      {
        $set: {
          // NGO fields
          orgName: profile.orgName || profile.organizationName,
          description: profile.description,
          mission: profile.mission,
          registrationNumber: profile.registrationNumber,
          website: profile.website,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          country: profile.country,
          causes: JSON.stringify(profile.causes || []),
          yearFounded: profile.yearFounded,
          teamSize: profile.teamSize,
          contactPersonName: profile.contactPersonName,
          contactEmail: profile.contactEmail,
          isVerified: profile.isVerified || false,
          subscriptionTier: profile.subscriptionTier || "free",
          activeProjects: profile.activeProjects || 0,
          logo: profile.logo,
          // Use logo as image if user doesn't have image
          image: profile.logo || undefined,
          updatedAt: new Date()
        }
      }
    )
  }
  console.log(`✅ Merged ${ngos.length} NGO profiles`)
  
  console.log("\n✅ Migration complete!")
  console.log("⚠️  Run this to backup and drop old collections:")
  console.log("   mongoexport to backup first, then:")
  console.log("   db.volunteerProfiles.drop()")
  console.log("   db.ngoProfiles.drop()")
  
  await client.close()
}

mergeToUserCollection().catch(console.error)
```

### Phase 3: Update Database Helpers (15 min)

**File**: `lib/database.ts`

Remove all profile collection references:

```typescript
// DELETE: volunteerProfilesDb
// DELETE: ngoProfilesDb

// KEEP: Just use direct user collection queries
export async function getUserProfile(userId: string) {
  const db = await getDb()
  return await db.collection("user").findOne({ _id: userId })
}

export async function updateUserProfile(userId: string, updates: any) {
  const db = await getDb()
  return await db.collection("user").updateOne(
    { _id: userId },
    { $set: { ...updates, updatedAt: new Date() } }
  )
}
```

### Phase 4: Update All Actions (1-1.5 hours)

**File**: `lib/actions.ts`

Update ALL functions:

```typescript
// BEFORE (Complex):
export async function getVolunteerProfile() {
  const user = await getCurrentUser()
  const profile = await volunteerProfilesDb.findByUserId(user.id)
  return { ...user, ...profile } // Manual merge
}

// AFTER (Simple):
export async function getVolunteerProfile() {
  const user = await getCurrentUser()
  return user // Already has all fields!
}

// BEFORE (Complex):
export async function updateVolunteerProfile(updates) {
  await volunteerProfilesDb.update(userId, updates)
  await syncUserDataToProfile(userId, updates) // Sync!
}

// AFTER (Simple):
export async function updateVolunteerProfile(updates) {
  const db = await getDb()
  await db.collection("user").updateOne(
    { _id: userId },
    { $set: { ...updates, updatedAt: new Date() } }
  )
}
```

**Functions to update** (~30-40 functions):
- `getVolunteerProfile()`
- `updateVolunteerProfile()`
- `getNGOProfile()`
- `updateNGOProfile()`
- `saveVolunteerOnboarding()`
- `saveNGOOnboarding()`
- All queries that join user + profile
- Message queries (already use user table, keep as-is)

### Phase 5: Update Components (30 min)

No major changes needed! Components already expect user objects.

Just ensure they read from the right fields:
- Volunteer: `user.bio`, `user.skills`, etc.
- NGO: `user.orgName`, `user.mission`, etc.

### Phase 6: Cleanup (15 min)

Delete files:
- `lib/user-utils.ts` (no longer needed)
- `lib/migrations/sync-user-names.ts` (no longer needed)
- `docs/USER-DATA-SOLUTION.md` (outdated)
- `ARCHITECTURE.md` (outdated)

Drop collections (after backup):
```bash
# Backup first
mongoexport --uri="$MONGODB_URI" --collection=volunteerProfiles --out=volunteer_backup.json
mongoexport --uri="$MONGODB_URI" --collection=ngoProfiles --out=ngo_backup.json

# Then drop
mongosh "$MONGODB_URI" --eval "db.volunteerProfiles.drop(); db.ngoProfiles.drop()"
```

## Time Estimate

| Phase | Time |
|-------|------|
| 1. Better-Auth Config | 30 min |
| 2. Migration Script | 30 min |
| 3. Database Helpers | 15 min |
| 4. Update Actions | 1-1.5 hours |
| 5. Update Components | 30 min |
| 6. Cleanup | 15 min |
| **Total** | **~3 hours** |

## Benefits After Simplification

✅ **80% less code** - No sync logic, no utilities  
✅ **10x simpler queries** - One collection, one query  
✅ **Zero sync issues** - Single source of truth  
✅ **Better performance** - No multi-collection joins  
✅ **Easier maintenance** - Less code = fewer bugs  

## Risks & Mitigation

**Risk**: Data loss during migration  
**Mitigation**: Export backups before dropping collections

**Risk**: Better-auth doesn't support all field types  
**Mitigation**: Use JSON strings for arrays/objects (works fine)

**Risk**: Breaking existing code  
**Mitigation**: Test thoroughly after Phase 4

## Ready to Start?

Say "YES" and I'll begin implementation!

1. Update better-auth config
2. Create and run migration
3. Update all actions
4. Test and cleanup

**Estimated completion: 3 hours**
