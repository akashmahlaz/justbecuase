// Check admin account
import { MongoClient } from "mongodb"

async function check() {
  const client = new MongoClient("mongodb://localhost:27017")
  await client.connect()
  const db = client.db("justbecause")
  
  const user = await db.collection("user").findOne({email: "admin@justbecause.asia"})
  console.log("User:", JSON.stringify(user, null, 2))
  
  const accounts = await db.collection("account").find({}).toArray()
  console.log("\nAll Accounts:")
  accounts.forEach(a => {
    console.log({
      _id: a._id?.toString(),
      id: a.id,
      providerId: a.providerId, 
      userId: a.userId,
      accountId: a.accountId,
      hasPassword: !!a.password
    })
  })
  
  await client.close()
}

check()
