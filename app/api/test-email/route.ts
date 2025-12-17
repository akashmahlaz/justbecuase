import { NextResponse } from 'next/server'
import { passwordResetDb } from '@/lib/database'

// Test endpoint to debug Resend email sending
// DELETE THIS FILE AFTER TESTING
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const testEmail = searchParams.get('email')
  const action = searchParams.get('action')
  
  // Check stored reset codes
  if (action === 'check-codes') {
    try {
      const code = searchParams.get('code') || ''
      const email = searchParams.get('email') || ''
      if (email && code) {
        const record = await passwordResetDb.findValid(email, code)
        return NextResponse.json({ 
          found: !!record,
          record: record ? { email: record.email, code: record.code, resetUrl: record.resetUrl?.substring(0, 100) + '...', expiresAt: record.expiresAt } : null
        })
      }
      return NextResponse.json({ error: 'Provide email and code params' })
    } catch (e: any) {
      return NextResponse.json({ error: e.message })
    }
  }
  
  if (!testEmail) {
    return NextResponse.json({ 
      error: 'Add ?email=your@email.com to test, or ?action=check-codes&email=X&code=Y to check stored codes',
      envCheck: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.slice(0, 10)}...` : 'NOT SET',
        FROM_EMAIL: process.env.FROM_EMAIL || 'NOT SET (will use default)',
      }
    })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_AKASH
  const FROM_EMAIL = process.env.FROM_EMAIL || "JustBecause <onboarding@resend.dev>"

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'No RESEND_API_KEY configured' }, { status: 500 })
  }

  try {
    console.log(`[Test Email] Sending test to ${testEmail}`)
    console.log(`[Test Email] FROM: ${FROM_EMAIL}`)
    console.log(`[Test Email] API Key: ${RESEND_API_KEY.slice(0, 10)}...`)
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: testEmail,
        subject: "Test Email from JustBecause",
        html: "<h1>Test Email</h1><p>If you receive this, email is working!</p>",
        text: "Test email - If you receive this, email is working!",
      }),
    })

    const responseData = await response.json()
    
    if (!response.ok) {
      console.error(`[Test Email] Failed (${response.status}):`, responseData)
      return NextResponse.json({ 
        success: false, 
        status: response.status,
        error: responseData,
        debug: {
          fromEmail: FROM_EMAIL,
          toEmail: testEmail,
          apiKeyPrefix: RESEND_API_KEY.slice(0, 10) + '...',
        }
      }, { status: response.status })
    }

    console.log(`[Test Email] Success:`, responseData)
    return NextResponse.json({ 
      success: true, 
      data: responseData,
      debug: {
        fromEmail: FROM_EMAIL,
        toEmail: testEmail,
      }
    })
  } catch (error: any) {
    console.error('[Test Email] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
