import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';

const env = readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#'))
    process.env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
}

const mongo = await MongoClient.connect(process.env.MONGODB_URI);
const testDb = mongo.db('test');
const appDb = mongo.db('justbecause');

const testCol = testDb.collection('externalOpportunities');
const appCol = appDb.collection('externalOpportunities');

// Get all TheirStack jobs from test DB
const testJobs = await testCol.find({ sourceplatform: 'theirstack' }).toArray();
console.log(`Jobs in test.externalOpportunities: ${testJobs.length}`);

// Check what's already in production
const existingTs = await appCol.countDocuments({ sourceplatform: 'theirstack' });
console.log(`Existing TheirStack jobs in justbecause DB: ${existingTs}`);

let inserted = 0, updated = 0, skipped = 0;

for (const job of testJobs) {
  const { _id, ...doc } = job; // remove old _id
  const existing = await appCol.findOne({
    sourceplatform: 'theirstack',
    externalId: doc.externalId
  });
  
  if (existing) {
    await appCol.updateOne({ _id: existing._id }, { $set: { ...doc, updatedAt: new Date() } });
    updated++;
  } else {
    await appCol.insertOne(doc);
    inserted++;
  }
}

console.log(`\n=== MIGRATION RESULTS ===`);
console.log(`Inserted: ${inserted}`);
console.log(`Updated: ${updated}`);

// Verify
const finalCount = await appCol.countDocuments({ sourceplatform: 'theirstack' });
console.log(`\nTheirStack jobs in justbecause DB now: ${finalCount}`);

// Platform breakdown in production
const breakdown = await appCol.aggregate([
  { $group: { _id: '$sourceplatform', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray();
console.log(`\n=== justbecause DB PLATFORM COUNTS ===`);
let total = 0;
for (const p of breakdown) {
  console.log(`  ${p._id}: ${p.count}`);
  total += p.count;
}
console.log(`  TOTAL: ${total}`);

// Clean up test DB
await testCol.deleteMany({ sourceplatform: 'theirstack' });
const remaining = await testCol.countDocuments();
console.log(`\nCleaned up test DB. Remaining docs: ${remaining}`);

await mongo.close();
