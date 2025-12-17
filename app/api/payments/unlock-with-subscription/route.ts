import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { ngoProfilesDb, profileUnlocksDb, volunteerProfilesDb, notificationsDb } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ngo") {
      return NextResponse.json({ error: "Only NGOs can unlock profiles" }, { status: 403 })
    }

    const body = await request.json()
    const { volunteerId } = body

    if (!volunteerId) {
      return NextResponse.json({ error: "Volunteer ID required" }, { status: 400 })
    }

    // Get NGO profile to check subscription
    const ngoProfile = await ngoProfilesDb.findByUserId(session.user.id)
    if (!ngoProfile) {
      return NextResponse.json({ error: "NGO profile not found" }, { status: 404 })
    }

    // Check if Pro plan
    if (ngoProfile.subscriptionPlan !== "pro") {
      return NextResponse.json({ 
        error: "Pro subscription required. Upgrade to unlock unlimited profiles.",
        code: "NOT_PRO"
      }, { status: 403 })
    }

    // Check if volunteer exists
    const volunteerProfile = await volunteerProfilesDb.findByUserId(volunteerId)
    if (!volunteerProfile) {
      return NextResponse.json({ error: "Volunteer not found" }, { status: 404 })
    }

    // If volunteer is paid type, no unlock needed
    if (volunteerProfile.volunteerType === "paid") {
      return NextResponse.json({ 
        success: true, 
        message: "Profile is already accessible (paid volunteer)" 
      })
    }

    // Check if already unlocked
    const alreadyUnlocked = await profileUnlocksDb.isUnlocked(session.user.id, volunteerId)
    if (alreadyUnlocked) {
      return NextResponse.json({ 
        success: true, 
        message: "Profile already unlocked" 
      })
    }

    // Create unlock record (free with subscription)
    await profileUnlocksDb.createIfNotExists({
      ngoId: session.user.id,
      volunteerId,
      amountPaid: 0, // Free with Pro subscription
      currency: "INR",
      unlockedAt: new Date(),
    })

    // Increment monthly unlock count
    try {
      await ngoProfilesDb.incrementMonthlyUnlocks(session.user.id)
    } catch (e) {
      console.error("Failed to increment unlocks:", e)
    }

    // Notify volunteer (best effort)
    try {
      await notificationsDb.create({
        userId: volunteerId,
        type: "profile_viewed",
        title: "Your Profile Was Viewed",
        message: `${ngoProfile.organizationName || "An NGO"} unlocked your profile`,
        referenceId: session.user.id,
        referenceType: "ngo",
        isRead: false,
        createdAt: new Date(),
      })
    } catch (e) {
      console.error("Failed to create notification:", e)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Profile unlocked successfully" 
    })
  } catch (error: any) {
    console.error("Error unlocking profile with subscription:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to unlock profile" 
    }, { status: 500 })
  }
}
