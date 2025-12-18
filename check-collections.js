const { MongoClient } = require("mongodb")
const fs = require("fs")

// Read MONGODB_URI from .env.local
const envContent = fs.readFileSync(".env.local", "utf-8")
const mongoUri = envContent.split("\n").find(line => line.startsWith("MONGODB_URI"))?.split("=")[1]?.trim()

if (!mongoUri) {
  console.error("MONGODB_URI not found in .env.local")
  process.exit(1)
}

async function checkCollections() {
  const client = await MongoClient.connect(mongoUri)
  const db = client.db()
  
  const collections = await db.listCollections().toArray()
  console.log("\n=== ALL COLLECTIONS ===")
  collections.forEach(c => console.log(`  - ${c.name}`))
  
  // Check if 'users' collection exists (note the 's')
  const usersCollection = collections.find(c => c.name === "users")
  if (usersCollection) {
    const count = await db.collection("users").countDocuments()
    console.log(`\n⚠️  'users' collection found with ${count} documents!`)
    
    const sample = await db.collection("users").findOne()
    console.log("\nSample document from 'users':")
    console.log(JSON.stringify(sample, null, 2))
  } else {
    console.log("\n✅ No 'users' collection found (only 'user' from better-auth)")
  }
  
  // Check 'user' collection from better-auth
  const userCount = await db.collection("user").countDocuments()
  console.log(`\n'user' collection (better-auth): ${userCount} documents`)
  
  await client.close()
}

checkCollections().catch(console.error)
