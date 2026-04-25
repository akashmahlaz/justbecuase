import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';

// Load .env.local
const env = readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) {
    process.env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
  }
}

const mongo = await MongoClient.connect(process.env.MONGODB_URI);
const db = mongo.db();
const col = db.collection('externalOpportunities');

// Platform breakdown
const breakdown = await col.aggregate([
  { $group: { _id: '$sourceplatform', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray();

console.log('=== PLATFORM JOB COUNTS ===');
let total = 0;
for (const r of breakdown) {
  console.log(`  ${r._id}: ${r.count}`);
  total += r.count;
}
console.log(`  TOTAL: ${total}`);

// TheirStack details
const tsCount = await col.countDocuments({ sourceplatform: 'theirstack' });
console.log(`\nTheirStack jobs in DB: ${tsCount}`);

const latest = await col.find({ sourceplatform: 'theirstack' })
  .sort({ scrapedAt: -1 })
  .limit(5)
  .project({ title: 1, organization: 1, scrapedAt: 1 })
  .toArray();
console.log('\nLatest TheirStack entries:');
for (const j of latest) {
  console.log(`  ${j.organization} — ${j.title} (${j.scrapedAt})`);
}

// Check TheirStack credit balance
const API_KEY = process.env.THEIRSTACK_API_KEY;
const balRes = await fetch('https://api.theirstack.com/v0/billing/credit-balance', {
  headers: { 'Authorization': 'Bearer ' + API_KEY }
});
const bal = await balRes.json();
const remaining = bal.api_credits - bal.used_api_credits;
console.log(`\n=== THEIRSTACK CREDITS ===`);
console.log(`Used: ${bal.used_api_credits} / Total: ${bal.api_credits} | Remaining: ${remaining}`);

await mongo.close();
