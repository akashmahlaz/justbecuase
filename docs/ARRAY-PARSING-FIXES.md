# Array Parsing Fixes - Complete

## Issue Summary
After migrating to a single `user` collection, array fields (skills, languages, interests, causes) are stored as JSON strings in MongoDB. The database helpers must parse these strings back to arrays when reading data.

## Root Cause
The database helpers were parsing some array fields (skills, languages, interests) but **missing the `causes` field** for volunteers. This caused:
- `TypeError: Cannot read properties of undefined (reading 'length')` in `calculateCauseMatch()` function
- Volunteer dashboard crashes when trying to match opportunities

## Files Modified

### 1. lib/database.ts - volunteerProfilesDb

#### create() method (lines ~65-80)
**Added**: `causes` array stringification
```typescript
if (dataAny.causes) processedData.causes = JSON.stringify(dataAny.causes)
```

#### findByUserId() method (lines ~86-100)
**Added**: `causes` array parsing
```typescript
causes: user.causes ? JSON.parse(user.causes) : []
```

#### update() method (lines ~108-120)
**Added**: `causes` array stringification
```typescript
if (updatesAny.causes) processedUpdates.causes = JSON.stringify(updatesAny.causes)
```

#### findMany() method (lines ~129-145)
**Added**: `causes` array parsing
```typescript
causes: u.causes ? JSON.parse(u.causes) : []
```

### 2. lib/database.ts - ngoProfilesDb
✅ **Already correct** - NGO helpers already had proper `causes` array handling

## Array Fields Handled

### Volunteer Profile Arrays:
- ✅ `skills` - parsed in all methods
- ✅ `languages` - parsed in all methods
- ✅ `interests` - parsed in all methods
- ✅ `causes` - **NOW FIXED** - parsed in all methods

### NGO Profile Arrays:
- ✅ `causes` - parsed in all methods

## Testing Results

### Server Status:
✅ Development server running without errors
✅ Routes responding with 200 status:
  - `/volunteer/dashboard` - loads successfully
  - `/ngo/dashboard` - loads successfully
  - `/volunteer/messages` - working
  - `/ngo/messages` - working
  - All API routes working

### No Runtime Errors:
- No "hook.handler is not a function" errors
- No "Cannot read properties of undefined" errors
- No array parsing errors in console

## Architecture Validation

### Single Collection Approach:
✅ All profile data now in `user` collection
✅ better-auth manages authentication + custom fields
✅ No sync scripts needed
✅ Database helpers abstract JSON string conversion
✅ All user queries go through helpers (no direct collection access)

### Data Flow:
```
Application Code → Database Helpers → JSON String Conversion → MongoDB
                  ← Database Helpers ← JSON String Parsing    ← MongoDB
```

## Remaining Tasks

### Optional Cleanup:
1. Drop old `volunteerProfiles` collection (after confirming everything works)
2. Drop old `ngoProfiles` collection (after confirming everything works)
3. Delete migration script `lib/migrations/merge-to-user-collection.ts` (one-time use)
4. Update any documentation referencing old collections

### None of these are blocking - the application is fully functional

## Verification Checklist

- ✅ Server starts without errors
- ✅ Authentication works (Google OAuth tested)
- ✅ Volunteer dashboard loads
- ✅ NGO dashboard loads
- ✅ Messages system works
- ✅ All API routes respond correctly
- ✅ No console errors
- ✅ Array fields properly parsed
- ✅ Matching algorithm receives arrays (not undefined)

## Summary
All array parsing issues are now **FIXED**. The application is running smoothly with the single-collection architecture. All user data is properly handled through the database helpers with automatic JSON string conversion.
