import { MongoClient } from "mongodb"

async function checkPaymentSetup() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/justbecause"
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    console.log("✅ Connected to MongoDB")
    
    const db = client.db()
    
    // Check admin settings
    console.log("\n📋 Checking Admin Settings...")
    const settings = await db.collection("admin_settings").findOne({})
    if (settings) {
      console.log("  - Platform:", settings.platformName)
      console.log("  - Single Profile Unlock Price:", settings.singleProfileUnlockPrice || 499)
      console.log("  - Currency:", settings.currency || "INR")
      console.log("  - Payments Enabled:", settings.enablePayments !== false)
    } else {
      console.log("  ⚠️ No admin settings found - will use defaults (₹499)")
    }
    
    // Check NGO users
    console.log("\n👥 Checking NGO Users...")
    const ngoUsers = await db.collection("user").find({ role: "ngo" }).toArray()
    console.log(`  Found ${ngoUsers.length} NGO user(s)`)
    for (const ngo of ngoUsers.slice(0, 3)) {
      console.log(`  - ${ngo.email} (role: ${ngo.role}, onboarded: ${ngo.isOnboarded})`)
    }
    
    // Check NGO Profiles
    console.log("\n🏢 Checking NGO Profiles...")
    const ngoProfiles = await db.collection("ngo_profiles").find({}).limit(3).toArray()
    console.log(`  Found ${ngoProfiles.length} NGO profile(s)`)
    for (const profile of ngoProfiles) {
      console.log(`  - ${profile.orgName || "Unnamed"} (unlocks remaining: ${profile.profileUnlocksRemaining || 0})`)
    }
    
    // Check Volunteer users
    console.log("\n🙋 Checking Volunteer Users...")
    const volunteerUsers = await db.collection("user").find({ role: "volunteer" }).toArray()
    console.log(`  Found ${volunteerUsers.length} volunteer user(s)`)
    
    // Check Volunteer Profiles
    console.log("\n👤 Checking Volunteer Profiles...")
    const volunteerProfiles = await db.collection("volunteer_profiles").find({}).limit(5).toArray()
    console.log(`  Found ${volunteerProfiles.length} volunteer profile(s)`)
    for (const profile of volunteerProfiles) {
      console.log(`  - ${profile.name || "Unnamed"} (type: ${profile.volunteerType || "not set"})`)
    }
    
    // Check Profile Unlocks
    console.log("\n🔓 Checking Profile Unlocks...")
    const unlocks = await db.collection("profile_unlocks").find({}).limit(5).toArray()
    console.log(`  Found ${unlocks.length} unlock(s)`)
    for (const unlock of unlocks) {
      console.log(`  - NGO ${unlock.ngoId} unlocked volunteer ${unlock.volunteerId} for ${unlock.amountPaid} ${unlock.currency || "INR"}`)
    }
    
    // Check Transactions
    console.log("\n💳 Checking Transactions...")
    const transactions = await db.collection("transactions").find({}).limit(5).toArray()
    console.log(`  Found ${transactions.length} transaction(s)`)
    for (const tx of transactions) {
      console.log(`  - ${tx.type}: ${tx.amount} ${tx.currency} (status: ${tx.status})`)
    }
    
    // Summary
    console.log("\n" + "=".repeat(50))
    console.log("PAYMENT SYSTEM STATUS:")
    console.log("=".repeat(50))
    
    if (ngoUsers.length === 0) {
      console.log("⚠️ No NGO users - Create an NGO account first to test payments")
    }
    if (volunteerProfiles.filter(v => v.volunteerType === "free" || v.volunteerType === "both").length === 0) {
      console.log("⚠️ No free volunteers - Create a volunteer with 'free' type to test profile locking")
    }
    
    console.log("\n✅ Check complete!")
    
  } finally {
    await client.close()
  }
}

checkPaymentSetup().catch(console.error)
