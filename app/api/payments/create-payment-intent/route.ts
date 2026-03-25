import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getStripeClient } from "@/lib/payment-gateway"
import { adminSettingsDb, couponsDb, couponUsagesDb } from "@/lib/database"
import { toStripeAmount } from "@/lib/currency"

const PLAN_NAMES: Record<string, string> = {
  "ngo-pro": "NGO Pro Plan",
  "volunteer-pro": "Impact Agent Pro Plan",
}

/**
 * Creates a Stripe PaymentIntent for the embedded Elements checkout.
 * Returns { clientSecret, publishableKey } so the frontend can confirm payment.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { planId, couponCode, billingCycle } = body

    if (!planId) {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 })
    }

    // Free plans don't need payment
    if (planId === "ngo-free" || planId === "volunteer-free") {
      return NextResponse.json({ success: true, message: "Free plan, no payment needed" })
    }

    const planName = PLAN_NAMES[planId]
    if (!planName) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // Validate role
    const userRole = session.user.role as string
    const planRole = planId.startsWith("ngo-") ? "ngo" : "volunteer"
    if (userRole !== planRole) {
      return NextResponse.json({ error: `This plan is for ${planRole}s only` }, { status: 403 })
    }

    // Fetch admin prices
    const adminSettings = await adminSettingsDb.get()
    const currency = (adminSettings?.currency || "INR").toLowerCase()
    const priceWholeUnits = (() => {
      if (billingCycle === "yearly") {
        return planId === "ngo-pro"
          ? (Number(adminSettings?.ngoProYearlyPrice) || Math.round((Number(adminSettings?.ngoProPrice) || 2999) * 10))
          : (Number(adminSettings?.volunteerProYearlyPrice) || Math.round((Number(adminSettings?.volunteerProPrice) || 999) * 10))
      }
      return planId === "ngo-pro"
        ? (Number(adminSettings?.ngoProPrice) || 2999)
        : (Number(adminSettings?.volunteerProPrice) || 999)
    })()

    if (priceWholeUnits <= 0) {
      return NextResponse.json({ error: "Price not configured" }, { status: 400 })
    }

    if (adminSettings && adminSettings.enablePayments === false) {
      return NextResponse.json({ error: "Payments are currently disabled" }, { status: 400 })
    }

    // Get Stripe client
    const { stripe, publishableKey } = await getStripeClient()

    // Apply coupon
    let finalPrice = priceWholeUnits
    let couponData: {
      couponId: string
      couponCode: string
      discountAmount: number
      originalAmount: number
    } | null = null

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

      // 100% discount → skip Stripe entirely
      if (finalPrice <= 0) {
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

        const origin = request.headers.get("origin") || process.env.FRONTEND_URL || "https://justbecausenetwork.com"
        return NextResponse.json({
          free: true,
          redirectUrl: `${origin}/api/payments/stripe-callback?coupon_free=true&plan=${planId}&coupon=${couponCode.toUpperCase()}`,
          message: "Coupon applied — 100% discount",
        })
      }
    }

    // Create Stripe PaymentIntent (one-time payment representing first month)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(finalPrice),
      currency,
      automatic_payment_methods: { enabled: true },
      description: couponData
        ? `${planName} (Coupon: ${couponData.couponCode})`
        : planName,
      receipt_email: session.user.email || undefined,
      metadata: {
        userId: session.user.id,
        planId,
        userRole,
        billingCycle: billingCycle || "monthly",
        ...(couponData
          ? {
              couponCode: couponData.couponCode,
              couponId: couponData.couponId,
              originalAmount: String(couponData.originalAmount),
              discountAmount: String(couponData.discountAmount),
            }
          : {}),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error: any) {
    console.error("Error creating PaymentIntent:", error)

    const message = error.message || "Failed to create payment"
    if (message.includes("not configured") || message.includes("Stripe is not configured")) {
      return NextResponse.json(
        { error: "Payment gateway is not configured. Please contact support." },
        { status: 503 }
      )
    }
    if (message.includes("API key") || message.includes("authentication")) {
      return NextResponse.json(
        { error: "Payment system configuration error. Please contact support." },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
