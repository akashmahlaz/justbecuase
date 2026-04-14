import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';

const env = readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#'))
    process.env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
}

const mongo = await MongoClient.connect(process.env.MONGODB_URI);
const col = mongo.db('justbecause').collection('externalOpportunities');

// Total count
const total = await col.countDocuments();
console.log(`Total docs: ${total}`);

// isActive breakdown
const active = await col.countDocuments({ isActive: true });
const inactive = await col.countDocuments({ isActive: false });
const noField = await col.countDocuments({ isActive: { $exists: false } });
const nullField = await col.countDocuments({ isActive: null });
console.log(`\nisActive: true  → ${active}`);
console.log(`isActive: false → ${inactive}`);
console.log(`isActive: null  → ${nullField}`);
console.log(`isActive missing→ ${noField}`);

// Platform × isActive breakdown
const breakdown = await col.aggregate([
  { $group: {
    _id: { platform: '$sourceplatform', active: '$isActive' },
    count: { $sum: 1 }
  }},
  { $sort: { '_id.platform': 1, '_id.active': -1 } }
]).toArray();

console.log('\n=== PLATFORM × isActive ===');
for (const r of breakdown) {
  console.log(`  ${r._id.platform} | isActive=${r._id.active} → ${r.count}`);
}

// Check a sample inactive job
const sampleInactive = await col.findOne({ isActive: { $ne: true } });
if (sampleInactive) {
  console.log('\n=== SAMPLE NON-ACTIVE DOC ===');
  console.log(`  platform: ${sampleInactive.sourceplatform}`);
  console.log(`  title: ${sampleInactive.title}`);
  console.log(`  isActive: ${sampleInactive.isActive}`);
  console.log(`  scrapedAt: ${sampleInactive.scrapedAt}`);
}

await mongo.close();
