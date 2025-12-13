import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { unlockVolunteerProfile } from "@/lib/actions"

// Verify Razorpay payment and unlock profile
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, volunteerId } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !volunteerId) {
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

    // Payment verified, unlock the profile
    const result = await unlockVolunteerProfile(volunteerId, razorpay_payment_id)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to unlock profile" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Profile unlocked successfully" 
    })
  } catch (error: any) {
    console.error("Error verifying payment:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to verify payment" 
    }, { status: 500 })
  }
}
