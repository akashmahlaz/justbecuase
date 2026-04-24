import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getStripeClient } from "@/lib/payment-gateway"
import { adminSettingsDb, couponsDb, couponUsagesDb } from "@/lib/database"
import { toStripeAmount } from "@/lib/currency"

// Plan display names for Stripe checkout
const PLAN_NAMES: Record<string, string> = {
  "ngo-pro": "Enterprise Pro Plan",
  "volunteer-pro": "Candidate Pro Plan",
}

// Create a Stripe Checkout Session for subscription
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { planId, couponCode } = body

    if (!planId) {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 })
    }

    // Free plans don't need payment
    if (planId === "ngo-free" || planId === "volunteer-free") {
      return NextResponse.json({ 
        success: true, 
        message: "Free plan, no payment needed" 
      })
    }

    // Validate plan
    const planName = PLAN_NAMES[planId]
    if (!planName) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // Validate user role matches plan type
    const userRole = session.user.role as string
    const planRole = planId.startsWith("ngo-") ? "ngo" : "volunteer"
    if (userRole !== planRole) {
      return NextResponse.json({ 
        error: `This plan is for ${planRole}s only` 
      }, { status: 403 })
    }

    // Fetch admin-configured prices from database
    const adminSettings = await adminSettingsDb.get()
    const currency = (adminSettings?.currency || "INR").toLowerCase()
    const priceWholeUnits = planId === "ngo-pro"
      ? (Number(adminSettings?.ngoProPrice) || 2999)
      : (Number(adminSettings?.volunteerProPrice) || 999)

    if (priceWholeUnits <= 0) {
      return NextResponse.json({ error: "Price not configured" }, { status: 400 })
    }

    // Check if payments are enabled
    if (adminSettings && adminSettings.enablePayments === false) {
      return NextResponse.json({ error: "Payments are currently disabled" }, { status: 400 })
    }

    // Get Stripe client (handles org key + account context automatically)
    const { stripe } = await getStripeClient()

    // Build URLs
    const origin = request.headers.get("origin") || process.env.FRONTEND_URL || "https://justbecausenetwork.com"

    // Validate and apply coupon if provided
    let finalPrice = priceWholeUnits
    let couponData: { couponId: string; couponCode: string; discountAmount: number; originalAmount: number } | null = null

    if (couponCode) {
      const couponResult = await couponsDb.validate(couponCode, session.user.id, planId, priceWholeUnits)
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.error || "Invalid coupon" }, { status: 400 })
      }
      finalPrice = couponResult.finalAmount!
      couponData = {
        couponId: couponResult.coupon!._id!.toString(),
        couponCode: couponCode.toUpperCase(),
        discountAmount: couponResult.discountAmount!,
        originalAmount: priceWholeUnits,
      }

      // If coupon makes it fully free, skip Stripe entirely
      if (finalPrice <= 0) {
        // Record coupon usage
        await couponsDb.incrementUsage(couponCode)
        await couponUsagesDb.create({
          couponId: couponData.couponId,
          couponCode: couponData.couponCode,
          userId: session.user.id,
          planId,
          discountAmount: couponData.discountAmount,
          originalAmount: couponData.originalAmount,
          finalAmount: 0,
          usedAt: new Date(),
        })

        return NextResponse.json({
          gateway: "coupon",
          url: `${origin}/api/payments/stripe-callback?coupon_free=true&plan=${planId}&coupon=${couponCode.toUpperCase()}`,
          message: "Coupon applied — 100% discount",
        })
      }
    }

    // Create Stripe Checkout Session with dynamic price_data from admin settings
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: couponData 
                ? `${planName} (Coupon: ${couponData.couponCode})`
                : planName,
            },
            unit_amount: toStripeAmount(finalPrice),
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: session.user.id,
      customer_email: session.user.email || undefined,
      metadata: {
        userId: session.user.id,
        planId,
        userRole,
        ...(couponData ? {
          couponCode: couponData.couponCode,
          couponId: couponData.couponId,
          originalAmount: String(couponData.originalAmount),
          discountAmount: String(couponData.discountAmount),
        } : {}),
      },
      success_url: `${origin}/api/payments/stripe-callback?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: `${origin}/pricing?payment=cancelled`,
    })

    return NextResponse.json({
      gateway: "stripe",
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error)
    
    // Return specific error messages based on the type of failure
    const message = error.message || "Failed to create checkout session"
    
    if (message.includes("not configured") || message.includes("Stripe is not configured")) {
      return NextResponse.json({ 
        error: "Payment gateway is not configured. Please contact support or try again later." 
      }, { status: 503 })
    }
    
    if (message.includes("API key") || message.includes("authentication")) {
      return NextResponse.json({ 
        error: "Payment system configuration error. Please contact support." 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: message
    }, { status: 500 })
  }
}
