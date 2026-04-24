// @deprecated - This file is no longer used. Payment Links have been replaced by Stripe Checkout Sessions.
// See app/api/payments/create-subscription/route.ts for the new flow.
//
// Stripe Payment Links Configuration
// Create these links in Stripe Dashboard: https://dashboard.stripe.com/payment-links
// Then add the URLs here

// BUSINESS MODEL:
// - NGO Pro: Can unlock UNLIMITED free volunteer profiles
// - Volunteer Pro: Can apply to UNLIMITED jobs
// - NO individual profile unlock payment!

export const STRIPE_PAYMENT_LINKS = {
  // NGO Pro Subscription
  // For TESTING: Create with Price = $0.05 USD, Billing = Monthly
  // For PRODUCTION: Create with Price = $29.99 USD, Billing = Monthly
  // Redirect URL: https://yoursite.com/api/payments/stripe-link-callback?type=subscription&plan=ngo-pro
  "ngo-pro-monthly": {
    url: "https://buy.stripe.com/00w4gAeb27bQ91U6jdcs801", // TEST LINK ($0.05)
    price: 0.05, // TEST PRICE in USD - change to 29.99 USD for production
    currency: "USD",
    description: "NGO Pro - Unlock unlimited free impact agent profiles",
  },
  
  // Volunteer Pro Subscription  
  // For TESTING: Create with Price = $0.05 USD, Billing = Monthly
  // For PRODUCTION: Create with Price = $9.99 USD, Billing = Monthly
  // Redirect URL: https://yoursite.com/api/payments/stripe-link-callback?type=subscription&plan=volunteer-pro
  "volunteer-pro-monthly": {
    url: "https://buy.stripe.com/aFafZid6YeEi3HAfTNcs800", // TEST LINK ($0.05)
    price: 0.05, // TEST PRICE in USD - change to 9.99 USD for production
    currency: "USD",
    description: "Impact Agent Pro - Apply to unlimited jobs",
  },
}

// HOW TO CREATE PAYMENT LINKS FOR TESTING ($1):
// 
// STEP 1: Go to https://dashboard.stripe.com/payment-links
// STEP 2: Click "+ New payment link"
// 
// CREATE LINK 1 - NGO Pro:
//   - Click "Add new product" or select existing
//   - Name: "NGO Pro Subscription (Test)"
//   - Price: $1 (for testing) or $29.99 (production)
//   - Billing: "Recurring" → "Monthly"
//   - Under "After payment" → "Don't show confirmation page"
//   - Redirect URL: https://yoursite.com/api/payments/stripe-link-callback?type=subscription&plan=ngo-pro
//   - Create link and paste URL above in ngo-pro-monthly.url
// 
// CREATE LINK 2 - Volunteer Pro:
//   - Name: "Volunteer Pro Subscription (Test)"
//   - Price: $1 (for testing) or $9.99 (production)
//   - Billing: "Recurring" → "Monthly"
//   - Redirect URL: https://yoursite.com/api/payments/stripe-link-callback?type=subscription&plan=volunteer-pro
//   - Create link and paste URL above in volunteer-pro-monthly.url

export function getPaymentLinkUrl(
  linkType: keyof typeof STRIPE_PAYMENT_LINKS,
  options: {
    userId: string
    successUrl?: string
    cancelUrl?: string
    metadata?: Record<string, string>
  }
): string | null {
  const link = STRIPE_PAYMENT_LINKS[linkType]
  
  if (!link.url) {
    console.error(`Payment link not configured for: ${linkType}`)
    return null
  }
  
  // Build URL with parameters
  const url = new URL(link.url)
  
  // Add client reference ID (shows up in Stripe Dashboard & webhooks)
  url.searchParams.set("client_reference_id", options.userId)
  
  // Add prefilled email if available
  // url.searchParams.set("prefilled_email", userEmail)
  
  return url.toString()
}
