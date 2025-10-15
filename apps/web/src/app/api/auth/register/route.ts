import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/database/prisma'
import { z } from 'zod'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'
import { guardianAuditLogger, SecurityEventType } from '@/lib/security/audit-logger'

export const dynamic = 'force-dynamic'


const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  teamName: z.string().max(100).optional()
})

// Guardian Security: Registration handler with security logging
const registrationHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const body = await request.json()
    const validatedData = RegisterSchema.parse(body)

    // Guardian Security: Extract client information for logging
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email
      }
    })

    if (existingUser) {
      // Guardian Security: Log failed registration attempt
      await guardianAuditLogger.logSecurityEvent(
        SecurityEventType.REGISTRATION_FAILED,
        undefined,
        { ip: clientIP, userAgent },
        {
          description: 'Registration failed - email already exists',
          riskScore: 0.2,
          context: { email: validatedData.email, reason: 'duplicate_email' }
        }
      )

      return NextResponse.json(
        { message: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        hashedPassword,
        teamName: validatedData.teamName || null,
        role: 'PLAYER',
        preferences: {
          create: {
            emailNotifications: true,
            theme: 'dark'
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        teamName: true,
        role: true
      }
    })

    // Guardian Security: Log successful registration
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.REGISTRATION_SUCCESS,
      user.id,
      { ip: clientIP, userAgent },
      {
        description: 'User registration successful',
        riskScore: 0.1,
        context: { 
          email: validatedData.email,
          name: validatedData.name,
          hasTeamName: !!validatedData.teamName
        }
      }
    )

    return NextResponse.json({
      message: 'User created successfully',
      user
    })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Registration error:', error);
    }
    // Guardian Security: Log registration error
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.REGISTRATION_FAILED,
      undefined,
      { ip: clientIP, userAgent: request.headers.get('user-agent') || 'unknown' },
      {
        description: 'Registration failed - server error',
        riskScore: 0.3,
        context: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    )
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Guardian Security: Apply rate limiting to registration endpoint
export async function POST(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ 
    ruleKey: 'auth:register'
  })
  return rateLimitMiddleware(request, registrationHandler)
}