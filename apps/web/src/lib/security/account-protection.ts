// Guardian Security: Account Protection & Anomaly Detection System
// Implements intelligent account lockout, anomaly detection, and behavioral analysis

import { guardianAuditLogger, SecurityEventType, SeverityLevel } from './audit-logger'

export interface AccountLockoutPolicy {
  maxFailedAttempts: number
  lockoutDurationMs: number
  progressiveLockout: boolean
  resetWindowMs: number
  permanentLockoutThreshold: number
}

export interface AccountStatus {
  userId: string
  email: string
  isLocked: boolean
  lockoutReason?: string
  lockoutUntil?: Date
  failedAttempts: number
  lastFailedAttempt?: Date
  totalLockouts: number
  riskScore: number
  suspiciousActivityScore: number
  behaviorProfile: BehaviorProfile
}

export interface BehaviorProfile {
  averageSessionDuration: number
  commonLocations: Array<{
    country: string
    region: string
    frequency: number
  }>
  commonDevices: Array<{
    fingerprint: string
    userAgent: string
    frequency: number
  }>
  typicalLoginTimes: Array<{
    hour: number
    frequency: number
  }>
  activityPatterns: Array<{
    action: string
    frequency: number
    lastSeen: Date
  }>
}

export interface AnomalyDetection {
  type: 'location' | 'device' | 'time' | 'velocity' | 'behavior'
  severity: SeverityLevel
  confidence: number
  description: string
  indicators: string[]
  recommendedAction: 'log' | 'challenge' | 'block' | 'notify'
}

export interface SecurityChallenge {
  id: string
  userId: string
  type: 'email_verification' | 'mfa_required' | 'security_questions' | 'admin_approval'
  reason: string
  expiresAt: Date
  attempts: number
  maxAttempts: number
  completed: boolean
}

export class GuardianAccountProtection {
  private accountStatuses = new Map<string, AccountStatus>()
  private securityChallenges = new Map<string, SecurityChallenge>()
  private lockoutPolicy: AccountLockoutPolicy

  constructor(policy: Partial<AccountLockoutPolicy> = {}) {
    this.lockoutPolicy = {
      maxFailedAttempts: 5,
      lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
      progressiveLockout: true,
      resetWindowMs: 60 * 60 * 1000, // 1 hour
      permanentLockoutThreshold: 10,
      ...policy
    }

    // Cleanup expired lockouts every 5 minutes
    setInterval(() => this.cleanupExpiredLockouts(), 5 * 60 * 1000)
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<{
    isLocked: boolean
    reason?: string
    lockedUntil?: Date
    remainingTime?: number
  }> {
    const status = this.getAccountStatus(userId)
    
    if (!status.isLocked) {
      return { isLocked: false }
    }

    const now = new Date()
    if (status.lockoutUntil && now >= status.lockoutUntil) {
      // Lockout expired, unlock account
      await this.unlockAccount(userId, 'lockout_expired')
      return { isLocked: false }
    }

    const remainingTime = status.lockoutUntil 
      ? status.lockoutUntil.getTime() - now.getTime()
      : undefined

    return {
      isLocked: true,
      reason: status.lockoutReason,
      lockedUntil: status.lockoutUntil,
      remainingTime
    }
  }

  /**
   * Record failed authentication attempt
   */
  async recordFailedAttempt(
    userId: string,
    email: string,
    context: {
      ip: string
      userAgent: string
      location?: any
      attemptType: string
    }
  ): Promise<{
    shouldLock: boolean
    lockoutDuration?: number
    riskScore: number
    anomalies: AnomalyDetection[]
  }> {
    const status = this.getAccountStatus(userId, email)
    const now = new Date()

    // Detect anomalies
    const anomalies = await this.detectAnomalies(userId, context, 'failed_login')

    // Update failure count
    status.failedAttempts++
    status.lastFailedAttempt = now

    // Calculate risk score based on failures and anomalies
    const riskScore = this.calculateRiskScore(status, anomalies, context)
    status.riskScore = riskScore

    // Check if account should be locked
    const shouldLock = this.shouldLockAccount(status)
    let lockoutDuration: number | undefined

    if (shouldLock) {
      lockoutDuration = this.calculateLockoutDuration(status)
      await this.lockAccount(userId, 'failed_attempts', lockoutDuration, context)
    }

    // Log security event
    await guardianAuditLogger.logSecurityEvent(
      shouldLock ? SecurityEventType.ACCOUNT_LOCKOUT : SecurityEventType.LOGIN_FAILURE,
      userId,
      {
        ip: context.ip,
        userAgent: context.userAgent,
        location: context.location
      },
      {
        description: shouldLock 
          ? `Account locked after ${status.failedAttempts} failed attempts`
          : `Failed login attempt (${status.failedAttempts}/${this.lockoutPolicy.maxFailedAttempts})`,
        riskScore,
        context: {
          failedAttempts: status.failedAttempts,
          attemptType: context.attemptType,
          anomalies: anomalies.map(a => a.type),
          lockoutDuration: lockoutDuration ? lockoutDuration / 1000 : undefined
        }
      }
    )

    return { shouldLock, lockoutDuration, riskScore, anomalies }
  }

  /**
   * Record successful authentication
   */
  async recordSuccessfulAttempt(
    userId: string,
    email: string,
    context: {
      ip: string
      userAgent: string
      location?: any
      sessionId: string
    }
  ): Promise<{
    riskScore: number
    anomalies: AnomalyDetection[]
    challengeRequired?: SecurityChallenge
  }> {
    const status = this.getAccountStatus(userId, email)
    const now = new Date()

    // Reset failed attempts on successful login
    status.failedAttempts = 0
    status.lastFailedAttempt = undefined

    // Detect anomalies for successful login
    const anomalies = await this.detectAnomalies(userId, context, 'successful_login')

    // Update behavior profile
    this.updateBehaviorProfile(status, context)

    // Calculate risk score
    const riskScore = this.calculateRiskScore(status, anomalies, context)
    status.riskScore = riskScore

    // Check if security challenge is required
    let challengeRequired: SecurityChallenge | undefined
    if (this.requiresSecurityChallenge(anomalies, riskScore)) {
      challengeRequired = await this.createSecurityChallenge(userId, anomalies, riskScore)
    }

    return { riskScore, anomalies, challengeRequired }
  }

  /**
   * Detect anomalies in user behavior
   */
  private async detectAnomalies(
    userId: string,
    context: {
      ip: string
      userAgent: string
      location?: any
    },
    eventType: 'failed_login' | 'successful_login'
  ): Promise<AnomalyDetection[]> {
    const status = this.getAccountStatus(userId)
    const anomalies: AnomalyDetection[] = []

    // Location anomaly detection
    if (context.location) {
      const locationAnomaly = this.detectLocationAnomaly(status, context.location)
      if (locationAnomaly) {
        anomalies.push(locationAnomaly)
      }
    }

    // Device anomaly detection
    const deviceAnomaly = this.detectDeviceAnomaly(status, context.userAgent)
    if (deviceAnomaly) {
      anomalies.push(deviceAnomaly)
    }

    // Time-based anomaly detection
    const timeAnomaly = this.detectTimeAnomaly(status, new Date())
    if (timeAnomaly) {
      anomalies.push(timeAnomaly)
    }

    // Velocity anomaly detection (impossible travel)
    const velocityAnomaly = await this.detectVelocityAnomaly(userId, context)
    if (velocityAnomaly) {
      anomalies.push(velocityAnomaly)
    }

    // Behavioral anomaly detection
    if (eventType === 'successful_login') {
      const behaviorAnomaly = this.detectBehaviorAnomaly(status, context)
      if (behaviorAnomaly) {
        anomalies.push(behaviorAnomaly)
      }
    }

    return anomalies
  }

  /**
   * Detect location-based anomalies
   */
  private detectLocationAnomaly(status: AccountStatus, location: any): AnomalyDetection | null {
    if (!location.country) return null

    const commonLocation = status.behaviorProfile.commonLocations
      .find(l => l.country === location.country && l.region === location.region)

    if (!commonLocation && status.behaviorProfile.commonLocations.length > 0) {
      const confidence = 0.8 // High confidence for new country
      
      return {
        type: 'location',
        severity: SeverityLevel.MEDIUM,
        confidence,
        description: `Login from new location: ${location.country}`,
        indicators: ['new_country', 'geographic_distance'],
        recommendedAction: confidence > 0.7 ? 'challenge' : 'log'
      }
    }

    return null
  }

  /**
   * Detect device-based anomalies
   */
  private detectDeviceAnomaly(status: AccountStatus, userAgent: string): AnomalyDetection | null {
    const deviceFingerprint = this.generateDeviceFingerprint(userAgent)
    const knownDevice = status.behaviorProfile.commonDevices
      .find(d => d.fingerprint === deviceFingerprint)

    if (!knownDevice && status.behaviorProfile.commonDevices.length > 0) {
      // Check if it's a suspicious user agent
      const isSuspicious = this.isSuspiciousUserAgent(userAgent)
      
      return {
        type: 'device',
        severity: isSuspicious ? SeverityLevel.HIGH : SeverityLevel.LOW,
        confidence: isSuspicious ? 0.9 : 0.6,
        description: `Login from new device: ${this.getDeviceType(userAgent)}`,
        indicators: isSuspicious ? ['new_device', 'suspicious_user_agent'] : ['new_device'],
        recommendedAction: isSuspicious ? 'block' : 'challenge'
      }
    }

    return null
  }

  /**
   * Detect time-based anomalies
   */
  private detectTimeAnomaly(status: AccountStatus, timestamp: Date): AnomalyDetection | null {
    const hour = timestamp.getHours()
    const typicalHour = status.behaviorProfile.typicalLoginTimes
      .find(t => Math.abs(t.hour - hour) <= 1)

    if (!typicalHour && status.behaviorProfile.typicalLoginTimes.length > 0) {
      // Check if it's during typical sleeping hours
      const isNightTime = hour >= 2 && hour <= 6
      
      return {
        type: 'time',
        severity: isNightTime ? SeverityLevel.MEDIUM : SeverityLevel.LOW,
        confidence: isNightTime ? 0.7 : 0.5,
        description: `Login at unusual time: ${hour}:00`,
        indicators: isNightTime ? ['unusual_time', 'night_time'] : ['unusual_time'],
        recommendedAction: 'log'
      }
    }

    return null
  }

  /**
   * Detect velocity anomalies (impossible travel)
   */
  private async detectVelocityAnomaly(
    userId: string,
    context: { ip: string; location?: any }
  ): Promise<AnomalyDetection | null> {
    // This would require IP geolocation service in production
    // For now, return null as we don't have precise location data
    return null
  }

  /**
   * Detect behavioral anomalies
   */
  private detectBehaviorAnomaly(
    status: AccountStatus,
    context: any
  ): AnomalyDetection | null {
    // Implement behavioral analysis based on activity patterns
    // This is a placeholder for advanced behavioral analytics
    return null
  }

  /**
   * Calculate composite risk score
   */
  private calculateRiskScore(
    status: AccountStatus,
    anomalies: AnomalyDetection[],
    context: any
  ): number {
    let score = 0

    // Base score from failed attempts
    score += Math.min(status.failedAttempts / this.lockoutPolicy.maxFailedAttempts, 1) * 0.4

    // Anomaly-based scoring
    anomalies.forEach(anomaly => {
      switch (anomaly.severity) {
        case SeverityLevel.CRITICAL:
          score += 0.4 * anomaly.confidence
          break
        case SeverityLevel.HIGH:
          score += 0.3 * anomaly.confidence
          break
        case SeverityLevel.MEDIUM:
          score += 0.2 * anomaly.confidence
          break
        case SeverityLevel.LOW:
          score += 0.1 * anomaly.confidence
          break
      }
    })

    // Historical lockout penalty
    if (status.totalLockouts > 0) {
      score += Math.min(status.totalLockouts / 5, 0.2)
    }

    return Math.min(score, 1.0)
  }

  /**
   * Check if account should be locked
   */
  private shouldLockAccount(status: AccountStatus): boolean {
    // Already locked
    if (status.isLocked) return false

    // Exceeded max failed attempts
    if (status.failedAttempts >= this.lockoutPolicy.maxFailedAttempts) {
      return true
    }

    // High risk score triggers immediate lockout
    if (status.riskScore > 0.8) {
      return true
    }

    return false
  }

  /**
   * Calculate lockout duration with progressive penalties
   */
  private calculateLockoutDuration(status: AccountStatus): number {
    let duration = this.lockoutPolicy.lockoutDurationMs

    if (this.lockoutPolicy.progressiveLockout && status.totalLockouts > 0) {
      // Progressive lockout: double duration for each previous lockout
      const multiplier = Math.min(Math.pow(2, status.totalLockouts), 16) // Cap at 16x
      duration *= multiplier
    }

    return duration
  }

  /**
   * Lock account
   */
  private async lockAccount(
    userId: string,
    reason: string,
    durationMs: number,
    context: any
  ): Promise<void> {
    const status = this.getAccountStatus(userId)
    const lockoutUntil = new Date(Date.now() + durationMs)

    status.isLocked = true
    status.lockoutReason = reason
    status.lockoutUntil = lockoutUntil
    status.totalLockouts++

    console.warn(`Account locked: ${userId}`, {
      reason,
      duration: durationMs / 1000,
      lockoutUntil: lockoutUntil.toISOString(),
      totalLockouts: status.totalLockouts
    })
  }

  /**
   * Unlock account
   */
  private async unlockAccount(userId: string, reason: string): Promise<void> {
    const status = this.getAccountStatus(userId)

    status.isLocked = false
    status.lockoutReason = undefined
    status.lockoutUntil = undefined
    status.failedAttempts = 0

    console.log(`Account unlocked: ${userId}`, { reason })
  }

  /**
   * Check if security challenge is required
   */
  private requiresSecurityChallenge(
    anomalies: AnomalyDetection[],
    riskScore: number
  ): boolean {
    // High risk score
    if (riskScore > 0.7) return true

    // Any anomaly requiring challenge
    return anomalies.some(a => 
      a.recommendedAction === 'challenge' || 
      a.recommendedAction === 'block'
    )
  }

  /**
   * Create security challenge
   */
  private async createSecurityChallenge(
    userId: string,
    anomalies: AnomalyDetection[],
    riskScore: number
  ): Promise<SecurityChallenge> {
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Determine challenge type based on risk level
    let challengeType: SecurityChallenge['type'] = 'email_verification'
    if (riskScore > 0.8) {
      challengeType = 'admin_approval'
    } else if (riskScore > 0.6) {
      challengeType = 'mfa_required'
    }

    const challenge: SecurityChallenge = {
      id: challengeId,
      userId,
      type: challengeType,
      reason: `Security challenge due to ${anomalies.map(a => a.type).join(', ')}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      attempts: 0,
      maxAttempts: 3,
      completed: false
    }

    this.securityChallenges.set(challengeId, challenge)

    console.warn(`Security challenge created for user ${userId}`, {
      challengeId,
      type: challengeType,
      reason: challenge.reason,
      riskScore
    })

    return challenge
  }

  /**
   * Update behavior profile
   */
  private updateBehaviorProfile(
    status: AccountStatus,
    context: {
      userAgent: string
      location?: any
      sessionId: string
    }
  ): void {
    const profile = status.behaviorProfile

    // Update device tracking
    const deviceFingerprint = this.generateDeviceFingerprint(context.userAgent)
    let device = profile.commonDevices.find(d => d.fingerprint === deviceFingerprint)
    if (device) {
      device.frequency++
    } else {
      profile.commonDevices.push({
        fingerprint: deviceFingerprint,
        userAgent: context.userAgent,
        frequency: 1
      })
    }

    // Update location tracking
    if (context.location) {
      let location = profile.commonLocations.find(l => 
        l.country === context.location.country && 
        l.region === context.location.region
      )
      if (location) {
        location.frequency++
      } else {
        profile.commonLocations.push({
          country: context.location.country || 'unknown',
          region: context.location.region || 'unknown',
          frequency: 1
        })
      }
    }

    // Update time tracking
    const hour = new Date().getHours()
    let timeSlot = profile.typicalLoginTimes.find(t => t.hour === hour)
    if (timeSlot) {
      timeSlot.frequency++
    } else {
      profile.typicalLoginTimes.push({
        hour,
        frequency: 1
      })
    }

    // Keep only top 10 entries for performance
    profile.commonDevices = profile.commonDevices
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
    
    profile.commonLocations = profile.commonLocations
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
  }

  /**
   * Get or create account status
   */
  private getAccountStatus(userId: string, email?: string): AccountStatus {
    let status = this.accountStatuses.get(userId)
    
    if (!status) {
      status = {
        userId,
        email: email || 'unknown',
        isLocked: false,
        failedAttempts: 0,
        totalLockouts: 0,
        riskScore: 0,
        suspiciousActivityScore: 0,
        behaviorProfile: {
          averageSessionDuration: 0,
          commonLocations: [],
          commonDevices: [],
          typicalLoginTimes: [],
          activityPatterns: []
        }
      }
      
      this.accountStatuses.set(userId, status)
    }
    
    return status
  }

  /**
   * Utility methods
   */
  private generateDeviceFingerprint(userAgent: string): string {
    // Simple fingerprinting - in production, use more sophisticated methods
    return Buffer.from(userAgent).toString('base64').substring(0, 16)
  }

  private getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile')) return 'Mobile'
    if (ua.includes('tablet')) return 'Tablet'
    if (ua.includes('bot') || ua.includes('crawler')) return 'Bot'
    return 'Desktop'
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /requests/i,
      /scanner/i, /exploit/i, /hack/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  private cleanupExpiredLockouts(): void {
    const now = new Date()
    let unlockedCount = 0

    for (const [userId, status] of this.accountStatuses.entries()) {
      if (status.isLocked && status.lockoutUntil && now >= status.lockoutUntil) {
        this.unlockAccount(userId, 'lockout_expired')
        unlockedCount++
      }
    }

    if (unlockedCount > 0) {
      console.log(`Auto-unlocked ${unlockedCount} expired account lockouts`)
    }
  }

  /**
   * Public API methods
   */
  async forceUnlockAccount(userId: string, adminId: string): Promise<boolean> {
    const status = this.accountStatuses.get(userId)
    if (!status || !status.isLocked) {
      return false
    }

    await this.unlockAccount(userId, `admin_unlock_by_${adminId}`)
    
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.PERMISSIONS_MODIFIED,
      userId,
      { ip: 'admin', userAgent: 'admin' },
      {
        description: `Account forcibly unlocked by admin ${adminId}`,
        riskScore: 0.5,
        context: { adminId, action: 'force_unlock' }
      }
    )

    return true
  }

  getAccountStatuses(): AccountStatus[] {
    return Array.from(this.accountStatuses.values())
  }

  getLockedAccounts(): AccountStatus[] {
    return Array.from(this.accountStatuses.values())
      .filter(status => status.isLocked)
  }

  getSecurityChallenges(userId?: string): SecurityChallenge[] {
    const challenges = Array.from(this.securityChallenges.values())
    return userId ? challenges.filter(c => c.userId === userId) : challenges
  }
}

// Guardian Security: Global account protection instance
export const guardianAccountProtection = new GuardianAccountProtection()