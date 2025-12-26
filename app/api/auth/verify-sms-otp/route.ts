import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/database"

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "")
  
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1)
    }
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned
    }
  }
  
  return cleaned
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, otp } = body

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone and OTP required" }, { status: 400 })
    }

    const formattedPhone = formatPhoneNumber(phone)
    
    const db = await getDb()
    const smsOtpCollection = db.collection("sms_otps")

    // Find the OTP record
    const otpRecord = await smsOtpCollection.findOne({ 
      phone: formattedPhone 
    })

    if (!otpRecord) {
      return NextResponse.json({ 
        success: false, 
        error: "No verification code found. Please request a new one." 
      }, { status: 400 })
    }

    // Check if expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await smsOtpCollection.deleteOne({ phone: formattedPhone })
      return NextResponse.json({ 
        success: false, 
        error: "Verification code expired. Please request a new one." 
      }, { status: 400 })
    }

    // Check attempts (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      await smsOtpCollection.deleteOne({ phone: formattedPhone })
      return NextResponse.json({ 
        success: false, 
        error: "Too many attempts. Please request a new code." 
      }, { status: 400 })
    }

    // Verify OTP
    if (otpRecord.otp !== otp.toString()) {
      // Increment attempts
      await smsOtpCollection.updateOne(
        { phone: formattedPhone },
        { $inc: { attempts: 1 } }
      )
      return NextResponse.json({ 
        success: false, 
        error: "Invalid verification code. Please try again.",
        attemptsRemaining: 5 - otpRecord.attempts - 1
      }, { status: 400 })
    }

    // OTP verified - delete it
    await smsOtpCollection.deleteOne({ phone: formattedPhone })

    // Mark phone as verified in a separate collection (for tracking)
    const verifiedPhonesCollection = db.collection("verified_phones")
    await verifiedPhonesCollection.updateOne(
      { phone: formattedPhone },
      { 
        $set: { 
          phone: formattedPhone,
          verifiedAt: new Date() 
        }
      },
      { upsert: true }
    )

    return NextResponse.json({ 
      success: true, 
      message: "Phone number verified successfully" 
    })
  } catch (error: any) {
    console.error("Verify SMS OTP error:", error)
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 })
  }
}
