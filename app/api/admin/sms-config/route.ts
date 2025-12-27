import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getDb } from "@/lib/database"
import { revalidatePath } from "next/cache"

// Helper to check if user is admin
async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized")
  }
  
  return session.user
}

// GET - Get current SMS configuration status (without exposing secrets)
export async function GET() {
  try {
    await requireAdmin()
    
    const db = await getDb()
    const configCollection = db.collection("system_config")
    
    const config = await configCollection.findOne({ type: "sms" })
    
    // Check what providers are configured via environment variables
    const envConfig = {
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
      msg91Configured: !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_SENDER_ID),
      textlocalConfigured: !!(process.env.TEXTLOCAL_API_KEY),
      currentProvider: process.env.SMS_PROVIDER || "none",
    }
    
    // Merge with database config (database overrides env)
    const dbConfig = config?.data || {}
    
    return NextResponse.json({
      provider: dbConfig.provider || envConfig.currentProvider,
      twilioConfigured: dbConfig.twilioConfigured || envConfig.twilioConfigured,
      msg91Configured: dbConfig.msg91Configured || envConfig.msg91Configured,
      textlocalConfigured: dbConfig.textlocalConfigured || envConfig.textlocalConfigured,
      // Return masked versions if configured in DB
      twilioAccountSid: dbConfig.twilioAccountSid ? maskSecret(dbConfig.twilioAccountSid) : null,
      twilioPhoneNumber: dbConfig.twilioPhoneNumber || null,
      msg91SenderId: dbConfig.msg91SenderId || null,
      textlocalSender: dbConfig.textlocalSender || null,
    })
  } catch (error: any) {
    console.error("Get SMS config error:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to get configuration" }, { status: 500 })
  }
}

// POST - Save SMS configuration
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const { 
      provider,
      // Twilio
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      // MSG91
      msg91AuthKey,
      msg91SenderId,
      msg91TemplateId,
      // TextLocal
      textlocalApiKey,
      textlocalSender,
    } = body
    
    const db = await getDb()
    const configCollection = db.collection("system_config")
    
    // Build the config object
    const configData: any = {
      provider: provider || "none",
      updatedAt: new Date(),
    }
    
    // Only save non-empty values, and encrypt/hash sensitive data in production
    if (provider === "twilio") {
      if (twilioAccountSid && !twilioAccountSid.includes("***")) {
        configData.twilioAccountSid = twilioAccountSid
      }
      if (twilioAuthToken && !twilioAuthToken.includes("***")) {
        configData.twilioAuthToken = twilioAuthToken
      }
      if (twilioPhoneNumber) {
        configData.twilioPhoneNumber = twilioPhoneNumber
      }
      configData.twilioConfigured = !!(twilioAccountSid || twilioAuthToken)
    } else if (provider === "msg91") {
      if (msg91AuthKey && !msg91AuthKey.includes("***")) {
        configData.msg91AuthKey = msg91AuthKey
      }
      if (msg91SenderId) {
        configData.msg91SenderId = msg91SenderId
      }
      if (msg91TemplateId) {
        configData.msg91TemplateId = msg91TemplateId
      }
      configData.msg91Configured = !!(msg91AuthKey)
    } else if (provider === "textlocal") {
      if (textlocalApiKey && !textlocalApiKey.includes("***")) {
        configData.textlocalApiKey = textlocalApiKey
      }
      if (textlocalSender) {
        configData.textlocalSender = textlocalSender
      }
      configData.textlocalConfigured = !!(textlocalApiKey)
    }
    
    // Upsert the configuration
    await configCollection.updateOne(
      { type: "sms" },
      { 
        $set: { 
          type: "sms",
          data: configData 
        } 
      },
      { upsert: true }
    )
    
    revalidatePath("/admin/settings")
    
    return NextResponse.json({ 
      success: true, 
      message: "SMS configuration saved successfully" 
    })
  } catch (error: any) {
    console.error("Save SMS config error:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 })
  }
}

// POST test SMS
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const { phone } = body
    
    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 })
    }
    
    // Try to send a test SMS using the configured provider
    const db = await getDb()
    const configCollection = db.collection("system_config")
    const config = await configCollection.findOne({ type: "sms" })
    
    const provider = config?.data?.provider || process.env.SMS_PROVIDER || "none"
    
    if (provider === "none") {
      return NextResponse.json({ 
        success: false, 
        error: "No SMS provider configured. Please configure a provider first." 
      }, { status: 400 })
    }
    
    // Format phone number
    let formattedPhone = phone.replace(/[^\d+]/g, "")
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.startsWith("0")) {
        formattedPhone = formattedPhone.substring(1)
      }
      if (formattedPhone.length === 10) {
        formattedPhone = "+91" + formattedPhone
      }
    }
    
    const testCode = "123456"
    const testMessage = `Test SMS from JustBecause.asia. If you received this, your SMS configuration is working! Test code: ${testCode}`
    
    try {
      if (provider === "twilio") {
        const accountSid = config?.data?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID
        const authToken = config?.data?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN
        const fromNumber = config?.data?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER
        
        if (!accountSid || !authToken || !fromNumber) {
          return NextResponse.json({ 
            success: false, 
            error: "Twilio credentials not fully configured" 
          }, { status: 400 })
        }
        
        const twilio = require("twilio")
        const client = twilio(accountSid, authToken)
        
        await client.messages.create({
          body: testMessage,
          from: fromNumber,
          to: formattedPhone
        })
      } else if (provider === "msg91") {
        const authKey = config?.data?.msg91AuthKey || process.env.MSG91_AUTH_KEY
        const senderId = config?.data?.msg91SenderId || process.env.MSG91_SENDER_ID
        
        if (!authKey || !senderId) {
          return NextResponse.json({ 
            success: false, 
            error: "MSG91 credentials not fully configured" 
          }, { status: 400 })
        }
        
        const response = await fetch("https://api.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: {
            "authkey": authKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sender: senderId,
            otp: testCode,
            mobile: formattedPhone.replace("+", ""),
          })
        })
        
        if (!response.ok) {
          throw new Error("MSG91 API error")
        }
      } else if (provider === "textlocal") {
        const apiKey = config?.data?.textlocalApiKey || process.env.TEXTLOCAL_API_KEY
        const sender = config?.data?.textlocalSender || process.env.TEXTLOCAL_SENDER || "VERIFY"
        
        if (!apiKey) {
          return NextResponse.json({ 
            success: false, 
            error: "TextLocal API key not configured" 
          }, { status: 400 })
        }
        
        const params = new URLSearchParams({
          apikey: apiKey,
          numbers: formattedPhone.replace("+", ""),
          message: testMessage,
          sender: sender
        })
        
        const response = await fetch(`https://api.textlocal.in/send/?${params.toString()}`)
        if (!response.ok) {
          throw new Error("TextLocal API error")
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Test SMS sent successfully to ${formattedPhone}` 
      })
    } catch (smsError: any) {
      console.error("Test SMS error:", smsError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to send test SMS: ${smsError.message}` 
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Test SMS config error:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to test configuration" }, { status: 500 })
  }
}

// Helper to mask secrets
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return "***"
  return secret.substring(0, 4) + "***" + secret.substring(secret.length - 4)
}
