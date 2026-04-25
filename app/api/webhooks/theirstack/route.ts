import { NextResponse } from "next/server"
import { externalOpportunitiesDb } from "@/lib/scraper"
import { mapTheirStackToOpportunity } from "@/lib/theirstack-sync"
import { createHmac, timingSafeEqual } from "crypto"

export const maxDuration = 30

// ============================================
// POST /api/webhooks/theirstack — Receives job.new events
// ============================================
// TheirStack sends a POST for every new job matching the saved search.
// We validate the signature, map the job, and upsert into MongoDB.

export async function POST(request: Request) {
  try {
    const body = await request.text()

    // Verify HMAC-SHA256 signature if secret is configured
    const secret = process.env.THEIRSTACK_WEBHOOK_SECRET
    if (secret) {
      const signature = request.headers.get("x-theirstack-signature-256")
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 })
      }
      const expected = createHmac("sha256", secret).update(body).digest("hex")
      const sig = signature.replace(/^sha256=/, "")
      if (
        sig.length !== expected.length ||
        !timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
      ) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const event = JSON.parse(body)

    // Only handle job.new events
    if (event.type !== "job.new") {
      return NextResponse.json({ ok: true, skipped: true, reason: "not job.new" })
    }

    const job = event.payload
    if (!job || !job.id || !job.job_title) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Map to our ExternalOpportunity schema and upsert into MongoDB
    const opportunity = mapTheirStackToOpportunity(job)
    await externalOpportunitiesDb.upsert(opportunity)

    console.log(
      `[webhook/theirstack] job.new | ${job.company} — ${job.job_title} (ID: ${job.id})`
    )

    return NextResponse.json({ ok: true, jobId: job.id })
  } catch (error) {
    console.error("[webhook/theirstack] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Health check for TheirStack test events
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "theirstack-webhook" })
}
