import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { adminSettingsDb } from "@/lib/database"

// Create a Razorpay order for profile unlock
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
    const { volunteerId, amount } = body

    if (!volunteerId) {
      return NextResponse.json({ error: "Volunteer ID required" }, { status: 400 })
    }

    // Get settings for pricing
    const settings = await adminSettingsDb.get()
    const unlockPrice = amount || settings?.singleProfileUnlockPrice || 499
    const currency = settings?.currency || "INR"

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ 
        error: "Payment gateway not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables." 
      }, { status: 500 })
    }

    // Create Razorpay order
    const Razorpay = require("razorpay")
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const order = await razorpay.orders.create({
      amount: unlockPrice * 100, // Amount in paise
      currency,
      receipt: `unlock_${volunteerId}_${Date.now()}`,
      notes: {
        ngoId: session.user.id,
        volunteerId,
        type: "profile_unlock",
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: unlockPrice,
      currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (error: any) {
    console.error("Error creating payment order:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to create payment order" 
    }, { status: 500 })
  }
}
