import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { ngoProfilesDb, volunteerProfilesDb } from "@/lib/database"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user
    const role = user.role as string

    if (role === "ngo") {
      const profile = await ngoProfilesDb.findByUserId(user.id)
      if (!profile) {
        return NextResponse.json({ ngoSubscription: null })
      }
      
      return NextResponse.json({
        ngoSubscription: {
          plan: profile.subscriptionPlan || "free",
          unlocksUsed: profile.monthlyUnlocksUsed || 0,
          expiryDate: profile.subscriptionExpiry?.toISOString(),
        }
      })
    } else if (role === "volunteer") {
      const profile = await volunteerProfilesDb.findByUserId(user.id)
      if (!profile) {
        return NextResponse.json({ volunteerSubscription: null })
      }
      
      return NextResponse.json({
        volunteerSubscription: {
          plan: profile.subscriptionPlan || "free",
          applicationsUsed: profile.monthlyApplicationsUsed || 0,
          expiryDate: profile.subscriptionExpiry?.toISOString(),
        }
      })
    }

    return NextResponse.json({})
  } catch (error: any) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
  }
}
