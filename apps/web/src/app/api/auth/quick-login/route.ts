import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'

// Guardian Security: Force Node.js runtime for secure operations
export const runtime = 'nodejs'

// Guardian Security: Demo account credentials (server-side only)
const DEMO_ACCOUNTS = {
  'nicholas@damato-dynasty.com': 'Dynasty2025!',
  'nick@damato-dynasty.com': 'Dynasty2025!',
  'jack@damato-dynasty.com': 'Dynasty2025!',
  'larry@damato-dynasty.com': 'Dynasty2025!',
  'renee@damato-dynasty.com': 'Dynasty2025!',
  'jon@damato-dynasty.com': 'Dynasty2025!',
  'david@damato-dynasty.com': 'Dynasty2025!',
  'kaity@damato-dynasty.com': 'Dynasty2025!',
  'cason@damato-dynasty.com': 'Dynasty2025!',
  'brittany@damato-dynasty.com': 'Dynasty2025!'
} as const

// Guardian Security: Enhanced POST handler with rate limiting
const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const { email } = await request.json()
    
    // Guardian Security: Input validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Email is required' },
        { status: 400 }
      )
    }
    
    const normalizedEmail = email.toLowerCase().trim()
    
    // Guardian Security: Check if email is a valid demo account
    if (!(normalizedEmail in DEMO_ACCOUNTS)) {
      // Timing attack prevention - delay response
      await new Promise(resolve => setTimeout(resolve, 100))
      return NextResponse.json(
        { error: 'INVALID_ACCOUNT', message: 'Account not found in demo league' },
        { status: 404 }
      )
    }
    
    // Guardian Security: Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        teamName: true,
        role: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found in database' },
        { status: 404 }
      )
    }
    
    // Guardian Security: Generate secure session token for quick login
    const sessionToken = crypto.randomUUID()
    
    // Guardian Security: Log security event
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIP = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'
    
    console.log(`Quick login attempt for ${normalizedEmail} from IP ${clientIP}`)
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teamName: user.teamName,
        role: user.role
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

// Guardian Security: Apply rate limiting to POST requests
export async function POST(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ ruleKey: 'auth:quick-login' })
  return rateLimitMiddleware(request, postHandler)
}

// Guardian Security: Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests allowed' },
    { status: 405 }
  )
}