import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/database"
import { notificationsDb } from "@/lib/database"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/cron/subscription-reminder
 * 
 * Sends reminder notifications and emails to users whose Pro subscription
 * is expiring in 3 days, 1 day, or has just expired.
 * 
 * Protected by CRON_SECRET header for secure invocation.
 * 
 * Query params:
 *   - dryRun=true → logs what would be sent without actually sending
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true"
    const db = await getDb()
    const usersCollection = db.collection("user")

    const now = new Date()
    const results: { userId: string; email: string; role: string; daysLeft: number; status: string }[] = []

    // Find all users with active pro subscriptions that have an expiry date
    const proUsers = await usersCollection.find({
      subscriptionPlan: "pro",
      subscriptionExpiry: { $exists: true, $ne: null },
      role: { $in: ["volunteer", "ngo"] },
    }).toArray()

    for (const user of proUsers) {
      const userId = user.id || user._id?.toString()
      const role = user.role as "volunteer" | "ngo"
      const expiryDate = new Date(user.subscriptionExpiry)
      const msLeft = expiryDate.getTime() - now.getTime()
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

      // Send reminders at 3 days, 1 day before expiry, and on expiry day
      const shouldNotify = daysLeft === 3 || daysLeft === 1 || daysLeft === 0

      if (!shouldNotify) {
        results.push({ userId, email: user.email, role, daysLeft, status: "skipped_not_due" })
        continue
      }

      // Check if we already sent a reminder for this day
      const reminderKey = `subscription_reminder_${daysLeft}`
      if (user[reminderKey] === true) {
        results.push({ userId, email: user.email, role, daysLeft, status: "skipped_already_sent" })
        continue
      }

      // Check email notification preference
      if (user.privacy?.emailNotifications === false) {
        results.push({ userId, email: user.email, role, daysLeft, status: "skipped_opted_out" })
        continue
      }

      if (dryRun) {
        results.push({ userId, email: user.email, role, daysLeft, status: "would_send" })
        continue
      }

      try {
        const recipientName = user.name || "there"
        const expiryDateStr = expiryDate.toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })

        const isExpired = daysLeft <= 0
        const notificationType = isExpired ? "subscription_expired" as const : "subscription_expiring" as const
        const pricingUrl = "/pricing"

        const title = isExpired
          ? "Your Pro Plan Has Expired"
          : `Your Pro Plan Expires in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}`
        const message = isExpired
          ? "Your Pro subscription has expired. Renew now to continue enjoying unlimited access."
          : `Your Pro subscription expires on ${expiryDateStr}. Renew now to avoid losing access.`

        // Create in-app notification
        await notificationsDb.create({
          userId,
          type: notificationType,
          title,
          message,
          link: pricingUrl,
          isRead: false,
          createdAt: new Date(),
        })

        // Send email reminder
        if (user.email) {
          const { sendEmail, getSubscriptionExpiryReminderEmailHtml } = await import("@/lib/email")
          const html = getSubscriptionExpiryReminderEmailHtml(recipientName, daysLeft, expiryDateStr, role)

          await sendEmail({
            to: user.email,
            subject: title,
            html,
            text: `Hi ${recipientName}, ${message} Visit https://justbecausenetwork.com${pricingUrl} to renew.`,
          })
        }

        // Mark reminder as sent for this threshold to avoid duplicates
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { [reminderKey]: true } }
        )

        results.push({ userId, email: user.email, role, daysLeft, status: "sent" })
      } catch (err) {
        console.error(`[subscription-reminder] Failed for ${user.email}:`, err)
        results.push({ userId, email: user.email, role, daysLeft, status: "failed" })
      }
    }

    const sent = results.filter(r => r.status === "sent").length
    const skipped = results.filter(r => r.status.startsWith("skipped")).length

    return NextResponse.json({
      success: true,
      summary: { total: proUsers.length, sent, skipped, dryRun },
      results,
    })
  } catch (error: any) {
    console.error("[subscription-reminder] Cron error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request)
}
