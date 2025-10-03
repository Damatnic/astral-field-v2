import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { guardianMFA } from '@/lib/security/mfa'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'

export const dynamic = 'force-dynamic'


// Guardian Security: Force Node.js runtime
export const runtime = 'nodejs'

const postHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Guardian Security: Require authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { code, secret, purpose = 'verify' } = await request.json()

    // Guardian Security: Input validation
    if (!code || !secret) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Code and secret are required' },
        { status: 400 }
      )
    }

    // Extract context for risk assessment
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIP = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'
    
    const context = {
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      location: request.headers.get('cf-ipcountry') || request.headers.get('x-country') || undefined,
      deviceFingerprint: request.headers.get('x-device-fingerprint') || undefined
    }

    // For demo purposes, create mock user MFA data
    const userMFAData = {
      secret,
      backupCodes: [], // Would come from database
      lastUsedAt: undefined,
      totalAttempts: 0,
      failedAttempts: 0
    }

    // Guardian Security: Verify MFA code
    const verification = await guardianMFA.verifyMFA(code, userMFAData, context)

    if (!verification.isValid) {
      // Guardian Security: Log failed MFA attempt
      if (process.env.NODE_ENV === 'development') {

        console.warn(`Failed MFA verification for ${session.user.email}`, {
        ip: clientIP,
        riskScore: verification.riskScore,
        purpose
      });

      }
      return NextResponse.json(
        { 
          error: 'INVALID_CODE', 
          message: 'Invalid verification code',
          riskScore: verification.riskScore > 0.7 ? 'HIGH' : 'MEDIUM'
        },
        { status: 400 }
      )
    }

    // Guardian Security: Log successful MFA verification
    console.log(`Successful MFA verification for ${session.user.email}`, {
      method: verification.method,
      riskScore: verification.riskScore,
      purpose
    })

    const response: any = {
      success: true,
      method: verification.method,
      riskScore: verification.riskScore,
      message: 'MFA verification successful'
    }

    // Add backup code information if applicable
    if (verification.method === 'backup' && verification.remainingBackupCodes !== undefined) {
      response.remainingBackupCodes = verification.remainingBackupCodes
      if (verification.remainingBackupCodes <= 2) {
        response.warning = 'Running low on backup codes. Generate new ones soon.'
      }
    }

    return NextResponse.json(response)
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('MFA verification error:', error);

    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'MFA verification failed' },
      { status: 500 }
    )
  }
}

// Guardian Security: Apply strict rate limiting for MFA verification
export async function POST(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ 
    ruleKey: 'auth:login', // Use strict auth rate limiting
    onRateLimit: (req, result) => {
      console.warn('MFA verification rate limited', {
        ip: req.headers.get('x-forwarded-for') || req.ip,
        riskScore: result.riskScore
      })
    }
  })
  return rateLimitMiddleware(request, postHandler)
}