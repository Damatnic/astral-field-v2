import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Demo account credentials (server-side only)
const DEMO_ACCOUNTS = {
  'nicholas@damato-dynasty.com': { name: "Nicholas D'Amato", team: "D'Amato Dynasty", role: 'Commissioner' },
  'nick@damato-dynasty.com': { name: "Nick Hartley", team: "Hartley's Heroes", role: 'Player' },
  'jack@damato-dynasty.com': { name: "Jack McCaigue", team: "McCaigue Mayhem", role: 'Player' },
  'larry@damato-dynasty.com': { name: "Larry McCaigue", team: "Larry Legends", role: 'Player' },
  'renee@damato-dynasty.com': { name: "Renee McCaigue", team: "Renee's Reign", role: 'Player' },
  'jon@damato-dynasty.com': { name: "Jon Kornbeck", team: "Kornbeck Crushers", role: 'Player' },
  'david@damato-dynasty.com': { name: "David Jarvey", team: "Jarvey's Juggernauts", role: 'Player' },
  'kaity@damato-dynasty.com': { name: "Kaity Lorbecki", team: "Lorbecki Lions", role: 'Player' },
  'cason@damato-dynasty.com': { name: "Cason Minor", team: "Minor Miracles", role: 'Player' },
  'brittany@damato-dynasty.com': { name: "Brittany Bergum", team: "Bergum Blitz", role: 'Player' }
} as const

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    // Input validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Email is required' },
        { status: 400 }
      )
    }
    
    const normalizedEmail = email.toLowerCase().trim() as keyof typeof DEMO_ACCOUNTS
    
    // Check if email is a valid demo account
    if (!(normalizedEmail in DEMO_ACCOUNTS)) {
      // Timing attack prevention - delay response
      await new Promise(resolve => setTimeout(resolve, 100))
      return NextResponse.json(
        { error: 'INVALID_ACCOUNT', message: 'Account not found in demo league' },
        { status: 404 }
      )
    }
    
    const account = DEMO_ACCOUNTS[normalizedEmail]
    
    // Generate secure session token for quick login
    const sessionToken = crypto.randomUUID()
    
    return NextResponse.json({
      success: true,
      user: {
        id: normalizedEmail,
        email: normalizedEmail,
        name: account.name,
        teamName: account.team,
        role: account.role
      },
      sessionToken,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Quick login error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Quick login failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests allowed' },
    { status: 405 }
  )
}
