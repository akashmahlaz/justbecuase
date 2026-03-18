import { NextRequest, NextResponse } from "next/server"
import { contactInquiriesDb, teamMembersDb } from "@/lib/database"
import { sendEmail, getContactInquiryEmailHtml } from "@/lib/email"

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

    // Send email notifications to team
    const teamEmails = new Set<string>()
    teamEmails.add("admin@justbecausenetwork.com")
    try {
      const teamMembers = await teamMembersDb.findActive()
      for (const m of teamMembers) {
        if (m.email) teamEmails.add(m.email)
      }
    } catch {
      // Continue even if team fetch fails — we still have the fallback email
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

    // Send to all team members in parallel
    await Promise.allSettled(
      Array.from(teamEmails).map((teamEmail) =>
        sendEmail({ to: teamEmail, subject: emailSubject, html: emailHtml })
      )
    )

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("[Contact API] Error:", error)
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 })
  }
}
