import { NextResponse } from 'next/server'
import { sendEmail, getWelcomeEmailHtml } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { email, name, role } = await req.json()
    if (!email || !name || !role) {
      return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 })
    }

    const html = getWelcomeEmailHtml(name, role)
    const ok = await sendEmail({ to: email, subject: 'Welcome to JustBecause.asia', html, text: `Welcome ${name}` })
    return NextResponse.json({ success: ok })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 })
  }
}
