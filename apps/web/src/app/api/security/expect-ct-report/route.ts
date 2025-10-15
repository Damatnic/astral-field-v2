import { NextRequest, NextResponse } from 'next/server'
import { guardianAuditLogger, SecurityEventType, SeverityLevel } from '@/lib/security/audit-logger'

export const dynamic = 'force-dynamic'

// Guardian Security: Force Node.js runtime
export const runtime = 'nodejs'

interface ExpectCTReport {
  'date-time': string
  hostname: string
  port: number
  'effective-expiration-date': string
  'served-certificate-chain': string[]
  'validated-certificate-chain': string[]
  'scts': Array<{
    version: number
    'log-id': string
    timestamp: number
    'hash-algorithm': string
    'signature-algorithm': string
    'signature-data': string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const report: ExpectCTReport = await request.json()
    
    if (!report.hostname) {
      return NextResponse.json(
        { error: 'INVALID_REPORT', message: 'No Expect-CT report found' },
        { status: 400 }
      )
    }

    // Extract client information
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIP = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'
    
    // Log as security event - Expect-CT violations are always serious
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.SECURITY_ALERT,
      undefined, // No user context for CT violations
      {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      {
        description: `Certificate Transparency violation for ${report.hostname}`,
        riskScore: 0.8, // CT violations are serious
        context: {
          hostname: report.hostname,
          port: report.port,
          effectiveExpirationDate: report['effective-expiration-date'],
          dateTime: report['date-time'],
          sctCount: report.scts?.length || 0
        },
        metadata: {
          servedCertificateChain: report['served-certificate-chain']?.length || 0,
          validatedCertificateChain: report['validated-certificate-chain']?.length || 0,
          scts: report.scts
        }
      }
    )

    // Log for monitoring and alerting
    console.error('Expect-CT Violation Detected', {
      hostname: report.hostname,
      port: report.port,
      effectiveExpirationDate: report['effective-expiration-date'],
      clientIP,
      userAgent: request.headers.get('user-agent'),
      severity: 'HIGH'
    })

    // In production, this should trigger immediate alerts
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Certificate Transparency violation in production!', {
        hostname: report.hostname,
        timestamp: report['date-time'],
        requiresImmediateAttention: true
      })
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Expect-CT report processing error:', error)
    }
    return NextResponse.json(
      { error: 'PROCESSING_ERROR', message: 'Failed to process Expect-CT report' },
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
