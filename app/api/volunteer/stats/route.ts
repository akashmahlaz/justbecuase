import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getMyApplications, getVolunteerProfile, getMatchedOpportunitiesForVolunteer } from "@/lib/actions"

/**
 * GET /api/volunteer/stats
 * Returns quick stats for the volunteer dashboard header strip.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user || session.user.role !== "volunteer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [applications, profile, matches] = await Promise.all([
      getMyApplications(),
      getVolunteerProfile(),
      getMatchedOpportunitiesForVolunteer(),
    ])

    const pending = applications.filter((a) => a.status === "pending").length
    const hoursContributed = profile?.hoursContributed ?? 0
    const newMatches = matches.length

    return NextResponse.json({ pending, hoursContributed, newMatches })
  } catch (error) {
    console.error("[volunteer/stats] error:", error)
    return NextResponse.json({ pending: 0, hoursContributed: 0, newMatches: 0 })
  }
}
