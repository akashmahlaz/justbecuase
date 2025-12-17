import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

// Subscription plan prices (₹1 for testing)
const PLAN_PRICES: Record<string, number> = {
  "ngo-free": 0,
  "ngo-pro": 1, // Testing: ₹1 (production: 2999)
  "volunteer-free": 0,
  "volunteer-pro": 1, // Testing: ₹1 (production: 999)
}

// Create a Razorpay order for subscription
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { planId, amount } = body

    if (!planId) {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 })
    }

    // Validate plan exists
    const expectedPrice = PLAN_PRICES[planId]
    if (expectedPrice === undefined) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // Validate amount matches
    const finalAmount = amount || expectedPrice
    if (finalAmount !== expectedPrice) {
      return NextResponse.json({ error: "Invalid amount for plan" }, { status: 400 })
    }

    // Free plans don't need payment
    if (finalAmount === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Free plan, no payment needed" 
      })
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ 
        error: "Payment gateway not configured" 
      }, { status: 500 })
    }

    // Validate user role matches plan type
    const userRole = session.user.role as string
    const planRole = planId.startsWith("ngo-") ? "ngo" : "volunteer"
    if (userRole !== planRole) {
      return NextResponse.json({ 
        error: `This plan is for ${planRole}s only` 
      }, { status: 403 })
    }

    // Create Razorpay order
    const Razorpay = require("razorpay")
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const order = await razorpay.orders.create({
      amount: finalAmount * 100, // Amount in paise
      currency: "INR",
      receipt: `sub_${Date.now()}`.slice(0, 40), // Max 40 chars
      notes: {
        userId: session.user.id,
        planId,
        type: "subscription",
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: finalAmount,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  } catch (error: any) {
    console.error("Error creating subscription order:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to create order" 
    }, { status: 500 })
  }
}
