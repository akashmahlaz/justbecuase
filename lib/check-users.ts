// Check a regular user created by Better Auth
import { MongoClient } from "mongodb"

async function check() {
  const client = new MongoClient("mongodb://localhost:27017")
  await client.connect()
  const db = client.db("justbecause")
  
  // Get a user created by Better Auth (not admin)
  const users = await db.collection("user").find({ role: { $ne: "admin" } }).limit(2).toArray()
  
  console.log("Regular users (created by Better Auth):")
  users.forEach((u, i) => {
    console.log(`\nUser ${i + 1}:`)
    console.log("  _id type:", typeof u._id, u._id?.constructor?.name)
    console.log("  _id value:", u._id)
    console.log("  id:", u.id)
    console.log("  email:", u.email)
    console.log("  role:", u.role)
  })
  
  // Get admin
  const admin = await db.collection("user").findOne({ email: "admin@justbecause.asia" })
  console.log("\n\nAdmin user:")
  console.log("  _id type:", typeof admin?._id, admin?._id?.constructor?.name)
  console.log("  _id value:", admin?._id)
  console.log("  id:", admin?.id)
  
  await client.close()
}

check()
