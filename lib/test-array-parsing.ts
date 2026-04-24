/**
 * Test script to verify array parsing in database helpers
 * Run with: npx tsx lib/test-array-parsing.ts
 */

import { volunteerProfilesDb, ngoProfilesDb } from "./database"

async function testArrayParsing() {
  console.log("=".repeat(60))
  console.log("Testing Array Parsing in Database Helpers")
  console.log("=".repeat(60))

  try {
    // Test 1: Volunteer findMany
    console.log("\n[Test 1] Volunteer findMany - checking array parsing...")
    const volunteers = await volunteerProfilesDb.findMany({}, { limit: 3 })
    console.log(`Found ${volunteers.length} volunteers`)
    
    for (const v of volunteers) {
      console.log(`\n- ${v.userId} (${v.name || 'No name'})`)
      console.log(`  Skills: ${Array.isArray(v.skills) ? '✅ Array' : '❌ Not array'} - ${v.skills?.length || 0} items`)
      console.log(`  Languages: ${Array.isArray(v.languages) ? '✅ Array' : '❌ Not array'} - ${v.languages?.length || 0} items`)
      console.log(`  Interests: ${Array.isArray(v.interests) ? '✅ Array' : '❌ Not array'} - ${v.interests?.length || 0} items`)
      console.log(`  Causes: ${Array.isArray(v.causes) ? '✅ Array' : '❌ Not array'} - ${v.causes?.length || 0} items`)
    }

    // Test 2: NGO findMany
    console.log("\n[Test 2] NGO findMany - checking array parsing...")
    const ngos = await ngoProfilesDb.findMany({}, { limit: 3 })
    console.log(`Found ${ngos.length} NGOs`)
    
    for (const n of ngos) {
      console.log(`\n- ${n.userId} (${n.orgName || 'No name'})`)
      console.log(`  Causes: ${Array.isArray(n.causes) ? '✅ Array' : '❌ Not array'} - ${n.causes?.length || 0} items`)
    }

    // Test 3: Volunteer findByUserId (if we have a volunteer ID)
    if (volunteers.length > 0) {
      console.log("\n[Test 3] Volunteer findByUserId - checking array parsing...")
      const volunteer = await volunteerProfilesDb.findByUserId(volunteers[0].userId)
      if (volunteer) {
        console.log(`\n- ${volunteer.userId} (${volunteer.name || 'No name'})`)
        console.log(`  Skills: ${Array.isArray(volunteer.skills) ? '✅ Array' : '❌ Not array'} - ${volunteer.skills?.length || 0} items`)
        console.log(`  Languages: ${Array.isArray(volunteer.languages) ? '✅ Array' : '❌ Not array'} - ${volunteer.languages?.length || 0} items`)
        console.log(`  Interests: ${Array.isArray(volunteer.interests) ? '✅ Array' : '❌ Not array'} - ${volunteer.interests?.length || 0} items`)
        console.log(`  Causes: ${Array.isArray(volunteer.causes) ? '✅ Array' : '❌ Not array'} - ${volunteer.causes?.length || 0} items`)
      }
    }

    // Test 4: NGO findByUserId (if we have an NGO ID)
    if (ngos.length > 0) {
      console.log("\n[Test 4] NGO findByUserId - checking array parsing...")
      const ngo = await ngoProfilesDb.findByUserId(ngos[0].userId)
      if (ngo) {
        console.log(`\n- ${ngo.userId} (${ngo.orgName || 'No name'})`)
        console.log(`  Causes: ${Array.isArray(ngo.causes) ? '✅ Array' : '❌ Not array'} - ${ngo.causes?.length || 0} items`)
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log("✅ All tests completed successfully!")
    console.log("=".repeat(60))
  } catch (error) {
    console.error("\n❌ Test failed with error:")
    console.error(error)
    process.exit(1)
  }
  
  process.exit(0)
}

testArrayParsing()
