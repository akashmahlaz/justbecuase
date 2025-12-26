import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/database"
import { sendEmail } from "@/lib/email"

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    const db = await getDb()
    const otpCollection = db.collection("email_otps")

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

    // Delete any existing OTPs for this email
    await otpCollection.deleteMany({ email: email.toLowerCase() })

    // Store new OTP
    await otpCollection.insertOne({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    })

    // Send OTP email
    await sendEmail({
      to: email,
      subject: "Verify your email - JustBecause.asia",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">JustBecause.asia</h1>
            <p style="color: #666; margin-top: 5px;">Skills-Based Volunteering Platform</p>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; text-align: center;">
            <h2 style="margin-top: 0;">Verify your email</h2>
            <p>Hi${name ? ` ${name}` : ''},</p>
            <p>Use this code to verify your email address:</p>
            
            <div style="background: #ffffff; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 25px auto; max-width: 200px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${otp}</span>
            </div>
            
            <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} JustBecause.asia. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Your JustBecause.asia verification code is: ${otp}. This code expires in 10 minutes.`,
    })

    return NextResponse.json({ 
      success: true, 
      message: "OTP sent successfully",
      expiresAt: expiresAt.toISOString()
    })
  } catch (error: any) {
    console.error("Send OTP error:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}
