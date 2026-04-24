import { NextRequest, NextResponse } from "next/server"

// DEPRECATED: Individual profile unlock payments have been removed
// Business Model:
// - NGO Pro subscription = Unlock UNLIMITED free volunteer profiles
// - Volunteer Pro subscription = Apply to UNLIMITED jobs
// No pay-per-profile option anymore

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: "Individual profile unlock payments are no longer available. Please upgrade to NGO Pro subscription to unlock unlimited candidate profiles.",
    upgradeUrl: "/pricing"
  }, { status: 400 })
}
