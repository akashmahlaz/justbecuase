import { NextResponse } from 'next/server'
import client from '@/lib/db'

// Test endpoint to check users in database
// DELETE THIS FILE AFTER TESTING
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  
  try {
    await client.connect()
    const db = client.db('justbecause')
    
    if (email) {
      // Search for specific user
      const user = await db.collection('user').findOne({ email })
      const account = await db.collection('account').findOne({ userId: user?._id?.toString() })
      return NextResponse.json({ 
        found: !!user,
        user: user ? { id: user._id, email: user.email, name: user.name, role: user.role } : null,
        hasCredentialAccount: account?.providerId === 'credential',
        accountProvider: account?.providerId
      })
    }
    
    // List all users
    const users = await db.collection('user').find({}).limit(20).toArray()
    return NextResponse.json({ 
      count: users.length,
      users: users.map(u => ({ 
        id: u._id, 
        email: u.email, 
        name: u.name,
        role: u.role 
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
