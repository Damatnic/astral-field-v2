import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'

// Guardian Security: Force Node.js runtime
export const runtime = 'nodejs'

// Guardian Security: Demo credentials (server-side only)
const DEMO_PASSWORD = 'Dynasty2025!'

const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const { email, sessionToken } = await request.json()
    
    // Guardian Security: Input validation
    if (!email || !sessionToken) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Email and session token required' },
        { status: 400 }
      )
    }
    
    // Guardian Security: Return credentials for demo quick login
    // This is still more secure than client-side exposure
    return NextResponse.json({
      success: true,
      credentials: {
        email: email.toLowerCase().trim(),
        password: DEMO_PASSWORD
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Quick login verification error:', error);

    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Verification failed' },
      { status: 500 }
    )
  }
}

// Guardian Security: Apply rate limiting to POST requests
export async function POST(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ ruleKey: 'auth:quick-login' })
  return rateLimitMiddleware(request, postHandler)
}

export async function GET() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests allowed' },
    { status: 405 }
  )
}