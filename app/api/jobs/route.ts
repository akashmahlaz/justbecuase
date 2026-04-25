import { NextRequest, NextResponse } from "next/server"

// ============================================
// GET /api/jobs — Redirects to /api/projects
// ============================================
// TheirStack jobs are now stored in the shared externalOpportunities collection
// and served through /api/projects alongside ReliefWeb/Idealist jobs.
// This route is kept as a redirect for backward compatibility.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get("limit") || "25"
  const url = new URL(`/api/projects?limit=${limit}&type=external`, request.url)
  return NextResponse.redirect(url)
}
