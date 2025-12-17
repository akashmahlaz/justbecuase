import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Test endpoint to debug password reset flow
// DELETE THIS FILE AFTER TESTING
export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log(`[Test Reset] Testing password reset for ${email}`)
    
    // Call the auth API directly to trigger password reset
    const result = await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: '/auth/reset-password'
      },
      headers: new Headers()
    })
    
    console.log(`[Test Reset] Result:`, result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Check server logs for [Reset] messages',
      result
    })
  } catch (error: any) {
    console.error('[Test Reset] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
