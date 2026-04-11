const API_BASE = "https://api.reliefweb.int/v2"
const APP_NAME = "JBCN1235UKsOWVihHUJtRzg5huGfMm"

const LIST_FIELDS = [
  "title","body","body-html","how_to_apply","how_to_apply-html","source.name","source.shortname",
  "source.longname","source.homepage","source.type.name","country.name","country.iso3","city.name",
  "experience.name","career_categories.name","theme.name","type.name","date.closing","date.created",
  "date.changed","url","url_alias","status",
]

async function fetchAllJobsUnfiltered() {
  const allJobs = []
  let offset = 0
  const limit = 1000

  while (true) {
    const payload = {
      preset: "latest",
      limit,
      offset,
      slim: "1",
      fields: { include: LIST_FIELDS },
    }

    console.log(`[RW] Calling offset=${offset}, limit=${limit}`)

    const res = await fetch(`${API_BASE}/jobs?appname=${APP_NAME}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      throw new Error(`ReliefWeb API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    console.log(`[RW] Response: totalCount=${data.totalCount}, count=${data.count}, data.length=${data.data.length}`)
    allJobs.push(...data.data)

    if (data.data.length < limit) break
    offset += limit
  }

  return { jobs: allJobs, total: allJobs.length }
}

const { jobs, total } = await fetchAllJobsUnfiltered()
console.log(`\nTotal returned: ${total} jobs, first: "${jobs[0]?.fields?.title}"`)
