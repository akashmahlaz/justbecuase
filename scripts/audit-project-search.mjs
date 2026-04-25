const base = "http://localhost:3000/api/projects?page=1&limit=200"

const categories = [
  ["digital-marketing", "Digital Marketing"],
  ["fundraising", "Fundraising Assistance"],
  ["website", "Website & App Development"],
  ["finance", "Finance & Accounting"],
  ["content-creation", "Content Creation & Design"],
  ["communication", "Communication & Writing"],
  ["planning-support", "Planning & Operations"],
  ["legal", "Legal & Compliance"],
  ["data-technology", "Data & Technology"],
]

async function total(params) {
  const response = await fetch(`${base}&${params}`)
  const data = await response.json()
  return data.pagination?.total ?? -1
}

for (const [id, name] of categories) {
  const q = encodeURIComponent(name)
  const search = await total(`q=${q}`)
  const skill = await total(`skills=${id}`)
  const both = await total(`q=${q}&skills=${id}`)
  const ok = search === skill && skill === both ? "OK" : "MISMATCH"
  console.log(`${ok} | ${name} | q=${search} skill=${skill} both=${both}`)
}

const aliases = [
  ["web dev", "website"],
  ["react", "website"],
  ["grant writing", "fundraising"],
  ["seo", "digital-marketing"],
  ["graphic design", "content-creation"],
  ["copywriting", "communication"],
  ["project management", "planning-support"],
  ["legal", "legal"],
  ["data analysis", "data-technology"],
]

for (const [query, id] of aliases) {
  const q = encodeURIComponent(query)
  const search = await total(`q=${q}`)
  const both = await total(`q=${q}&skills=${id}`)
  const ok = search === both ? "OK" : "MISMATCH"
  console.log(`${ok} | alias '${query}' + ${id} | q=${search} both=${both}`)
}