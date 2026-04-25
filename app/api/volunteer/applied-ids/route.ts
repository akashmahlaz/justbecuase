import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getMyApplications } from "@/lib/actions"

/**
 * GET /api/volunteer/applied-ids
 * Returns a list of project IDs the current volunteer has applied to.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user || session.user.role !== "volunteer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const applications = await getMyApplications()
    const appliedIds = applications.map((a) => a.projectId)

    return NextResponse.json({ appliedIds })
  } catch (error) {
    console.error("[volunteer/applied-ids] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
