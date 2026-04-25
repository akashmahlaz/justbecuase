import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/database"

const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/cron/profile-nudge
 * 
 * Sends onboarding reminder emails every 24 hours to users who signed up
 * but have not completed onboarding yet.
 * 
 * Protected by CRON_SECRET header for secure invocation from
 * external cron services (e.g., Vercel Cron, GitHub Actions).
 * 
 * Query params:
 *   - dryRun=true  → logs what would be sent without actually sending
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true"
    const db = await getDb()
    const usersCollection = db.collection("user")

    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Users are due once they are at least 24h old and either never
    // received an onboarding reminder or received the last one >=24h ago.
    const dueUsers = await usersCollection.find({
      createdAt: { $lte: twentyFourHoursAgo },
      role: { $in: ["volunteer", "ngo"] },
      isOnboarded: { $ne: true },
      email: { $exists: true, $ne: "" },
      $or: [
        { onboardingReminderLastSentAt: { $exists: false } },
        { onboardingReminderLastSentAt: { $lte: twentyFourHoursAgo } },
      ],
    }).limit(200).toArray()

    const results: { userId: string; email: string; role: string; status: string }[] = []

    for (const user of dueUsers) {
      const role = user.role as "volunteer" | "ngo"
      
      // All profile data is now stored in the unified "user" collection
      // Check directly on the user document whether they completed onboarding
      const userId = user.id || user._id?.toString()
      
      // Check profile completeness directly from the user document
      const isComplete = user.isOnboarded === true || (role === "volunteer"
        ? !!(user.name && (() => {
            // Skills may be a JSON string or array
            const skills = typeof user.skills === "string" 
              ? (() => { try { return JSON.parse(user.skills) } catch { return [] } })() 
              : user.skills
            return Array.isArray(skills) && skills.length > 0
          })())
        : !!(user.organizationName && (() => {
            const causes = typeof user.causes === "string"
              ? (() => { try { return JSON.parse(user.causes) } catch { return [] } })()
              : user.causes
            return Array.isArray(causes) && causes.length > 0
          })()))

      if (isComplete) {
        results.push({ userId, email: user.email, role, status: "skipped_complete" })
        continue
      }

      // Check email notification preference
      const prefs = user.privacy
      if (prefs?.emailNotifications === false) {
        results.push({ userId, email: user.email, role, status: "skipped_opted_out" })
        continue
      }

      if (!user.email) {
        results.push({ userId, email: "none", role, status: "skipped_no_email" })
        continue
      }

      const onboardingUrl = role === "volunteer" ? "/volunteer/onboarding" : "/ngo/onboarding"
      const recipientName = user.name || "there"

      if (dryRun) {
        results.push({ userId, email: user.email, role, status: "would_send" })
      } else {
        try {
          const { sendEmail, getProfileNudgeEmailHtml } = await import("@/lib/email")
          const html = getProfileNudgeEmailHtml(recipientName, role, onboardingUrl)
          
          await sendEmail({
            to: user.email,
            subject: "You have not completed onboarding on JustBeCause Network",
            html,
            text: `Hi ${recipientName}, you have not completed onboarding on JustBeCause Network. Visit https://justbecausenetwork.com${onboardingUrl} to complete your profile and start using your account.`,
          })

          // Mark only this 24h send window. They will be due again tomorrow
          // if onboarding is still incomplete.
          await usersCollection.updateOne(
            { _id: user._id },
            {
              $set: { onboardingReminderLastSentAt: now },
              $inc: { onboardingReminderCount: 1 },
            }
          )

          results.push({ userId, email: user.email, role, status: "sent" })
        } catch (emailErr) {
          console.error(`[profile-nudge] Failed to send to ${user.email}:`, emailErr)
          results.push({ userId, email: user.email, role, status: "failed" })
        }
      }
    }

    const sent = results.filter(r => r.status === "sent").length
    const skipped = results.filter(r => r.status.startsWith("skipped")).length

    return NextResponse.json({
      success: true,
      summary: { total: dueUsers.length, sent, skipped, dryRun },
      results,
    })
  } catch (error: any) {
    console.error("[profile-nudge] Cron error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}

// Also support GET for Vercel Cron.
export async function GET(request: NextRequest) {
  return POST(request)
}
