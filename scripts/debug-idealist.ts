import { fetchAllNonprofitJobs } from "../lib/idealist-api"

const jobs = await fetchAllNonprofitJobs(5000)
console.log(`Idealist: ${jobs.length} jobs returned`)
console.log('First:', jobs[0]?.name)
console.log('Last:', jobs[jobs.length - 1]?.name)
