import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';

const env = readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#'))
    process.env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
}

const mongo = await MongoClient.connect(process.env.MONGODB_URI);
const db = mongo.db();
const col = db.collection('externalOpportunities');

// Top hiring organizations
const topOrgs = await col.aggregate([
  { $match: { sourceplatform: 'theirstack' } },
  { $group: { _id: '$organization', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 40 }
]).toArray();

console.log('=== TOP 40 HIRING NGOs ===');
for (const o of topOrgs) {
  console.log(`  ${o.count} jobs | ${o._id}`);
}

// Work mode breakdown
const modes = await col.aggregate([
  { $match: { sourceplatform: 'theirstack' } },
  { $group: { _id: '$workMode', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray();
console.log('\n=== WORK MODE ===');
for (const m of modes) console.log(`  ${m._id}: ${m.count}`);

// Compensation breakdown
const comp = await col.aggregate([
  { $match: { sourceplatform: 'theirstack' } },
  { $group: { _id: '$compensationType', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).toArray();
console.log('\n=== COMPENSATION ===');
for (const c of comp) console.log(`  ${c._id}: ${c.count}`);

// Sample 5 recent jobs with details
const samples = await col.find({ sourceplatform: 'theirstack' })
  .sort({ postedDate: -1 })
  .limit(10)
  .project({ title: 1, organization: 1, location: 1, workMode: 1, sourceUrl: 1, postedDate: 1 })
  .toArray();
console.log('\n=== 10 MOST RECENT JOBS ===');
for (const s of samples) {
  console.log(`  ${s.organization} — ${s.title}`);
  console.log(`    ${s.workMode} | ${s.location} | ${s.postedDate?.toISOString().slice(0, 10)}`);
  console.log(`    ${s.sourceUrl}`);
}

await mongo.close();
