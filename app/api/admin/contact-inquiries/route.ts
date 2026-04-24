import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { contactInquiriesDb } from "@/lib/database"
import client from "@/lib/db"

const DB_NAME = "justbecause"

// GET - Get all contact inquiries
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      console.warn("[Admin Contact Inquiries] GET: no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin: accept either role=admin OR entry in admins collection
    await client.connect()
    const db = client.db(DB_NAME)
    const isRoleAdmin = (session.user as any)?.role === "admin"
    const admin = isRoleAdmin
      ? { email: session.user.email }
      : await db.collection("admins").findOne({ email: session.user.email })
    if (!admin) {
      console.warn(`[Admin Contact Inquiries] GET: ${session.user.email} not admin (role=${(session.user as any)?.role})`)
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const statusFilter = req.nextUrl.searchParams.get("status") || undefined
    const [inquiries, stats] = await Promise.all([
      contactInquiriesDb.findAll(statusFilter ? { status: statusFilter } : undefined),
      contactInquiriesDb.getStats(),
    ])

    console.log(`[Admin Contact Inquiries] GET: returning ${inquiries.length} inquiries (total in DB: ${stats.total})`)
    return NextResponse.json({ inquiries, stats })
  } catch (error) {
    console.error("[Admin Contact Inquiries] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 })
  }
}

// PATCH - Update inquiry status
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await client.connect()
    const db = client.db(DB_NAME)
    const isRoleAdmin = (session.user as any)?.role === "admin"
    const admin = isRoleAdmin
      ? { email: session.user.email }
      : await db.collection("admins").findOne({ email: session.user.email })
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { id, status, adminNotes } = await req.json()
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 })
    }

    const validStatuses = ["new", "in-progress", "resolved", "closed"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const updated = await contactInquiriesDb.updateStatus(
      id,
      status,
      adminNotes,
      session.user.name || session.user.email || "admin"
    )

    if (!updated) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Admin Contact Inquiries] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 })
  }
}
