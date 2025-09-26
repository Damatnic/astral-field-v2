import { NextRequest, NextResponse } from 'next/server'
import { guardianAuditLogger, SecurityEventType, SeverityLevel } from '@/lib/security/audit-logger'

// Guardian Security: Force Node.js runtime
export const runtime = 'nodejs'

interface CSPReport {
  'document-uri': string
  referrer: string
  'violated-directive': string
  'effective-directive': string
  'original-policy': string
  disposition: string
  'blocked-uri': string
  'line-number'?: number
  'column-number'?: number
  'source-file'?: string
  'status-code': number
  'script-sample'?: string
}

interface CSPReportBody {
  'csp-report': CSPReport
}

export async function POST(request: NextRequest) {
  try {
    const body: CSPReportBody = await request.json()
    const report = body['csp-report']
    
    if (!report) {
      return NextResponse.json(
        { error: 'INVALID_REPORT', message: 'No CSP report found' },
        { status: 400 }
      )
    }

    // Extract client information
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIP = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'
    
    // Determine severity based on violation type
    const severity = determineSeverity(report)
    
    // Check if this is a legitimate violation or false positive
    const isLegitimateViolation = await analyzeCspViolation(report)
    
    if (isLegitimateViolation) {
      // Log as security event
      await guardianAuditLogger.logSecurityEvent(
        SecurityEventType.SECURITY_ALERT,
        undefined, // No user context for CSP violations
        {
          ip: clientIP,
          userAgent: request.headers.get('user-agent') || 'unknown'
        },
        {
          description: `CSP violation: ${report['violated-directive']}`,
          riskScore: calculateRiskScore(report),
          context: {
            violatedDirective: report['violated-directive'],
            blockedUri: report['blocked-uri'],
            documentUri: report['document-uri'],
            sourceFile: report['source-file'],
            lineNumber: report['line-number'],
            columnNumber: report['column-number'],
            scriptSample: report['script-sample']
          },
          metadata: {
            effectiveDirective: report['effective-directive'],
            disposition: report.disposition,
            statusCode: report['status-code'],
            originalPolicy: report['original-policy']
          }
        }
      )

      // Log for monitoring and alerting
      console.warn('CSP Violation Detected', {
        directive: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        documentUri: report['document-uri'],
        clientIP,
        severity: severity.toString(),
        userAgent: request.headers.get('user-agent')
      })
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('CSP report processing error:', error)
    return NextResponse.json(
      { error: 'PROCESSING_ERROR', message: 'Failed to process CSP report' },
      { status: 500 }
    )
  }
}

/**
 * Determine severity of CSP violation
 */
function determineSeverity(report: CSPReport): SeverityLevel {
  const violatedDirective = report['violated-directive'].toLowerCase()
  const blockedUri = report['blocked-uri'].toLowerCase()

  // Critical: Script injection attempts
  if (violatedDirective.includes('script-src')) {
    if (blockedUri.includes('data:') || 
        blockedUri.includes('javascript:') ||
        blockedUri.includes('vbscript:')) {
      return SeverityLevel.CRITICAL
    }
    if (blockedUri.includes('eval') || report['script-sample']) {
      return SeverityLevel.HIGH
    }
    return SeverityLevel.MEDIUM
  }

  // High: Frame injection or object embedding
  if (violatedDirective.includes('frame-src') || 
      violatedDirective.includes('object-src')) {
    return SeverityLevel.HIGH
  }

  // Medium: Style injection or connect violations
  if (violatedDirective.includes('style-src') || 
      violatedDirective.includes('connect-src')) {
    return SeverityLevel.MEDIUM
  }

  // Low: Other violations (img, font, etc.)
  return SeverityLevel.LOW
}

/**
 * Calculate risk score for CSP violation
 */
function calculateRiskScore(report: CSPReport): number {
  let riskScore = 0.3 // Base risk for any CSP violation

  const violatedDirective = report['violated-directive'].toLowerCase()
  const blockedUri = report['blocked-uri'].toLowerCase()

  // High risk patterns
  if (blockedUri.includes('data:text/html') || 
      blockedUri.includes('javascript:') ||
      blockedUri.includes('vbscript:')) {
    riskScore += 0.5
  }

  // Script violations are inherently risky
  if (violatedDirective.includes('script-src')) {
    riskScore += 0.3
  }

  // Inline violations suggest XSS attempts
  if (blockedUri.includes('inline') || report['script-sample']) {
    riskScore += 0.2
  }

  // External domains from suspicious TLDs
  const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.onion']
  if (suspiciousTlds.some(tld => blockedUri.includes(tld))) {
    riskScore += 0.3
  }

  return Math.min(riskScore, 1.0)
}

/**
 * Analyze if CSP violation is legitimate security concern
 */
async function analyzeCspViolation(report: CSPReport): Promise<boolean> {
  const blockedUri = report['blocked-uri'].toLowerCase()
  const documentUri = report['document-uri'].toLowerCase()

  // Filter out common false positives
  const commonFalsePositives = [
    'chrome-extension:',
    'moz-extension:',
    'safari-extension:',
    'edge-extension:',
    'about:blank',
    'resource:',
    'x-apple-data-detectors:',
    'chrome-search:',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://connect.facebook.net',
    'https://platform.twitter.com'
  ]

  // Skip browser extensions and known tracking scripts
  if (commonFalsePositives.some(pattern => blockedUri.includes(pattern))) {
    return false
  }

  // Skip violations from development tools
  if (process.env.NODE_ENV !== 'production') {
    const devPatterns = [
      'webpack:',
      'localhost:',
      'hot-update',
      '__nextjs',
      '_next/static'
    ]
    
    if (devPatterns.some(pattern => 
        blockedUri.includes(pattern) || documentUri.includes(pattern))) {
      return false
    }
  }

  // Skip empty or self violations that are often false positives
  if (!blockedUri || blockedUri === 'self' || blockedUri === documentUri) {
    return false
  }

  return true
}

export async function GET() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'Only POST requests allowed' },
    { status: 405 }
  )
}