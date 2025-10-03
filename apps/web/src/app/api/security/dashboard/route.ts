import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { guardianAuditLogger } from '@/lib/security/audit-logger'
import { guardianSessionManager } from '@/lib/security/session-manager'
import { guardianAccountProtection } from '@/lib/security/account-protection'
import { guardianPrivacyProtection } from '@/lib/security/privacy-protection'
import { rateLimiter } from '@/lib/security/rate-limiter'
import { guardianSecurityHeaders } from '@/lib/security/security-headers'
import { withRateLimit } from '@/lib/security/rate-limit-middleware'

// Guardian Security: Force Node.js runtime
export const runtime = 'nodejs'

interface SecurityDashboard {
  overview: {
    securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    overallScore: number
    maxScore: number
    lastUpdated: string
    status: 'SECURE' | 'WARNING' | 'CRITICAL'
  }
  authentication: {
    activeSessions: number
    averageRiskScore: number
    highRiskSessions: number
    mfaAdoptionRate: number
    lockedAccounts: number
  }
  threats: {
    eventsToday: number
    incidentsOpen: number
    averageRiskScore: number
    topThreatCategories: Array<{ category: string; count: number }>
    severityDistribution: Record<string, number>
  }
  compliance: {
    gdprCompliance: number
    dataRetentionCompliance: number
    privacyRequestsOpen: number
    consentRate: number
  }
  infrastructure: {
    rateLimitingEffectiveness: number
    securityHeadersScore: number
    cspViolations: number
    certificateStatus: 'valid' | 'expiring' | 'expired'
  }
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    category: string
    title: string
    description: string
    impact: string
    effort: 'LOW' | 'MEDIUM' | 'HIGH'
  }>
}

const dashboardHandler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Guardian Security: Require authentication and admin role
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin role (for demo, we'll allow all authenticated users)
    // In production, implement proper RBAC
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'FORBIDDEN', message: 'Admin access required' },
    //     { status: 403 }
    //   )
    // }

    // Gather security metrics from all systems
    const auditMetrics = guardianAuditLogger.getSecurityMetrics()
    const sessionStats = guardianSessionManager.getSessionStats()
    const accountStatuses = guardianAccountProtection.getAccountStatuses()
    const lockedAccounts = guardianAccountProtection.getLockedAccounts()
    const rateLimitMetrics = rateLimiter.getMetrics()
    const securityHeadersAssessment = guardianSecurityHeaders.getSecurityScore()
    
    // Calculate MFA adoption rate (placeholder - would come from user database)
    const totalUsers = accountStatuses.length || 1
    const mfaUsers = 0 // Placeholder - count users with MFA enabled
    const mfaAdoptionRate = Math.round((mfaUsers / totalUsers) * 100)

    // Calculate GDPR compliance metrics
    const gdprCompliance = calculateGDPRCompliance()
    const privacyRequests = guardianPrivacyProtection.getPrivacyRequests()
    const openPrivacyRequests = privacyRequests.filter(r => r.status !== 'completed').length

    // Calculate overall security score
    const overallScore = calculateOverallSecurityScore({
      auditMetrics,
      sessionStats,
      securityHeaders: securityHeadersAssessment.score,
      mfaAdoption: mfaAdoptionRate,
      gdprCompliance: gdprCompliance.score
    })

    // Determine security level
    const securityLevel = determineSecurityLevel(overallScore.score)
    const status = determineSecurityStatus(overallScore.score, auditMetrics.incidentsToday)

    // Generate recommendations
    const recommendations = generateSecurityRecommendations({
      overallScore,
      auditMetrics,
      sessionStats,
      mfaAdoptionRate,
      lockedAccounts: lockedAccounts.length,
      securityHeaders: securityHeadersAssessment
    })

    const dashboard: SecurityDashboard = {
      overview: {
        securityLevel,
        overallScore: overallScore.score,
        maxScore: overallScore.maxScore,
        lastUpdated: new Date().toISOString(),
        status
      },
      authentication: {
        activeSessions: sessionStats.activeSessions,
        averageRiskScore: Math.round(sessionStats.averageRiskScore * 100) / 100,
        highRiskSessions: sessionStats.highRiskSessions,
        mfaAdoptionRate,
        lockedAccounts: lockedAccounts.length
      },
      threats: {
        eventsToday: auditMetrics.eventsToday,
        incidentsOpen: auditMetrics.incidentsToday,
        averageRiskScore: Math.round(auditMetrics.averageRiskScore * 100) / 100,
        topThreatCategories: auditMetrics.topThreatCategories,
        severityDistribution: auditMetrics.severityDistribution
      },
      compliance: {
        gdprCompliance: gdprCompliance.score,
        dataRetentionCompliance: gdprCompliance.dataRetention,
        privacyRequestsOpen: openPrivacyRequests,
        consentRate: gdprCompliance.consentRate
      },
      infrastructure: {
        rateLimitingEffectiveness: calculateRateLimitingEffectiveness(rateLimitMetrics),
        securityHeadersScore: securityHeadersAssessment.score,
        cspViolations: 0, // Would track from CSP reports
        certificateStatus: 'valid' // Would check actual certificate
      },
      recommendations
    }

    return NextResponse.json(dashboard)
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {

      console.error('Security dashboard error:', error);

    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to generate security dashboard' },
      { status: 500 }
    )
  }
}

/**
 * Calculate GDPR compliance score
 */
function calculateGDPRCompliance(): {
  score: number
  dataRetention: number
  consentRate: number
} {
  // In production, these would be calculated from actual data
  return {
    score: 85, // Overall GDPR compliance percentage
    dataRetention: 90, // Data retention policy compliance
    consentRate: 78 // User consent rate
  }
}

/**
 * Calculate overall security score
 */
function calculateOverallSecurityScore(metrics: {
  auditMetrics: any
  sessionStats: any
  securityHeaders: number
  mfaAdoption: number
  gdprCompliance: number
}): { score: number; maxScore: number } {
  let score = 0
  const maxScore = 100

  // Security headers (25 points)
  score += (metrics.securityHeaders / 100) * 25

  // Session security (20 points)
  const sessionSecurityScore = Math.max(0, 20 - (metrics.sessionStats.averageRiskScore * 20))
  score += sessionSecurityScore

  // MFA adoption (20 points)
  score += (metrics.mfaAdoption / 100) * 20

  // Threat management (20 points)
  const threatScore = metrics.auditMetrics.incidentsToday === 0 ? 20 : Math.max(0, 20 - metrics.auditMetrics.incidentsToday * 5)
  score += threatScore

  // GDPR compliance (15 points)
  score += (metrics.gdprCompliance / 100) * 15

  return {
    score: Math.round(score),
    maxScore
  }
}

/**
 * Determine security level based on score
 */
function determineSecurityLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 90) return 'CRITICAL' // Excellent security
  if (score >= 75) return 'HIGH'
  if (score >= 60) return 'MEDIUM'
  return 'LOW'
}

/**
 * Determine security status
 */
function determineSecurityStatus(score: number, incidentsToday: number): 'SECURE' | 'WARNING' | 'CRITICAL' {
  if (incidentsToday > 0) return 'CRITICAL'
  if (score < 70) return 'WARNING'
  return 'SECURE'
}

/**
 * Calculate rate limiting effectiveness
 */
function calculateRateLimitingEffectiveness(metrics: any): number {
  if (metrics.totalRequests === 0) return 100
  
  const blockRate = (metrics.blockedRequests / metrics.totalRequests) * 100
  // Good rate limiting should block suspicious traffic but not legitimate users
  // Sweet spot is around 5-15% block rate
  if (blockRate >= 5 && blockRate <= 15) return 100
  if (blockRate < 5) return Math.max(50, 100 - (5 - blockRate) * 10)
  return Math.max(0, 100 - (blockRate - 15) * 5)
}

/**
 * Generate security recommendations
 */
function generateSecurityRecommendations(data: any): SecurityDashboard['recommendations'] {
  const recommendations: SecurityDashboard['recommendations'] = []

  // MFA recommendations
  if (data.mfaAdoptionRate < 50) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Authentication',
      title: 'Increase MFA Adoption',
      description: `Only ${data.mfaAdoptionRate}% of users have MFA enabled. Consider implementing mandatory MFA or incentives.`,
      impact: 'Significantly reduces account takeover risk',
      effort: 'MEDIUM'
    })
  }

  // Security headers recommendations
  if (data.securityHeaders.score < 90) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Infrastructure',
      title: 'Improve Security Headers',
      description: `Security headers score is ${data.securityHeaders.score}/100. ${data.securityHeaders.recommendations.join(', ')}.`,
      impact: 'Prevents various client-side attacks',
      effort: 'LOW'
    })
  }

  // Account lockout recommendations
  if (data.lockedAccounts > 5) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Authentication',
      title: 'Review Account Lockouts',
      description: `${data.lockedAccounts} accounts are currently locked. Review for potential brute force attacks.`,
      impact: 'Ensures legitimate users can access accounts',
      effort: 'LOW'
    })
  }

  // Session security recommendations
  if (data.sessionStats.averageRiskScore > 0.5) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Sessions',
      title: 'High Risk Sessions Detected',
      description: `Average session risk score is ${data.sessionStats.averageRiskScore.toFixed(2)}. Review anomaly detection rules.`,
      impact: 'Prevents unauthorized access',
      effort: 'MEDIUM'
    })
  }

  // Threat monitoring recommendations
  if (data.auditMetrics.incidentsToday > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Threat Detection',
      title: 'Active Security Incidents',
      description: `${data.auditMetrics.incidentsToday} security incidents detected today. Immediate investigation required.`,
      impact: 'Prevents potential data breaches',
      effort: 'HIGH'
    })
  }

  return recommendations.slice(0, 10) // Limit to top 10 recommendations
}

// Guardian Security: Apply rate limiting to dashboard endpoint
export async function GET(request: NextRequest) {
  const rateLimitMiddleware = withRateLimit({ ruleKey: 'api:sensitive' })
  return rateLimitMiddleware(request, dashboardHandler)
}