import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { contactInquiriesDb, getDb } from "@/lib/database"
import { sendEmail } from "@/lib/email"

/**
 * Diagnostic endpoint for the contact-inquiry pipeline.
 * Visit /api/debug/contact while logged in as admin to verify:
 *   - DB connectivity & inquiry count
 *   - Email config (RESEND_API_KEY + FROM_EMAIL)
 *   - End-to-end send by emailing admin@justbecausenetwork.com
 */
export async function GET() {
  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      hasResendAkash: Boolean(process.env.RESEND_AKASH),
      fromEmail: process.env.FROM_EMAIL || "(default)",
      contactAdminEmails: process.env.CONTACT_ADMIN_EMAILS || "(unset, using hardcoded)",
      mongoUriConfigured: Boolean(process.env.MONGODB_URI),
    },
  }

  // Auth gate (must be admin)
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ ...result, error: "Unauthorized" }, { status: 401 })
    }
    const db = await getDb()
    const isRoleAdmin = (session.user as any)?.role === "admin"
    const admin = isRoleAdmin
      ? { email: session.user.email }
      : await db.collection("admins").findOne({ email: session.user.email })
    if (!admin) {
      return NextResponse.json(
        {
          ...result,
          error: `Not an admin. Logged in as ${session.user.email} (role=${(session.user as any)?.role})`,
        },
        { status: 403 }
      )
    }
    result.adminEmail = session.user.email
  } catch (err: any) {
    return NextResponse.json({ ...result, error: `Auth failed: ${err.message}` }, { status: 500 })
  }

  // DB check
  try {
    const stats = await contactInquiriesDb.getStats()
    const recent = await contactInquiriesDb.findAll()
    result.db = {
      ok: true,
      stats,
      recentCount: recent.length,
      latest: recent.slice(0, 3).map((r) => ({
        id: String(r._id),
        firstName: r.firstName,
        email: r.email,
        createdAt: r.createdAt,
        source: r.source,
      })),
    }
  } catch (err: any) {
    result.db = { ok: false, error: err.message }
  }

  // Email send test
  const target = "admin@justbecausenetwork.com"
  try {
    const sent = await sendEmail({
      to: target,
      subject: "[Diag] JustBeCause contact-inquiry pipeline test",
      html: `<p>This is a diagnostic test sent at ${new Date().toISOString()}.</p>
             <p>If you can read this, Resend + DNS + FROM_EMAIL are working.</p>`,
    })
    result.emailTest = { to: target, sent }
  } catch (err: any) {
    result.emailTest = { to: target, sent: false, error: err.message }
  }

  return NextResponse.json(result)
}
