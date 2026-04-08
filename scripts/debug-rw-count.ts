import { fetchAllJobsUnfiltered } from "../lib/reliefweb-api"

const { jobs, total } = await fetchAllJobsUnfiltered()
console.log(`RW: total=${total}, jobs.length=${jobs.length}`)
if (jobs.length > 0) {
  console.log('first job:', jobs[0].fields?.title)
  console.log('last job:', jobs[jobs.length - 1].fields?.title)
}
