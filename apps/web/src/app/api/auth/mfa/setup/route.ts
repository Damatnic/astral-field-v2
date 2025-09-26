import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { guardianMFA } from '@/lib/security/mfa'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'

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

    // Guardian Security: Generate MFA setup
    const mfaSetup = guardianMFA.generateMFASetup(session.user.email)
    
    // Generate QR code data URL
    const qrCodeDataUrl = await guardianMFA.generateQRCodeDataUrl(mfaSetup.qrCodeUrl)

    // Guardian Security: Log MFA setup initiation
    console.log(`MFA setup initiated for user ${session.user.email}`)

    return NextResponse.json({
      success: true,
      setup: {
        secret: mfaSetup.secret,
        qrCodeUrl: qrCodeDataUrl,
        manualEntryKey: mfaSetup.manualEntryKey,
        backupCodes: mfaSetup.backupCodes,
        appName: 'AstralField',
        issuer: 'AstralField Fantasy Football'
      },
      instructions: {
        step1: 'Install an authenticator app (Google Authenticator, Authy, etc.)',
        step2: 'Scan the QR code or enter the manual key',
        step3: 'Enter the 6-digit code from your authenticator app to verify setup',
        step4: 'Save your backup codes in a secure location'
      }
    })
    
  } catch (error) {
    console.error('MFA setup error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to setup MFA' },
      { status: 500 }
    )
  }
}

const getHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Guardian Security: Require authentication
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // In a real implementation, fetch from database
    // For demo, return setup status
    const mfaStatus = guardianMFA.getMFAStatus({
      secret: undefined, // Would come from database
      backupCodes: [],
      isEnabled: false,
      lastUsedAt: undefined
    })

    return NextResponse.json({
      success: true,
      status: mfaStatus,
      canSetup: !mfaStatus.isEnabled
    })
    
  } catch (error) {
    console.error('MFA status error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to get MFA status' },
      { status: 500 }
    )
  }
}

// Guardian Security: Apply rate limiting
export async function POST(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ ruleKey: 'api:sensitive' })
  return rateLimitMiddleware(request, postHandler)
}

export async function GET(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ ruleKey: 'api:general' })
  return rateLimitMiddleware(request, getHandler)
}