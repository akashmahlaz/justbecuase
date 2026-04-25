#!/usr/bin/env bun
const apiKey = process.env.THEIRSTACK_API_KEY2;
if (!apiKey) {
  console.log('❌ THEIRSTACK_API_KEY2 not found in env');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
};

// Check credit balance
console.log('⏳ Fetching credit balance...');
const balRes = await fetch('https://api.theirstack.com/v0/billing/credit-balance', {
  headers,
  signal: AbortSignal.timeout(10000),
});

const balance = await balRes.json();
console.log('\n📊 CREDIT BALANCE:');
console.log(JSON.stringify(balance, null, 2));

// Search NGO jobs
console.log('\n⏳ Searching NGO jobs with filters...');
const searchRes = await fetch('https://api.theirstack.com/v1/jobs/search', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    page: 0,
    limit: 5,
    posted_at_max_age_days: 30,
    company_type: 'direct_employer',
    industry_id_or: [70, 74, 78, 81, 84, 99, 101, 139, 141],
    company_description_pattern_or: [
      'nonprofit',
      'non-profit',
      'ngo',
      'charity',
      'foundation',
      'humanitarian',
      'social impact',
      'community development',
      'civil society',
      'social enterprise',
    ],
    company_description_pattern_not: [
      'research institute',
      'laboratory',
      'university',
      'college',
      'hospital',
      'government agency',
      'agency for science',
      'defense',
    ],
    job_description_contains_or: [
      'volunteer',
      'volunteering',
      'volunteer management',
      'community outreach',
      'humanitarian',
      'civil society',
    ],
    remote: true,
    property_exists_or: ['hiring_team'],
    include_total_results: true,
  }),
  signal: AbortSignal.timeout(30000),
});

if (!searchRes.ok) {
  const err = await searchRes.text();
  console.error('❌ Search failed:', err);
  process.exit(1);
}

const data = await searchRes.json();
console.log('\n📋 SEARCH RESULTS:');
console.log(`Total results: ${data.metadata?.total_results || 'unknown'}`);
console.log(`Limit: ${data.metadata?.limit || 'unknown'}`);
console.log(`Jobs returned: ${data.data?.length || 0}`);

if (data.data && data.data.length > 0) {
  console.log('\n🎯 Sample jobs:');
  data.data.slice(0, 3).forEach((job, i) => {
    console.log(`\n  ${i + 1}. ${job.job_title}`);
    console.log(`     Company: ${job.company}`);
    console.log(`     Remote: ${job.remote ? 'Yes' : 'No'}`);
    console.log(`     Hybrid: ${job.hybrid ? 'Yes' : 'No'}`);
    console.log(`     Contacts: ${job.hiring_team?.length || 0}`);
  });
}

console.log('\n✅ Test complete');
