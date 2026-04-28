import { NextResponse } from "next/server"
import { browseVolunteers } from "@/lib/actions"

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

function matchesVolunteerQuery(volunteer: Record<string, any>, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true
  const searchable = normalizeSearchText([
    volunteer.name,
    volunteer.bio,
    volunteer.location,
    volunteer.workMode,
    volunteer.volunteerType,
  ].filter(Boolean).join(" "))
  if (searchable.includes(normalizedQuery)) return true
  const terms = normalizedQuery.split(" ").filter((term) => term.length >= 2)
  return terms.length > 0 && terms.every((term) => searchable.includes(term))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim() || ""
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "500", 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 500

    // Cap raised so the impact-agents listing isn't truncated to the
    // browseVolunteers default. Search results from /api/unified-search will
    // still surface anything beyond this cap globally.
    const volunteers = await browseVolunteers({ limit: 500 })
    const filtered = query ? volunteers.filter((volunteer: any) => matchesVolunteerQuery(volunteer, query)) : volunteers
    return NextResponse.json({ volunteers: filtered.slice(0, limit) })
  } catch (error) {
    console.error("Error fetching volunteers:", error)
    return NextResponse.json({ volunteers: [] }, { status: 500 })
  }
}
