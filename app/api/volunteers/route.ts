import { NextResponse } from "next/server"
import { browseVolunteers } from "@/lib/actions"

export async function GET() {
  try {
    // Cap raised so the impact-agents listing isn't truncated to the
    // browseVolunteers default. Search results from /api/unified-search will
    // still surface anything beyond this cap globally.
    const volunteers = await browseVolunteers({ limit: 500 })
    return NextResponse.json({ volunteers })
  } catch (error) {
    console.error("Error fetching volunteers:", error)
    return NextResponse.json({ volunteers: [] }, { status: 500 })
  }
}
