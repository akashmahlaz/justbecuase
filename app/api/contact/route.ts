import { NextRequest, NextResponse } from "next/server"
import { contactInquiriesDb, teamMembersDb, getDb } from "@/lib/database"
import { sendEmail, getContactInquiryEmailHtml, getContactAcknowledgementEmailHtml } from "@/lib/email"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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

    // Store in database
    const id = await contactInquiriesDb.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      source: validSource as "contact_page" | "pricing_contact_sales",
    })

    // Collect team email addresses from multiple sources
    const teamEmails = new Set<string>()

    // 1. Fetch active team members with email
    try {
      const teamMembers = await teamMembersDb.findActive()
      for (const m of teamMembers) {
        if (m.email) teamEmails.add(m.email)
      }
    } catch (err) {
      console.error("[Contact API] Failed to fetch team members:", err)
    }

    // 2. Fetch admin emails as fallback
    try {
      const db = await getDb()
      const admins = await db.collection("admins").find({}).toArray()
      for (const admin of admins) {
        if (admin.email) teamEmails.add(admin.email)
      }
    } catch (err) {
      console.error("[Contact API] Failed to fetch admins:", err)
    }

    // 3. Hardcoded fallback to ensure at least one recipient
    if (teamEmails.size === 0) {
      teamEmails.add("admin@justbecausenetwork.com")
    }

    const emailHtml = getContactInquiryEmailHtml({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      message: message.trim(),
      source: validSource,
    })

    const subjectPrefix = validSource === "pricing_contact_sales" ? "[Sales Inquiry]" : "[Contact]"
    const emailSubject = `${subjectPrefix} New message from ${firstName.trim()} ${lastName.trim()}`

    // Send to all team members in parallel and log results
    const emailResults = await Promise.allSettled(
      Array.from(teamEmails).map(async (teamEmail) => {
        const success = await sendEmail({ to: teamEmail, subject: emailSubject, html: emailHtml })
        if (!success) {
          console.error(`[Contact API] Email failed for: ${teamEmail}`)
        }
        return { email: teamEmail, success }
      })
    )

    const failedCount = emailResults.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    ).length

    if (failedCount > 0) {
      console.warn(`[Contact API] ${failedCount}/${teamEmails.size} notification emails failed`)
    }

    // Send acknowledgement email to the person who submitted the form
    try {
      const ackHtml = getContactAcknowledgementEmailHtml(firstName.trim())
      await sendEmail({
        to: email.trim().toLowerCase(),
        subject: "We've received your message — JustBeCause Network",
        html: ackHtml,
      })
    } catch (ackErr) {
      console.error("[Contact API] Acknowledgement email failed:", ackErr)
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("[Contact API] Error:", error)
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 })
  }
}
