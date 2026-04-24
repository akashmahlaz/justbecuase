import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { unlockVolunteerProfile } from "@/lib/actions"
import { verifyPayment } from "@/lib/payment-gateway"
import type { PaymentGatewayType } from "@/lib/types"

// Verify payment and unlock profile (supports Stripe & Razorpay)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ngo") {
      return NextResponse.json({ error: "Only Enterprises can unlock profiles" }, { status: 403 })
    }

    const body = await request.json()
    const { 
      gateway, 
      volunteerId,
      // Stripe
      paymentIntentId,
      // Razorpay
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
    } = body

    if (!volunteerId) {
      return NextResponse.json({ error: "Candidate ID required" }, { status: 400 })
    }

    let paymentVerification: { success: boolean; paymentId: string }

    // Verify based on gateway type
    const paymentGateway: PaymentGatewayType = gateway || (razorpay_order_id ? "razorpay" : "stripe")

    if (paymentGateway === "stripe") {
      if (!paymentIntentId) {
        return NextResponse.json({ error: "Payment intent ID required for Stripe" }, { status: 400 })
      }
      paymentVerification = await verifyPayment({
        gateway: "stripe",
        paymentIntentId,
      })
    } else if (paymentGateway === "razorpay") {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: "Missing Razorpay payment details" }, { status: 400 })
      }
      paymentVerification = await verifyPayment({
        gateway: "razorpay",
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      })
    } else {
      return NextResponse.json({ error: "Invalid payment gateway" }, { status: 400 })
    }

    if (!paymentVerification.success) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
    }

    // Payment verified, unlock the profile
    const result = await unlockVolunteerProfile(volunteerId, paymentVerification.paymentId)

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
