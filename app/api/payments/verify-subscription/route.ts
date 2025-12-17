import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { ngoProfilesDb, volunteerProfilesDb, transactionsDb } from "@/lib/database"

// Calculate subscription expiry (1 month from now)
function getSubscriptionExpiry(): Date {
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + 1)
  return expiry
}

// Calculate next reset date (1st of next month)
function getNextResetDate(): Date {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth
}

// Verify Razorpay payment and activate subscription
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 })
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
    }

    const userId = session.user.id
    const userRole = session.user.role as string
    const subscriptionExpiry = getSubscriptionExpiry()
    const resetDate = getNextResetDate()

    // Determine plan type and update appropriate profile
    const isNgoPlan = planId.startsWith("ngo-")
    const isPro = planId.endsWith("-pro")

    if (isNgoPlan && userRole === "ngo") {
      // Update NGO profile
      const profile = await ngoProfilesDb.findByUserId(userId)
      if (!profile) {
        return NextResponse.json({ error: "NGO profile not found" }, { status: 404 })
      }

      await ngoProfilesDb.update(userId, {
        subscriptionPlan: isPro ? "pro" : "free",
        subscriptionExpiry,
        monthlyUnlocksUsed: 0, // Reset on upgrade
        monthlyUnlocksLimit: isPro ? 999999 : 0, // Free plan = 0 unlocks
        subscriptionResetDate: resetDate,
      })
    } else if (!isNgoPlan && userRole === "volunteer") {
      // Update Volunteer profile
      const profile = await volunteerProfilesDb.findByUserId(userId)
      if (!profile) {
        return NextResponse.json({ error: "Volunteer profile not found" }, { status: 404 })
      }

      await volunteerProfilesDb.update(userId, {
        subscriptionPlan: isPro ? "pro" : "free",
        subscriptionExpiry,
        monthlyApplicationsUsed: 0, // Reset on upgrade
        subscriptionResetDate: resetDate,
      })
    } else {
      return NextResponse.json({ error: "Plan does not match user role" }, { status: 400 })
    }

    // Create transaction record
    const amount = planId === "ngo-pro" ? 2999 : planId === "volunteer-pro" ? 999 : 0
    await transactionsDb.create({
      userId,
      type: "subscription",
      referenceId: planId,
      referenceType: "subscription",
      amount,
      currency: "INR",
      paymentGateway: "razorpay",
      paymentId: razorpay_payment_id,
      status: "completed",
      paymentStatus: "completed",
      description: `${isPro ? "Pro" : "Free"} Plan Subscription`,
      createdAt: new Date(),
    })

    return NextResponse.json({ 
      success: true, 
      message: "Subscription activated successfully" 
    })
  } catch (error: any) {
    console.error("Error verifying subscription payment:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to verify payment" 
    }, { status: 500 })
  }
}
