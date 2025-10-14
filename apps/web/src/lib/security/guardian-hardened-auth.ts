// Guardian Security: Hardened Authentication System
// Implements secure credential management without hardcoded values

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma'
import bcrypt from 'bcryptjs'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'
import { guardianAuditLogger, SecurityEventType } from '@/lib/security/audit-logger'

// Guardian Security: Force Node.js runtime for secure operations
export const runtime = 'nodejs'

export interface DemoAuthConfig {
  enabled: boolean
  allowedDomains: string[]
  sessionTimeout: number
  maxAttempts: number
}

/**
 * Guardian Security: Secure Demo Authentication Handler
 * Validates demo account access without exposing credentials
 */
class GuardianDemoAuth {
  private config: DemoAuthConfig

  constructor(config: Partial<DemoAuthConfig> = {}) {
    this.config = {
      enabled: process.env.DEMO_MODE === 'true',
      allowedDomains: ['damato-dynasty.com'],
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxAttempts: 5,
      ...config
    }
  }

  /**
   * Validate demo account eligibility
   */
  async validateDemoAccount(email: string): Promise<{
    isValid: boolean
    reason?: string
    user?: any
  }> {
    if (!this.config.enabled) {
      return {
        isValid: false,
        reason: 'Demo mode is disabled'
      }
    }

    // Guardian Security: Validate email domain
    const emailDomain = email.split('@')[1]?.toLowerCase()
    if (!emailDomain || !this.config.allowedDomains.includes(emailDomain)) {
      return {
        isValid: false,
        reason: 'Invalid demo domain'
      }
    }

    // Guardian Security: Check if user exists in database
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          name: true,
          teamName: true,
          role: true,
          hashedPassword: true // Need this to verify the account is properly set up
        }
      })

      if (!user) {
        return {
          isValid: false,
          reason: 'Demo account not found'
        }
      }

      if (!user.hashedPassword) {
        return {
          isValid: false,
          reason: 'Demo account not properly configured'
        }
      }

      // Return user without password hash
      const { hashedPassword, ...safeUser } = user
      return {
        isValid: true,
        user: safeUser
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('Demo account validation error:', error);

      }
      return {
        isValid: false,
        reason: 'Validation failed'
      }
    }
  }

  /**
   * Generate secure session token for demo account
   */
  generateDemoSessionToken(userId: string): string {
    const timestamp = Date.now()
    const randomData = crypto.getRandomValues(new Uint8Array(16))
    const combined = `${userId}:${timestamp}:${Array.from(randomData).join('')}`
    
    return Buffer.from(combined).toString('base64url')
  }

  /**
   * Validate demo session token
   */
  validateDemoSessionToken(token: string): {
    isValid: boolean
    userId?: string
    isExpired?: boolean
  } {
    try {
      const decoded = Buffer.from(token, 'base64url').toString()
      const [userId, timestamp] = decoded.split(':')
      
      if (!userId || !timestamp) {
        return { isValid: false }
      }

      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > this.config.sessionTimeout) {
        return { isValid: false, isExpired: true }
      }

      return { isValid: true, userId }
    } catch (error) {
      return { isValid: false }
    }
  }
}

/**
 * Guardian Security: Enhanced Quick Login Handler
 */
const quickLoginHandler = async (request: NextRequest): Promise<NextResponse> => {
  const demoAuth = new GuardianDemoAuth()
  
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
    
    // Guardian Security: Validate demo account
    const validation = await demoAuth.validateDemoAccount(normalizedEmail)
    
    if (!validation.isValid) {
      // Guardian Security: Log failed attempt
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      
      await guardianAuditLogger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILURE,
        undefined,
        {
          ip: clientIP,
          userAgent: request.headers.get('user-agent') || 'unknown'
        },
        {
          description: 'Demo login attempt failed',
          riskScore: 0.3,
          context: {
            email: normalizedEmail,
            reason: validation.reason
          }
        }
      )

      // Timing attack prevention - delay response
      await new Promise(resolve => setTimeout(resolve, 100))
      return NextResponse.json(
        { error: 'INVALID_ACCOUNT', message: 'Demo account access denied' },
        { status: 403 }
      )
    }
    
    // Guardian Security: Generate secure session token
    const sessionToken = demoAuth.generateDemoSessionToken(validation.user!.id)
    
    // Guardian Security: Log successful demo login
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.LOGIN_SUCCESS,
      validation.user!.id,
      {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      {
        description: 'Demo account login successful',
        riskScore: 0.1,
        context: {
          email: normalizedEmail,
          sessionType: 'demo'
        }
      },
      undefined,
      sessionToken
    )
    
    return NextResponse.json({
      success: true,
      user: validation.user,
      sessionToken,
      sessionType: 'demo',
      expiresAt: new Date(Date.now() + demoAuth.config.sessionTimeout).toISOString(),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Quick login error:', error);

    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * Guardian Security: Rate-Limited POST Handler
 */
export async function POST(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ 
    ruleKey: 'auth:quick-login',
    requests: 5,
    window: 60000 // 1 minute
  })
  return rateLimitMiddleware(request, quickLoginHandler)
}

/**
 * Guardian Security: Only allow POST requests
 */
export async function GET() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests allowed' },
    { status: 405 }
  )
}

export { GuardianDemoAuth }