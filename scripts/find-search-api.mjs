import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#'))
    process.env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
}

const API_KEY = process.env.THEIRSTACK_API_KEY;

// Try various saved search endpoints
const endpoints = [
  '/v0/saved-searches',
  '/v1/saved-searches', 
  '/v0/searches/saved',
  '/v0/search/saved',
  '/v0/searches/jobs',
];

for (const ep of endpoints) {
  const res = await fetch(`https://api.theirstack.com${ep}`, {
    headers: { 'Authorization': 'Bearer ' + API_KEY }
  });
  console.log(`GET ${ep}: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  }
}

// Try creating a saved search
console.log('\n=== CREATING SAVED SEARCH ===');
const createEndpoints = [
  '/v0/saved-searches',
  '/v0/searches',
  '/v1/searches',
];

const searchPayload = {
  name: "JustBeCause NGO Jobs",
  type: "job",
  query: {
    posted_at_max_age_days: 30,
    company_type: "direct_employer",
    company_description_pattern_or: [
      "nonprofit organization", "non-profit organization",
      "nongovernmental", "non-governmental",
      "humanitarian aid", "humanitarian organization",
      "charitable organization", "international development",
      "social enterprise", "civil society organization"
    ],
    company_description_pattern_not: [
      "research institute", "laboratory", "university",
      "college", "hospital", "government agency",
      "agency for science", "defense"
    ],
    remote: true
  }
};

for (const ep of createEndpoints) {
  const res = await fetch(`https://api.theirstack.com${ep}`, {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchPayload)
  });
  console.log(`POST ${ep}: ${res.status}`);
  if (res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    console.log(JSON.stringify(data, null, 2));
  }
}
