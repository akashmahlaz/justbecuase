import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const c = await MongoClient.connect(process.env.MONGODB_URI);
const db = c.db();
const col = db.collection("externalOpportunities");

const breakdown = await col.aggregate([
  { $group: { _id: { platform: "$sourceplatform", active: "$isActive" }, count: { $sum: 1 } } },
  { $sort: { "_id.platform": 1, "_id.active": -1 } }
]).toArray();

console.log("\n=== Platform x Active Breakdown ===");
for (const r of breakdown) {
  console.log(`  ${r._id.platform} | active=${r._id.active} | count=${r.count}`);
}

const total = await col.countDocuments();
console.log(`\nTotal documents: ${total}`);

// Check deadline types for ReliefWeb
const rwSample = await col.findOne({ sourceplatform: "reliefweb-api" });
if (rwSample) {
  console.log(`\nReliefWeb deadline sample: "${rwSample.deadline}" (type: ${typeof rwSample.deadline})`);
  console.log(`ReliefWeb isActive: ${rwSample.isActive}`);
}

// Check deadline types for Idealist
const idSample = await col.findOne({ sourceplatform: "idealist-api" });
if (idSample) {
  console.log(`Idealist deadline sample: "${idSample.deadline}" (type: ${typeof idSample.deadline})`);
  console.log(`Idealist isActive: ${idSample.isActive}`);
}

await c.close();
