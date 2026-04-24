import { NextRequest, NextResponse } from "next/server"
import { contactInquiriesDb, teamMembersDb, getDb } from "@/lib/database"
import { sendEmail, getContactInquiryEmailHtml, getContactAcknowledgementEmailHtml } from "@/lib/email"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// HARDCODED primary admin mailbox — always notified regardless of DB / env state.
const HARDCODED_ADMIN_EMAIL = "admin@justbecausenetwork.com"

// Optional extra recipients via env (comma-separated)
const EXTRA_ADMIN_EMAILS = (process.env.CONTACT_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean)

export async function POST(req: NextRequest) {
  console.log("[Contact API] New submission received")
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { firstName, lastName, email, message, source } = body

  // Validate required fields
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  if (firstName.length > 100 || lastName.length > 100) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }

  if (message.length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 })
  }

  const validSource = source === "pricing_contact_sales" ? "pricing_contact_sales" : "contact_page"

  // 1. Persist to database FIRST so admins can always see it even if email delivery fails
  let id: string
  try {
    id = await contactInquiriesDb.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      source: validSource as "contact_page" | "pricing_contact_sales",
    })
    console.log(`[Contact API] Inquiry persisted with id=${id}`)
  } catch (dbErr) {
    console.error("[Contact API] FAILED to persist inquiry to DB:", dbErr)
    return NextResponse.json({ error: "Failed to save your message. Please try again." }, { status: 500 })
  }

  // 2. Collect notification recipients from multiple sources
  const teamEmails = new Set<string>()

  // ALWAYS add the hardcoded primary admin mailbox first
  teamEmails.add(HARDCODED_ADMIN_EMAIL.toLowerCase())

  // Optional extra recipients from env
  for (const e of EXTRA_ADMIN_EMAILS) teamEmails.add(e.toLowerCase())

  // Active team members
  try {
    const teamMembers = await teamMembersDb.findActive()
    for (const m of teamMembers) {
      if (m.email) teamEmails.add(m.email.toLowerCase())
    }
  } catch (err) {
    console.error("[Contact API] Failed to fetch team members:", err)
  }

  // Admins collection
  try {
    const db = await getDb()
    const admins = await db.collection("admins").find({}).toArray()
    for (const admin of admins) {
      if (admin.email) teamEmails.add(String(admin.email).toLowerCase())
    }
  } catch (err) {
    console.error("[Contact API] Failed to fetch admins:", err)
  }

  console.log(`[Contact API] Notifying ${teamEmails.size} recipient(s):`, Array.from(teamEmails))

  // 3. Send notification emails (don't fail the request if email delivery fails)
  const emailHtml = getContactInquiryEmailHtml({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    message: message.trim(),
    source: validSource,
  })

  const subjectPrefix = validSource === "pricing_contact_sales" ? "[Sales Inquiry]" : "[Contact]"
  const emailSubject = `${subjectPrefix} New message from ${firstName.trim()} ${lastName.trim()}`

  try {
    const emailResults = await Promise.allSettled(
      Array.from(teamEmails).map(async (teamEmail) => {
        const success = await sendEmail({
          to: teamEmail,
          subject: emailSubject,
          html: emailHtml,
          replyTo: email.trim(),
        })
        if (!success) console.error(`[Contact API] Email failed for: ${teamEmail}`)
        return { email: teamEmail, success }
      })
    )

    const failedCount = emailResults.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    ).length

    if (failedCount > 0) {
      console.warn(`[Contact API] ${failedCount}/${teamEmails.size} notification emails failed`)
    } else {
      console.log(`[Contact API] All ${teamEmails.size} notification emails dispatched successfully`)
    }
  } catch (mailErr) {
    console.error("[Contact API] Notification dispatch threw:", mailErr)
  }

  // 4. Send acknowledgement email to the submitter (best-effort)
  try {
    const ackHtml = getContactAcknowledgementEmailHtml(firstName.trim())
    const ackOk = await sendEmail({
      to: email.trim().toLowerCase(),
      subject: "We've received your message — JustBeCause Network",
      html: ackHtml,
    })
    if (!ackOk) console.error(`[Contact API] Acknowledgement email failed for: ${email}`)
  } catch (ackErr) {
    console.error("[Contact API] Acknowledgement email threw:", ackErr)
  }

  return NextResponse.json({ success: true, id })
}
