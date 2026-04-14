import { readFileSync } from 'fs';
import { MongoClient } from 'mongodb';

const env = readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#'))
    process.env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
}

const mongo = await MongoClient.connect(process.env.MONGODB_URI);

// Check default db (what our sync script used)
const defaultDb = mongo.db();
const defaultCount = await defaultDb.collection('externalOpportunities').countDocuments();
console.log(`Default DB ("${defaultDb.databaseName}"): ${defaultCount} externalOpportunities`);

// Check justbecause db (what the app uses)
const appDb = mongo.db('justbecause');
const appCount = await appDb.collection('externalOpportunities').countDocuments();
console.log(`App DB ("justbecause"): ${appCount} externalOpportunities`);

// List all databases
const dbs = await mongo.db().admin().listDatabases();
console.log('\nAll databases:');
for (const d of dbs.databases) {
  console.log(`  ${d.name} (${(d.sizeOnDisk / 1024 / 1024).toFixed(1)} MB)`);
}

await mongo.close();
