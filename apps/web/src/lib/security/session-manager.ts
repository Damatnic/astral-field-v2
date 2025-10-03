// Guardian Security: Advanced Session Management System
// Implements adaptive timeouts, session fingerprinting, and anomaly detection

import { createHash, randomBytes } from 'crypto'

export interface SessionContext {
  userId: string
  email: string
  ip: string
  userAgent: string
  deviceFingerprint?: string
  location?: {
    country?: string
    region?: string
    city?: string
  }
  timestamp: number
}

export interface SessionSecurity {
  riskScore: number
  isDeviceKnown: boolean
  isLocationKnown: boolean
  anomalies: string[]
  recommendedTimeout: number
  requiresMFA: boolean
}

export interface ActiveSession {
  id: string
  userId: string
  context: SessionContext
  security: SessionSecurity
  createdAt: number
  lastActivity: number
  expiresAt: number
  isActive: boolean
  activityCount: number
  dataTransferred: number
}

export interface SessionConfig {
  baseTimeout: number // Base session timeout in milliseconds
  maxTimeout: number // Maximum session timeout
  minTimeout: number // Minimum session timeout
  inactivityThreshold: number // Inactivity threshold for adaptive timeout
  maxSessions: number // Maximum concurrent sessions per user
  enableAdaptiveTimeout: boolean
  enableAnomalyDetection: boolean
}

export class GuardianSessionManager {
  private sessions = new Map<string, ActiveSession>()
  private userSessions = new Map<string, Set<string>>()
  private deviceFingerprints = new Map<string, Set<string>>() // userId -> fingerprints
  private locationHistory = new Map<string, Array<{location: any, timestamp: number}>>()
  private config: SessionConfig

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      baseTimeout: 30 * 60 * 1000, // 30 minutes
      maxTimeout: 8 * 60 * 60 * 1000, // 8 hours
      minTimeout: 15 * 60 * 1000, // 15 minutes
      inactivityThreshold: 5 * 60 * 1000, // 5 minutes
      maxSessions: 5,
      enableAdaptiveTimeout: true,
      enableAnomalyDetection: true,
      ...config
    }

    // Cleanup expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000)
  }

  /**
   * Create a new session with security analysis
   */
  async createSession(context: SessionContext): Promise<{
    sessionId: string
    security: SessionSecurity
    expiresAt: number
  }> {
    const sessionId = this.generateSessionId()
    const security = await this.analyzeSessionSecurity(context)
    
    // Calculate adaptive timeout based on security assessment
    const timeout = this.calculateAdaptiveTimeout(security)
    
    const session: ActiveSession = {
      id: sessionId,
      userId: context.userId,
      context,
      security,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + timeout,
      isActive: true,
      activityCount: 0,
      dataTransferred: 0
    }

    // Enforce session limits
    await this.enforceSessionLimits(context.userId)
    
    // Store session
    this.sessions.set(sessionId, session)
    
    // Track user sessions
    if (!this.userSessions.has(context.userId)) {
      this.userSessions.set(context.userId, new Set())
    }
    this.userSessions.get(context.userId)!.add(sessionId)

    // Update device and location tracking
    this.updateDeviceTracking(context.userId, context.deviceFingerprint)
    this.updateLocationHistory(context.userId, context.location)

    // Log session creation
    console.log(`Session created for user ${context.userId}`, {
      sessionId: sessionId.substring(0, 8) + '...',
      riskScore: security.riskScore,
      timeout: timeout / 1000,
      anomalies: security.anomalies
    })

    return {
      sessionId,
      security,
      expiresAt: session.expiresAt
    }
  }

  /**
   * Validate and refresh session
   */
  async validateSession(sessionId: string, context: Partial<SessionContext>): Promise<{
    isValid: boolean
    session?: ActiveSession
    security?: SessionSecurity
    newExpiresAt?: number
    actions?: string[]
  }> {
    const session = this.sessions.get(sessionId)
    
    if (!session || !session.isActive) {
      return { isValid: false }
    }

    const now = Date.now()
    
    // Check if session expired
    if (now > session.expiresAt) {
      session.isActive = false
      return { isValid: false }
    }

    // Update activity
    session.lastActivity = now
    session.activityCount++

    // Re-analyze security if context provided
    let updatedSecurity = session.security
    const actions: string[] = []

    if (context.ip || context.userAgent || context.location) {
      const newContext = { ...session.context, ...context, timestamp: now }
      updatedSecurity = await this.analyzeSessionSecurity(newContext)
      session.context = newContext
      session.security = updatedSecurity

      // Check for significant security changes
      if (updatedSecurity.riskScore > session.security.riskScore + 0.3) {
        actions.push('REQUIRE_MFA')
        if (process.env.NODE_ENV === 'development') {

          console.warn(`Elevated risk detected for session ${sessionId}`, {
          oldRisk: session.security.riskScore,
          newRisk: updatedSecurity.riskScore,
          anomalies: updatedSecurity.anomalies
        });

        }
      }
    }

    // Adaptive timeout extension
    let newExpiresAt = session.expiresAt
    if (this.config.enableAdaptiveTimeout) {
      const newTimeout = this.calculateAdaptiveTimeout(updatedSecurity)
      newExpiresAt = now + newTimeout
      session.expiresAt = newExpiresAt
    }

    return {
      isValid: true,
      session,
      security: updatedSecurity,
      newExpiresAt,
      actions
    }
  }

  /**
   * Terminate session
   */
  terminateSession(sessionId: string, reason: string = 'user_logout'): boolean {
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      return false
    }

    session.isActive = false
    
    // Remove from user sessions
    const userSessions = this.userSessions.get(session.userId)
    if (userSessions) {
      userSessions.delete(sessionId)
    }

    console.log(`Session terminated: ${sessionId.substring(0, 8)}...`, {
      reason,
      userId: session.userId,
      duration: (Date.now() - session.createdAt) / 1000
    })

    return true
  }

  /**
   * Terminate all sessions for a user
   */
  terminateAllUserSessions(userId: string, except?: string): number {
    const userSessions = this.userSessions.get(userId)
    let terminatedCount = 0
    
    if (userSessions) {
      for (const sessionId of userSessions) {
        if (sessionId !== except) {
          if (this.terminateSession(sessionId, 'security_termination')) {
            terminatedCount++
          }
        }
      }
    }

    return terminatedCount
  }

  /**
   * Analyze session security and detect anomalies
   */
  private async analyzeSessionSecurity(context: SessionContext): Promise<SessionSecurity> {
    let riskScore = 0
    const anomalies: string[] = []
    
    // Device fingerprint analysis
    const isDeviceKnown = this.isKnownDevice(context.userId, context.deviceFingerprint)
    if (!isDeviceKnown && context.deviceFingerprint) {
      riskScore += 0.3
      anomalies.push('Unknown device')
    }

    // Location analysis
    const isLocationKnown = this.isKnownLocation(context.userId, context.location)
    if (!isLocationKnown && context.location) {
      riskScore += 0.2
      anomalies.push('New location')
    }

    // IP address analysis
    const isNewIP = this.isNewIPAddress(context.userId, context.ip)
    if (isNewIP) {
      riskScore += 0.15
      anomalies.push('New IP address')
    }

    // User agent analysis
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      riskScore += 0.25
      anomalies.push('Suspicious user agent')
    }

    // Time-based analysis
    const suspiciousTime = this.isSuspiciousLoginTime(context.timestamp)
    if (suspiciousTime) {
      riskScore += 0.1
      anomalies.push('Unusual login time')
    }

    // Concurrent session analysis
    const concurrentSessions = this.getUserSessionCount(context.userId)
    if (concurrentSessions >= this.config.maxSessions) {
      riskScore += 0.2
      anomalies.push('Maximum sessions reached')
    }

    // Calculate recommended timeout based on risk
    const recommendedTimeout = this.calculateAdaptiveTimeout({ 
      riskScore, 
      anomalies, 
      isDeviceKnown, 
      isLocationKnown,
      requiresMFA: false,
      recommendedTimeout: this.config.baseTimeout
    })

    return {
      riskScore: Math.min(riskScore, 1.0),
      isDeviceKnown,
      isLocationKnown,
      anomalies,
      recommendedTimeout,
      requiresMFA: riskScore > 0.6 || anomalies.length > 2
    }
  }

  /**
   * Calculate adaptive timeout based on security profile
   */
  private calculateAdaptiveTimeout(security: SessionSecurity): number {
    let timeout = this.config.baseTimeout

    // Reduce timeout for high-risk sessions
    if (security.riskScore > 0.7) {
      timeout = this.config.minTimeout
    } else if (security.riskScore > 0.4) {
      timeout = Math.floor(this.config.baseTimeout * 0.7)
    } else if (security.riskScore < 0.2 && security.isDeviceKnown && security.isLocationKnown) {
      // Extend timeout for trusted sessions
      timeout = Math.min(this.config.maxTimeout, this.config.baseTimeout * 2)
    }

    return Math.max(this.config.minTimeout, Math.min(this.config.maxTimeout, timeout))
  }

  /**
   * Device fingerprint tracking
   */
  private isKnownDevice(userId: string, fingerprint?: string): boolean {
    if (!fingerprint) return false
    
    const userFingerprints = this.deviceFingerprints.get(userId)
    return userFingerprints ? userFingerprints.has(fingerprint) : false
  }

  private updateDeviceTracking(userId: string, fingerprint?: string): void {
    if (!fingerprint) return

    if (!this.deviceFingerprints.has(userId)) {
      this.deviceFingerprints.set(userId, new Set())
    }
    
    this.deviceFingerprints.get(userId)!.add(fingerprint)
  }

  /**
   * Location tracking
   */
  private isKnownLocation(userId: string, location?: any): boolean {
    if (!location) return true // Don't penalize missing location data
    
    const history = this.locationHistory.get(userId)
    if (!history) return false

    return history.some(entry => 
      entry.location.country === location.country &&
      entry.location.region === location.region
    )
  }

  private updateLocationHistory(userId: string, location?: any): void {
    if (!location) return

    if (!this.locationHistory.has(userId)) {
      this.locationHistory.set(userId, [])
    }
    
    const history = this.locationHistory.get(userId)!
    history.push({ location, timestamp: Date.now() })
    
    // Keep only last 50 locations
    if (history.length > 50) {
      history.splice(0, history.length - 50)
    }
  }

  /**
   * IP address tracking
   */
  private isNewIPAddress(userId: string, ip: string): boolean {
    const userSessions = this.userSessions.get(userId)
    if (!userSessions) return true

    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId)
      if (session && session.context.ip === ip) {
        return false
      }
    }
    
    return true
  }

  /**
   * Suspicious user agent detection
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /requests/i,
      /scanner/i, /exploit/i, /hack/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  /**
   * Detect suspicious login times
   */
  private isSuspiciousLoginTime(timestamp: number): boolean {
    const hour = new Date(timestamp).getHours()
    // Consider 2 AM - 6 AM as suspicious for most users
    return hour >= 2 && hour <= 6
  }

  /**
   * Session limit enforcement
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const userSessions = this.userSessions.get(userId)
    if (!userSessions || userSessions.size < this.config.maxSessions) {
      return
    }

    // Find oldest session to terminate
    let oldestSession: ActiveSession | null = null
    let oldestSessionId = ''
    
    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId)
      if (session && session.isActive) {
        if (!oldestSession || session.createdAt < oldestSession.createdAt) {
          oldestSession = session
          oldestSessionId = sessionId
        }
      }
    }

    if (oldestSessionId) {
      this.terminateSession(oldestSessionId, 'session_limit_exceeded')
    }
  }

  /**
   * Get active session count for user
   */
  private getUserSessionCount(userId: string): number {
    const userSessions = this.userSessions.get(userId)
    if (!userSessions) return 0

    let activeCount = 0
    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId)
      if (session && session.isActive && session.expiresAt > Date.now()) {
        activeCount++
      }
    }

    return activeCount
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.isActive || now > session.expiresAt) {
        session.isActive = false
        
        // Remove from user sessions
        const userSessions = this.userSessions.get(session.userId)
        if (userSessions) {
          userSessions.delete(sessionId)
        }
        
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`)
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number
    activeSessions: number
    averageRiskScore: number
    highRiskSessions: number
    deviceTypes: Record<string, number>
  } {
    const now = Date.now()
    let activeSessions = 0
    let totalRiskScore = 0
    let highRiskSessions = 0
    const deviceTypes: Record<string, number> = {}

    for (const session of this.sessions.values()) {
      if (session.isActive && session.expiresAt > now) {
        activeSessions++
        totalRiskScore += session.security.riskScore
        
        if (session.security.riskScore > 0.7) {
          highRiskSessions++
        }

        // Basic device type detection from user agent
        const userAgent = session.context.userAgent.toLowerCase()
        let deviceType = 'Unknown'
        if (userAgent.includes('mobile')) deviceType = 'Mobile'
        else if (userAgent.includes('tablet')) deviceType = 'Tablet'
        else if (userAgent.includes('desktop') || userAgent.includes('mozilla')) deviceType = 'Desktop'
        
        deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      averageRiskScore: activeSessions > 0 ? totalRiskScore / activeSessions : 0,
      highRiskSessions,
      deviceTypes
    }
  }

  /**
   * Get active sessions for a user
   */
  getUserSessions(userId: string): ActiveSession[] {
    const userSessions = this.userSessions.get(userId)
    if (!userSessions) return []

    const sessions: ActiveSession[] = []
    const now = Date.now()

    for (const sessionId of userSessions) {
      const session = this.sessions.get(sessionId)
      if (session && session.isActive && session.expiresAt > now) {
        sessions.push(session)
      }
    }

    return sessions.sort((a, b) => b.lastActivity - a.lastActivity)
  }
}

// Guardian Security: Global session manager instance
export const guardianSessionManager = new GuardianSessionManager()