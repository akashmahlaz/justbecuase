import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/database"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    const db = await getDb()
    const subscribersCollection = db.collection("newsletter_subscribers")

    // Check if already subscribed
    const existing = await subscribersCollection.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ message: "Already subscribed" })
    }

    // Save subscriber
    await subscribersCollection.insertOne({
      email: email.toLowerCase(),
      subscribedAt: new Date(),
      isActive: true,
    })

    // Send welcome email
    await sendEmail({
      to: email,
      subject: "Welcome to JustBeCause Network Newsletter!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">JustBeCause Network</h1>
            <p style="color: #666; margin-top: 5px;">Skills-Based Impact Platform</p>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0;">Welcome to our newsletter! 🎉</h2>
            <p>Thank you for subscribing to the JustBeCause Network newsletter.</p>
            <p>You'll receive updates about:</p>
            <ul>
              <li>New impact opportunities</li>
              <li>Impact stories from our community</li>
              <li>Tips for skill-based impact work</li>
              <li>NGO spotlights</li>
            </ul>
            <p>Stay tuned for inspiring stories and opportunities to make a difference!</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} JustBeCause Network. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: "Welcome to JustBeCause Network newsletter! You'll receive updates about new impact opportunities, impact stories, and more.",
    })

    return NextResponse.json({ success: true, message: "Subscribed successfully" })
  } catch (error: any) {
    console.error("Newsletter subscription error:", error)
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 })
  }
}
