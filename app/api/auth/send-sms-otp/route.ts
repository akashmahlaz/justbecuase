import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/database"

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "")
  
  // If doesn't start with +, assume Indian number and add +91
  if (!cleaned.startsWith("+")) {
    // Remove leading 0 if present
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1)
    }
    // If 10 digits, assume Indian number
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned
    }
  }
  
  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 })
    }

    const formattedPhone = formatPhoneNumber(phone)
    
    // Basic validation
    if (formattedPhone.length < 10) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    const db = await getDb()
    const smsOtpCollection = db.collection("sms_otps")

    // Check rate limiting (max 5 OTPs per phone per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentOtps = await smsOtpCollection.countDocuments({
      phone: formattedPhone,
      createdAt: { $gte: oneHourAgo }
    })

    if (recentOtps >= 5) {
      return NextResponse.json({ 
        error: "Too many verification attempts. Please try again later." 
      }, { status: 429 })
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

    // Delete any existing OTPs for this phone
    await smsOtpCollection.deleteMany({ phone: formattedPhone })

    // Store new OTP
    await smsOtpCollection.insertOne({
      phone: formattedPhone,
      otp,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    })

    // Send SMS via configured provider
    // Check database config first, then environment variables
    const configCollection = db.collection("system_config")
    const smsConfig = await configCollection.findOne({ type: "sms" })
    const dbConfig = smsConfig?.data || {}
    
    const smsProvider = dbConfig.provider || process.env.SMS_PROVIDER || "none"
    
    if (smsProvider === "twilio") {
      const accountSid = dbConfig.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID
      const authToken = dbConfig.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN
      const fromNumber = dbConfig.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER
      
      if (accountSid && authToken && fromNumber) {
        // Send via Twilio
        const twilio = require("twilio")
        const client = twilio(accountSid, authToken)
        
        await client.messages.create({
          body: `Your JustBecause.asia verification code is: ${otp}. Valid for 10 minutes.`,
          from: fromNumber,
          to: formattedPhone
        })
      } else {
        console.warn("Twilio selected but not fully configured")
      }
    } else if (smsProvider === "msg91") {
      const authKey = dbConfig.msg91AuthKey || process.env.MSG91_AUTH_KEY
      const senderId = dbConfig.msg91SenderId || process.env.MSG91_SENDER_ID
      const templateId = dbConfig.msg91TemplateId || process.env.MSG91_TEMPLATE_ID
      
      if (authKey && senderId) {
        // Send via MSG91 (popular in India)
        const response = await fetch("https://api.msg91.com/api/v5/otp", {
          method: "POST",
          headers: {
            "authkey": authKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            template_id: templateId,
            mobile: formattedPhone.replace("+", ""),
            otp: otp,
            sender: senderId
          })
        })
        
        if (!response.ok) {
          console.error("MSG91 error:", await response.text())
          throw new Error("Failed to send SMS")
        }
      } else {
        console.warn("MSG91 selected but not fully configured")
      }
    } else if (smsProvider === "textlocal") {
      const apiKey = dbConfig.textlocalApiKey || process.env.TEXTLOCAL_API_KEY
      const sender = dbConfig.textlocalSender || process.env.TEXTLOCAL_SENDER || "VERIFY"
      
      if (apiKey) {
        // Send via TextLocal
        const params = new URLSearchParams({
          apikey: apiKey,
          numbers: formattedPhone.replace("+", ""),
          message: `Your JustBecause.asia verification code is: ${otp}. Valid for 10 minutes.`,
          sender: sender
        })
        
        const response = await fetch(`https://api.textlocal.in/send/?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to send SMS")
        }
      } else {
        console.warn("TextLocal selected but not fully configured")
      }
    } else {
      // No SMS provider configured - for development, log the OTP
      console.log(`[DEV MODE] SMS OTP for ${formattedPhone}: ${otp}`)
      
      // In development, return the OTP in response (REMOVE IN PRODUCTION)
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ 
          success: true, 
          message: "OTP sent successfully (dev mode)",
          expiresAt: expiresAt.toISOString(),
          // REMOVE THIS IN PRODUCTION - only for testing
          devOtp: otp
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "OTP sent successfully",
      expiresAt: expiresAt.toISOString()
    })
  } catch (error: any) {
    console.error("Send SMS OTP error:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}
