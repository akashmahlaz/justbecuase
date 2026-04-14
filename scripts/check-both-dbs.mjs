import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';

// Load .env.local
const env = readFileSync('.env.local', 'utf-8');
const vars = {};
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#'))
    vars[line.substring(0, i).trim()] = line.substring(i + 1).trim();
}

// Find all MONGODB_URI variants (including commented out ones)
const allLines = env.split('\n').filter(l => l.includes('MONGODB_URI') && l.includes('mongodb'));
console.log('=== ALL MONGODB URIs IN .env.local ===');
for (const l of allLines) {
  const commented = l.trim().startsWith('#');
  const uri = l.replace(/^[#\s]*MONGODB_URI\d*=/, '').trim();
  const host = uri.match(/@([^/?]+)/)?.[1] || 'unknown';
  console.log(`  ${commented ? '[COMMENTED]' : '[ACTIVE]  '} Host: ${host}`);
  
  // Try connecting and checking what's in each
  try {
    const mongo = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongo.db();
    const col = db.collection('externalOpportunities');
    const count = await col.countDocuments();
    const platforms = await col.aggregate([
      { $group: { _id: '$sourceplatform', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    console.log(`    Total docs: ${count}`);
    for (const p of platforms) console.log(`      ${p._id}: ${p.count}`);
    
    // Also check users
    const userCount = await db.collection('users').countDocuments();
    console.log(`    Users: ${userCount}`);
    
    await mongo.close();
  } catch (err) {
    console.log(`    ❌ Connection failed: ${err.message}`);
  }
}
