import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#'))
    process.env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
}

const API_KEY = process.env.THEIRSTACK_API_KEY;

// 1. List existing saved searches
console.log('=== EXISTING SAVED SEARCHES ===');
const searchRes = await fetch('https://api.theirstack.com/v0/searches', {
  headers: { 'Authorization': 'Bearer ' + API_KEY }
});
if (searchRes.ok) {
  const searches = await searchRes.json();
  console.log(JSON.stringify(searches, null, 2));
} else {
  console.log('Searches API:', searchRes.status, await searchRes.text());
}

// 2. List existing webhooks
console.log('\n=== EXISTING WEBHOOKS ===');
const whRes = await fetch('https://api.theirstack.com/v0/webhooks', {
  headers: { 'Authorization': 'Bearer ' + API_KEY }
});
if (whRes.ok) {
  const webhooks = await whRes.json();
  console.log(JSON.stringify(webhooks, null, 2));
} else {
  console.log('Webhooks API:', whRes.status, await whRes.text());
}
