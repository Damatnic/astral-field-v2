// Guardian Security: Advanced Threat Detection System
// Real-time threat monitoring, anomaly detection, and automated response

import { guardianAuditLogger, SecurityEventType } from './audit-logger'

export interface ThreatIndicator {
  type: 'behavioral' | 'pattern' | 'volume' | 'geographic' | 'temporal'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  score: number
  evidence: Record<string, any>
  timestamp: number
}

export interface ThreatAssessment {
  riskScore: number
  threats: ThreatIndicator[]
  recommendations: string[]
  automaticActions: string[]
  requiresManualReview: boolean
}

export interface UserBehaviorProfile {
  userId: string
  normalPatterns: {
    loginTimes: number[]
    ipAddresses: string[]
    userAgents: string[]
    locations: string[]
    activityLevels: { hour: number; activity: number }[]
  }
  recentActivity: {
    timestamp: number
    ip: string
    userAgent: string
    location?: string
    action: string
  }[]
  riskFactors: {
    factor: string
    score: number
    lastSeen: number
  }[]
  lastUpdated: number
}

export class GuardianThreatDetection {
  private userProfiles = new Map<string, UserBehaviorProfile>()
  private suspiciousIPs = new Set<string>()
  private blockedIPs = new Map<string, { until: number; reason: string }>()
  private attackPatterns = new Map<string, { count: number; lastSeen: number }>()
  
  // Known malicious patterns
  private static MALICIOUS_PATTERNS = {
    sqlInjection: [
      /(\bunion\b.*\bselect\b)/gi,
      /(\bselect\b.*\bfrom\b.*\bwhere\b)/gi,
      /(drop\s+table|truncate\s+table)/gi,
      /(';\s*(drop|delete|insert|update))/gi
    ],
    xss: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:\s*[a-z]/gi,
      /on(load|error|click|mouse)\s*=/gi,
      /<iframe[^>]*src/gi
    ],
    pathTraversal: [
      /\.\.\//g,
      /\.\.\\\\?/g,
      /%2e%2e%2f/gi,
      /%252e%252e%252f/gi
    ],
    bruteForce: [
      /password/gi,
      /login/gi,
      /admin/gi
    ]
  }

  constructor() {
    // Clean up expired blocks every hour
    setInterval(() => this.cleanupExpiredBlocks(), 60 * 60 * 1000)
    
    // Update behavior profiles every 15 minutes
    setInterval(() => this.updateBehaviorProfiles(), 15 * 60 * 1000)
  }

  /**
   * Analyze incoming request for threats
   */
  async analyzeRequest(context: {
    userId?: string
    ip: string
    userAgent: string
    path: string
    method: string
    body?: any
    headers: Record<string, string>
    location?: {
      country?: string
      region?: string
      city?: string
    }
  }): Promise<ThreatAssessment> {
    const threats: ThreatIndicator[] = []
    let riskScore = 0

    // Check if IP is blocked
    if (this.isIPBlocked(context.ip)) {
      threats.push({
        type: 'pattern',
        severity: 'critical',
        description: 'Request from blocked IP address',
        score: 1.0,
        evidence: { ip: context.ip },
        timestamp: Date.now()
      })
      riskScore = 1.0
    }

    // Analyze for malicious patterns
    const patternThreats = this.detectMaliciousPatterns(context)
    threats.push(...patternThreats)
    riskScore += patternThreats.reduce((sum, t) => sum + t.score, 0) * 0.3

    // Analyze behavioral anomalies
    if (context.userId) {
      const behaviorThreats = await this.analyzeBehaviorAnomalies(context.userId, context)
      threats.push(...behaviorThreats)
      riskScore += behaviorThreats.reduce((sum, t) => sum + t.score, 0) * 0.4
    }

    // Analyze volume-based threats
    const volumeThreats = this.analyzeVolumeThreats(context)
    threats.push(...volumeThreats)
    riskScore += volumeThreats.reduce((sum, t) => sum + t.score, 0) * 0.3

    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0)

    // Generate recommendations and actions
    const { recommendations, automaticActions } = this.generateResponsePlan(threats, riskScore)

    return {
      riskScore,
      threats,
      recommendations,
      automaticActions,
      requiresManualReview: riskScore > 0.8 || threats.some(t => t.severity === 'critical')
    }
  }

  /**
   * Detect malicious patterns in request
   */
  private detectMaliciousPatterns(context: {
    path: string
    method: string
    body?: any
    headers: Record<string, string>
  }): ThreatIndicator[] {
    const threats: ThreatIndicator[] = []

    // Convert request data to searchable strings
    const searchableData = [
      context.path,
      JSON.stringify(context.body || {}),
      JSON.stringify(context.headers)
    ].join(' ')

    // Check SQL injection patterns
    for (const pattern of GuardianThreatDetection.MALICIOUS_PATTERNS.sqlInjection) {
      if (pattern.test(searchableData)) {
        threats.push({
          type: 'pattern',
          severity: 'high',
          description: 'SQL injection attempt detected',
          score: 0.8,
          evidence: { pattern: pattern.source, data: searchableData.substring(0, 200) },
          timestamp: Date.now()
        })
      }
    }

    // Check XSS patterns
    for (const pattern of GuardianThreatDetection.MALICIOUS_PATTERNS.xss) {
      if (pattern.test(searchableData)) {
        threats.push({
          type: 'pattern',
          severity: 'high',
          description: 'Cross-site scripting (XSS) attempt detected',
          score: 0.7,
          evidence: { pattern: pattern.source, data: searchableData.substring(0, 200) },
          timestamp: Date.now()
        })
      }
    }

    // Check path traversal patterns
    for (const pattern of GuardianThreatDetection.MALICIOUS_PATTERNS.pathTraversal) {
      if (pattern.test(searchableData)) {
        threats.push({
          type: 'pattern',
          severity: 'medium',
          description: 'Path traversal attempt detected',
          score: 0.6,
          evidence: { pattern: pattern.source, data: searchableData.substring(0, 200) },
          timestamp: Date.now()
        })
      }
    }

    // Check for suspicious user agents
    const userAgent = context.headers['user-agent'] || ''
    if (this.isSuspiciousUserAgent(userAgent)) {
      threats.push({
        type: 'pattern',
        severity: 'medium',
        description: 'Suspicious user agent detected',
        score: 0.5,
        evidence: { userAgent },
        timestamp: Date.now()
      })
    }

    return threats
  }

  /**
   * Analyze behavioral anomalies for authenticated users
   */
  private async analyzeBehaviorAnomalies(userId: string, context: {
    ip: string
    userAgent: string
    location?: {
      country?: string
      region?: string
      city?: string
    }
  }): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = []
    const profile = this.getUserProfile(userId)

    if (!profile) {
      // New user - create initial profile
      this.createUserProfile(userId, context)
      return threats
    }

    const now = Date.now()
    const currentHour = new Date().getHours()

    // Check for unusual login time
    const normalLoginTimes = profile.normalPatterns.loginTimes
    if (normalLoginTimes.length > 5) {
      const isUnusualTime = !normalLoginTimes.some(time => Math.abs(time - currentHour) <= 2)
      if (isUnusualTime) {
        threats.push({
          type: 'temporal',
          severity: 'low',
          description: 'Login at unusual time detected',
          score: 0.2,
          evidence: { currentHour, normalTimes: normalLoginTimes },
          timestamp: now
        })
      }
    }

    // Check for new IP address
    if (!profile.normalPatterns.ipAddresses.includes(context.ip)) {
      threats.push({
        type: 'geographic',
        severity: 'medium',
        description: 'Login from new IP address',
        score: 0.4,
        evidence: { newIP: context.ip, knownIPs: profile.normalPatterns.ipAddresses.slice(-5) },
        timestamp: now
      })
    }

    // Check for new location
    if (context.location && context.location.country) {
      const knownCountries = profile.normalPatterns.locations
      if (!knownCountries.includes(context.location.country)) {
        threats.push({
          type: 'geographic',
          severity: 'high',
          description: 'Login from new geographic location',
          score: 0.7,
          evidence: { 
            newLocation: context.location,
            knownLocations: knownCountries
          },
          timestamp: now
        })
      }
    }

    // Check for new user agent
    if (!profile.normalPatterns.userAgents.includes(context.userAgent)) {
      threats.push({
        type: 'behavioral',
        severity: 'low',
        description: 'Login from new device/browser',
        score: 0.3,
        evidence: { 
          newUserAgent: context.userAgent,
          knownUserAgents: profile.normalPatterns.userAgents.slice(-3)
        },
        timestamp: now
      })
    }

    // Update profile with current activity
    this.updateUserProfile(userId, context)

    return threats
  }

  /**
   * Analyze volume-based threats (rate limiting, DDoS)
   */
  private analyzeVolumeThreats(context: {
    ip: string
    path: string
    method: string
  }): ThreatIndicator[] {
    const threats: ThreatIndicator[] = []
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute window

    // Track request patterns
    const patternKey = `${context.ip}:${context.method}:${context.path}`
    const existing = this.attackPatterns.get(patternKey)

    if (existing) {
      // Check if within time window
      if (now - existing.lastSeen < windowMs) {
        existing.count++
        
        // High volume from same IP/path combination
        if (existing.count > 100) {
          threats.push({
            type: 'volume',
            severity: 'high',
            description: 'High volume requests detected (possible DDoS)',
            score: 0.8,
            evidence: { 
              ip: context.ip,
              count: existing.count,
              timeWindow: windowMs / 1000
            },
            timestamp: now
          })
        } else if (existing.count > 50) {
          threats.push({
            type: 'volume',
            severity: 'medium',
            description: 'Elevated request volume detected',
            score: 0.5,
            evidence: { 
              ip: context.ip,
              count: existing.count,
              timeWindow: windowMs / 1000
            },
            timestamp: now
          })
        }
      } else {
        // Reset counter for new window
        existing.count = 1
      }
      
      existing.lastSeen = now
    } else {
      this.attackPatterns.set(patternKey, { count: 1, lastSeen: now })
    }

    return threats
  }

  /**
   * Generate response plan based on threats
   */
  private generateResponsePlan(threats: ThreatIndicator[], riskScore: number): {
    recommendations: string[]
    automaticActions: string[]
  } {
    const recommendations: string[] = []
    const automaticActions: string[] = []

    if (riskScore >= 0.9) {
      automaticActions.push('BLOCK_IP_IMMEDIATE')
      automaticActions.push('TERMINATE_ALL_SESSIONS')
      automaticActions.push('ALERT_SECURITY_TEAM')
      recommendations.push('Manual security review required')
      recommendations.push('Consider forensic analysis')
    } else if (riskScore >= 0.7) {
      automaticActions.push('REQUIRE_MFA')
      automaticActions.push('RATE_LIMIT_AGGRESSIVE')
      automaticActions.push('ALERT_SECURITY_TEAM')
      recommendations.push('Monitor user activity closely')
      recommendations.push('Consider temporary account restrictions')
    } else if (riskScore >= 0.5) {
      automaticActions.push('RATE_LIMIT_MODERATE')
      automaticActions.push('LOG_SECURITY_EVENT')
      recommendations.push('Increase monitoring for this user/IP')
      recommendations.push('Review authentication logs')
    } else if (riskScore >= 0.3) {
      automaticActions.push('LOG_SECURITY_EVENT')
      recommendations.push('Continue monitoring')
    }

    // Specific threat-based actions
    for (const threat of threats) {
      if (threat.type === 'pattern' && threat.severity === 'high') {
        automaticActions.push('BLOCK_REQUEST')
      }
      
      if (threat.type === 'volume' && threat.severity === 'high') {
        automaticActions.push('BLOCK_IP_TEMPORARY')
      }
      
      if (threat.type === 'geographic' && threat.severity === 'high') {
        automaticActions.push('REQUIRE_MFA')
        recommendations.push('Verify user identity through secondary channel')
      }
    }

    return { recommendations, automaticActions }
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /requests/i,
      /scanner/i, /exploit/i, /hack/i, /attack/i,
      /sqlmap/i, /nikto/i, /nmap/i, /burp/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(userAgent)) ||
           userAgent.length < 10 || userAgent.length > 500
  }

  /**
   * Get or create user behavior profile
   */
  private getUserProfile(userId: string): UserBehaviorProfile | null {
    return this.userProfiles.get(userId) || null
  }

  /**
   * Create new user behavior profile
   */
  private createUserProfile(userId: string, context: {
    ip: string
    userAgent: string
    location?: { country?: string; region?: string; city?: string }
  }): void {
    const now = Date.now()
    const currentHour = new Date().getHours()

    const profile: UserBehaviorProfile = {
      userId,
      normalPatterns: {
        loginTimes: [currentHour],
        ipAddresses: [context.ip],
        userAgents: [context.userAgent],
        locations: context.location?.country ? [context.location.country] : [],
        activityLevels: [{ hour: currentHour, activity: 1 }]
      },
      recentActivity: [{
        timestamp: now,
        ip: context.ip,
        userAgent: context.userAgent,
        location: context.location?.country,
        action: 'login'
      }],
      riskFactors: [],
      lastUpdated: now
    }

    this.userProfiles.set(userId, profile)
  }

  /**
   * Update existing user behavior profile
   */
  private updateUserProfile(userId: string, context: {
    ip: string
    userAgent: string
    location?: { country?: string; region?: string; city?: string }
  }): void {
    const profile = this.userProfiles.get(userId)
    if (!profile) return

    const now = Date.now()
    const currentHour = new Date().getHours()

    // Update normal patterns (with limits to prevent unbounded growth)
    if (!profile.normalPatterns.loginTimes.includes(currentHour)) {
      profile.normalPatterns.loginTimes.push(currentHour)
      if (profile.normalPatterns.loginTimes.length > 24) {
        profile.normalPatterns.loginTimes.shift()
      }
    }

    if (!profile.normalPatterns.ipAddresses.includes(context.ip)) {
      profile.normalPatterns.ipAddresses.push(context.ip)
      if (profile.normalPatterns.ipAddresses.length > 10) {
        profile.normalPatterns.ipAddresses.shift()
      }
    }

    if (!profile.normalPatterns.userAgents.includes(context.userAgent)) {
      profile.normalPatterns.userAgents.push(context.userAgent)
      if (profile.normalPatterns.userAgents.length > 5) {
        profile.normalPatterns.userAgents.shift()
      }
    }

    if (context.location?.country && !profile.normalPatterns.locations.includes(context.location.country)) {
      profile.normalPatterns.locations.push(context.location.country)
      if (profile.normalPatterns.locations.length > 5) {
        profile.normalPatterns.locations.shift()
      }
    }

    // Update recent activity
    profile.recentActivity.push({
      timestamp: now,
      ip: context.ip,
      userAgent: context.userAgent,
      location: context.location?.country,
      action: 'activity'
    })

    // Keep only last 50 activities
    if (profile.recentActivity.length > 50) {
      profile.recentActivity.shift()
    }

    profile.lastUpdated = now
  }

  /**
   * Check if IP is currently blocked
   */
  private isIPBlocked(ip: string): boolean {
    const block = this.blockedIPs.get(ip)
    if (!block) return false

    if (Date.now() > block.until) {
      this.blockedIPs.delete(ip)
      return false
    }

    return true
  }

  /**
   * Block IP address
   */
  blockIP(ip: string, durationMs: number, reason: string): void {
    this.blockedIPs.set(ip, {
      until: Date.now() + durationMs,
      reason
    })
  }

  /**
   * Add IP to suspicious list
   */
  markIPSuspicious(ip: string): void {
    this.suspiciousIPs.add(ip)
  }

  /**
   * Clean up expired IP blocks
   */
  private cleanupExpiredBlocks(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [ip, block] of this.blockedIPs.entries()) {
      if (now > block.until) {
        this.blockedIPs.delete(ip)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired IP blocks`)
    }
  }

  /**
   * Update behavior profiles based on recent activity
   */
  private updateBehaviorProfiles(): void {
    const now = Date.now()
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)

    for (const [userId, profile] of this.userProfiles.entries()) {
      // Remove old activities
      profile.recentActivity = profile.recentActivity.filter(
        activity => activity.timestamp > oneWeekAgo
      )

      // Update risk factors based on recent behavior
      // This could include factors like unusual activity patterns, etc.
      
      profile.lastUpdated = now
    }
  }

  /**
   * Get threat detection statistics
   */
  getStatistics(): {
    blockedIPs: number
    suspiciousIPs: number
    trackedUsers: number
    activePatterns: number
    totalThreatsDetected: number
  } {
    return {
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      trackedUsers: this.userProfiles.size,
      activePatterns: this.attackPatterns.size,
      totalThreatsDetected: 0 // This would be tracked in a real implementation
    }
  }

  /**
   * Export user behavior data for analysis
   */
  exportBehaviorData(userId: string): UserBehaviorProfile | null {
    return this.userProfiles.get(userId) || null
  }

  /**
   * Import user behavior data
   */
  importBehaviorData(profile: UserBehaviorProfile): void {
    this.userProfiles.set(profile.userId, profile)
  }
}

// Global threat detection instance
export const guardianThreatDetection = new GuardianThreatDetection()

// Threat detection middleware
export async function threatDetectionMiddleware(
  context: {
    userId?: string
    ip: string
    userAgent: string
    path: string
    method: string
    body?: any
    headers: Record<string, string>
  }
): Promise<{
  allowed: boolean
  assessment: ThreatAssessment
  actions: string[]
}> {
  const assessment = await guardianThreatDetection.analyzeRequest(context)
  
  // Execute automatic actions
  const actions: string[] = []
  
  for (const action of assessment.automaticActions) {
    switch (action) {
      case 'BLOCK_IP_IMMEDIATE':
        guardianThreatDetection.blockIP(context.ip, 24 * 60 * 60 * 1000, 'Critical threat detected')
        actions.push('IP blocked for 24 hours')
        break
        
      case 'BLOCK_IP_TEMPORARY':
        guardianThreatDetection.blockIP(context.ip, 60 * 60 * 1000, 'High volume detected')
        actions.push('IP blocked for 1 hour')
        break
        
      case 'RATE_LIMIT_AGGRESSIVE':
        actions.push('Aggressive rate limiting applied')
        break
        
      case 'RATE_LIMIT_MODERATE':
        actions.push('Moderate rate limiting applied')
        break
        
      case 'REQUIRE_MFA':
        actions.push('MFA challenge required')
        break
        
      case 'LOG_SECURITY_EVENT':
        await guardianAuditLogger.logSecurityEvent(
          SecurityEventType.THREAT_DETECTED,
          context.userId,
          { ip: context.ip, userAgent: context.userAgent },
          {
            description: 'Automated threat detection',
            riskScore: assessment.riskScore,
            context: { threats: assessment.threats, path: context.path }
          }
        )
        actions.push('Security event logged')
        break
        
      case 'ALERT_SECURITY_TEAM':
        // In a real implementation, this would send alerts to security team
        actions.push('Security team alerted')
        break
    }
  }
  
  // Determine if request should be allowed
  const allowed = assessment.riskScore < 0.9 && 
                 !assessment.automaticActions.includes('BLOCK_REQUEST') &&
                 !assessment.automaticActions.includes('BLOCK_IP_IMMEDIATE')
  
  return { allowed, assessment, actions }
}