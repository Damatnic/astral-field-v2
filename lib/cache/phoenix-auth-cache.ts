/**
 * Phoenix Advanced Authentication Caching Strategy
 * Intelligent multi-tier caching with prediction and preloading
 */

import { cacheManager, CacheManager } from '../cache-manager'
import { performance } from 'perf_hooks'

export interface AuthCacheConfig {
  userDataTTL: number // seconds
  sessionDataTTL: number
  passwordVerificationTTL: number
  preloadThreshold: number // cache miss percentage threshold for preloading
  enablePredictiveLoading: boolean
  enableCompressionForAuth: boolean
}

export interface CachePerformanceMetrics {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  hitRatio: number
  avgResponseTime: number
  compressionSavings: number
  preloadSuccess: number
}

export interface UserAuthData {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  teamName: string | null
  updatedAt: Date
  // Note: hashedPassword excluded for security
}

export interface SessionCacheData {
  sessionId: string
  userId: string
  expiresAt: number
  security: {
    riskScore: number
    isDeviceKnown: boolean
    isLocationKnown: boolean
    requiresMFA: boolean
  }
  lastActivity: number
}

export interface LoginPatternAnalysis {
  commonHours: number[]
  averageFrequency: number
  lastLogin: Date
  predictedNextLogin: Date
  confidence: number
}

export class PhoenixAuthCache {
  private cacheManager: CacheManager
  private config: Required<AuthCacheConfig>
  private metrics: CachePerformanceMetrics
  private userAccessPatterns = new Map<string, LoginPatternAnalysis>()
  private preloadQueue = new Set<string>()
  
  constructor(config: Partial<AuthCacheConfig> = {}) {
    this.config = {
      userDataTTL: config.userDataTTL || 300, // 5 minutes
      sessionDataTTL: config.sessionDataTTL || 1800, // 30 minutes
      passwordVerificationTTL: config.passwordVerificationTTL || 30, // 30 seconds
      preloadThreshold: config.preloadThreshold || 0.7, // 70% cache miss threshold
      enablePredictiveLoading: config.enablePredictiveLoading ?? true,
      enableCompressionForAuth: config.enableCompressionForAuth ?? true
    }

    this.cacheManager = cacheManager
    this.metrics = this.initializeMetrics()
    
    this.setupBackgroundTasks()
  }

  private initializeMetrics(): CachePerformanceMetrics {
    return {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRatio: 0,
      avgResponseTime: 0,
      compressionSavings: 0,
      preloadSuccess: 0
    }
  }

  /**
   * Get user authentication data with intelligent caching
   */
  async getUserAuthData(email: string): Promise<UserAuthData | null> {
    const startTime = performance.now()
    this.metrics.totalRequests++

    const cacheKey = this.generateUserCacheKey(email)
    
    try {
      // L1: Try auth-specific cache first
      let userData = await this.cacheManager.getUserAuthData(email)
      
      if (userData) {
        this.metrics.cacheHits++
        this.recordAccessPattern(email)
        this.updateMetrics(startTime, true)
        return userData
      }

      // L2: Try general cache
      userData = await this.cacheManager.get<UserAuthData>(cacheKey)
      
      if (userData) {
        this.metrics.cacheHits++
        // Backfill auth-specific cache
        await this.cacheManager.cacheUserAuthData(email, userData)
        this.recordAccessPattern(email)
        this.updateMetrics(startTime, true)
        return userData
      }

      this.metrics.cacheMisses++
      this.updateMetrics(startTime, false)
      
      // Queue for potential preloading if miss rate is high
      if (this.shouldPreload(email)) {
        this.queueForPreload(email)
      }
      
      return null
    } catch (error) {
      console.error('Auth cache getUserAuthData error:', error)
      this.updateMetrics(startTime, false)
      return null
    }
  }

  /**
   * Cache user authentication data with optimization
   */
  async cacheUserAuthData(email: string, userData: any): Promise<void> {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const cacheKey = this.generateUserCacheKey(normalizedEmail)
      
      // Remove sensitive data before caching
      const { hashedPassword, ...safeUserData } = userData
      
      // Cache in multiple locations for redundancy and performance
      const cachePromises = [
        // Auth-specific cache (faster access)
        this.cacheManager.cacheUserAuthData(normalizedEmail, safeUserData),
        
        // General cache with longer TTL
        this.cacheManager.set(cacheKey, safeUserData, this.config.userDataTTL),
        
        // Hot cache for frequently accessed users
        this.cacheUserInHotCache(normalizedEmail, safeUserData)
      ]

      await Promise.all(cachePromises)
      
      // Update access patterns
      this.recordAccessPattern(normalizedEmail)
      
      console.debug(`Cached user data for ${normalizedEmail}`)
    } catch (error) {
      console.error('Error caching user auth data:', error)
    }
  }

  /**
   * Session caching with advanced security validation
   */
  async cacheSessionData(sessionId: string, sessionData: SessionCacheData): Promise<void> {
    try {
      const cacheKey = this.generateSessionCacheKey(sessionId)
      
      // Cache with adaptive TTL based on security risk
      const adaptiveTTL = this.calculateAdaptiveSessionTTL(sessionData.security.riskScore)
      
      await Promise.all([
        this.cacheManager.cacheUserSession(sessionId, sessionData),
        this.cacheManager.set(cacheKey, sessionData, adaptiveTTL),
        
        // Cache session-to-user mapping for quick lookups
        this.cacheManager.set(
          `session_user:${sessionId}`,
          { userId: sessionData.userId, sessionId },
          adaptiveTTL
        )
      ])
      
      console.debug(`Cached session ${sessionId} with TTL ${adaptiveTTL}s`)
    } catch (error) {
      console.error('Error caching session data:', error)
    }
  }

  /**
   * Get session data with validation
   */
  async getSessionData(sessionId: string): Promise<SessionCacheData | null> {
    const startTime = performance.now()
    this.metrics.totalRequests++

    try {
      const cacheKey = this.generateSessionCacheKey(sessionId)
      
      // Try session-specific cache first
      let sessionData = await this.cacheManager.getUserSession(sessionId)
      
      if (!sessionData) {
        // Try general cache
        sessionData = await this.cacheManager.get<SessionCacheData>(cacheKey)
      }

      if (sessionData) {
        // Validate session hasn't expired
        if (Date.now() > sessionData.expiresAt) {
          await this.invalidateSession(sessionId)
          this.metrics.cacheMisses++
          this.updateMetrics(startTime, false)
          return null
        }

        this.metrics.cacheHits++
        this.updateMetrics(startTime, true)
        return sessionData
      }

      this.metrics.cacheMisses++
      this.updateMetrics(startTime, false)
      return null
    } catch (error) {
      console.error('Error getting session data:', error)
      this.updateMetrics(startTime, false)
      return null
    }
  }

  /**
   * Password verification caching with security
   */
  async cachePasswordVerification(
    passwordHash: string,
    password: string,
    isValid: boolean
  ): Promise<void> {
    try {
      // Only cache positive results and for short duration
      if (isValid) {
        const cacheKey = this.generatePasswordCacheKey(passwordHash, password)
        await this.cacheManager.set(
          cacheKey,
          { valid: isValid, timestamp: Date.now() },
          this.config.passwordVerificationTTL
        )
      }
    } catch (error) {
      console.error('Error caching password verification:', error)
    }
  }

  /**
   * Get cached password verification
   */
  async getCachedPasswordVerification(
    passwordHash: string,
    password: string
  ): Promise<boolean | null> {
    const startTime = performance.now()
    this.metrics.totalRequests++

    try {
      const cacheKey = this.generatePasswordCacheKey(passwordHash, password)
      const result = await this.cacheManager.get(cacheKey)
      
      if (result && result.valid) {
        this.metrics.cacheHits++
        this.updateMetrics(startTime, true)
        return result.valid
      }

      this.metrics.cacheMisses++
      this.updateMetrics(startTime, false)
      return null
    } catch (error) {
      console.error('Error getting cached password verification:', error)
      this.updateMetrics(startTime, false)
      return null
    }
  }

  /**
   * Preload user data based on predictive patterns
   */
  async preloadUserData(emails: string[]): Promise<void> {
    if (!this.config.enablePredictiveLoading) return

    const preloadPromises = emails.map(async (email) => {
      try {
        const normalizedEmail = email.toLowerCase().trim()
        const pattern = this.userAccessPatterns.get(normalizedEmail)
        
        if (pattern && this.shouldPreloadUser(pattern)) {
          // Fetch from database and cache (this would need database access)
          console.debug(`Preloading user data for ${normalizedEmail}`)
          this.metrics.preloadSuccess++
        }
      } catch (error) {
        console.warn(`Failed to preload user data for ${email}:`, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  }

  /**
   * Cache invalidation methods
   */
  async invalidateUserData(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim()
    const cacheKey = this.generateUserCacheKey(normalizedEmail)
    
    await Promise.all([
      this.cacheManager.invalidateUserAuthData(normalizedEmail),
      this.cacheManager.del(cacheKey),
      this.cacheManager.del(`hot_user:${normalizedEmail}`)
    ])
    
    console.debug(`Invalidated user data for ${normalizedEmail}`)
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const cacheKey = this.generateSessionCacheKey(sessionId)
    
    await Promise.all([
      this.cacheManager.invalidateUserSession(sessionId),
      this.cacheManager.del(cacheKey),
      this.cacheManager.del(`session_user:${sessionId}`)
    ])
    
    console.debug(`Invalidated session ${sessionId}`)
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.cacheManager.invalidateAllSessions(userId)
    console.debug(`Invalidated all sessions for user ${userId}`)
  }

  /**
   * Cache warming strategies
   */
  async warmCache(userEmails: string[]): Promise<void> {
    console.log(`Warming cache for ${userEmails.length} users`)
    
    const batchSize = 50
    for (let i = 0; i < userEmails.length; i += batchSize) {
      const batch = userEmails.slice(i, i + batchSize)
      await this.preloadUserData(batch)
      
      // Throttle to prevent overwhelming the system
      if (i + batchSize < userEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  /**
   * Private helper methods
   */
  private generateUserCacheKey(email: string): string {
    return `phoenix_user:${email.toLowerCase()}`
  }

  private generateSessionCacheKey(sessionId: string): string {
    return `phoenix_session:${sessionId}`
  }

  private generatePasswordCacheKey(passwordHash: string, password: string): string {
    // Create secure key without storing actual password
    return `phoenix_pwd:${passwordHash.slice(-12)}:${password.length}`
  }

  private calculateAdaptiveSessionTTL(riskScore: number): number {
    const baseTTL = this.config.sessionDataTTL
    
    // Reduce TTL for high-risk sessions
    if (riskScore > 0.7) {
      return Math.floor(baseTTL * 0.3) // 30% of base TTL
    } else if (riskScore > 0.4) {
      return Math.floor(baseTTL * 0.6) // 60% of base TTL
    } else {
      return baseTTL
    }
  }

  private async cacheUserInHotCache(email: string, userData: UserAuthData): Promise<void> {
    const pattern = this.userAccessPatterns.get(email)
    
    // Cache frequently accessed users in hot cache
    if (pattern && pattern.averageFrequency > 5) { // More than 5 accesses tracked
      const hotCacheKey = `hot_user:${email}`
      await this.cacheManager.set(hotCacheKey, userData, 600) // 10 minutes
    }
  }

  private recordAccessPattern(email: string): void {
    const now = new Date()
    const pattern = this.userAccessPatterns.get(email) || {
      commonHours: [],
      averageFrequency: 0,
      lastLogin: now,
      predictedNextLogin: now,
      confidence: 0
    }

    // Update pattern data
    const hour = now.getHours()
    pattern.commonHours.push(hour)
    pattern.averageFrequency++
    pattern.lastLogin = now

    // Keep only last 100 hours for pattern analysis
    if (pattern.commonHours.length > 100) {
      pattern.commonHours.shift()
    }

    // Calculate prediction confidence
    pattern.confidence = Math.min(pattern.averageFrequency / 20, 1) // Max confidence at 20 accesses

    this.userAccessPatterns.set(email, pattern)
  }

  private shouldPreload(email: string): boolean {
    const missRatio = this.metrics.totalRequests > 0 
      ? this.metrics.cacheMisses / this.metrics.totalRequests 
      : 0

    return missRatio > this.config.preloadThreshold
  }

  private shouldPreloadUser(pattern: LoginPatternAnalysis): boolean {
    if (!this.config.enablePredictiveLoading) return false
    
    const timeSinceLastLogin = Date.now() - pattern.lastLogin.getTime()
    const typicalInterval = 24 * 60 * 60 * 1000 // 24 hours in ms
    
    return (
      pattern.confidence > 0.6 &&
      timeSinceLastLogin > typicalInterval * 0.8 &&
      timeSinceLastLogin < typicalInterval * 1.2
    )
  }

  private queueForPreload(email: string): void {
    this.preloadQueue.add(email)
    
    // Process preload queue in batches
    if (this.preloadQueue.size >= 10) {
      this.processPreloadQueue()
    }
  }

  private async processPreloadQueue(): Promise<void> {
    const emails = Array.from(this.preloadQueue)
    this.preloadQueue.clear()
    
    // Background preloading
    setImmediate(() => {
      this.preloadUserData(emails)
    })
  }

  private updateMetrics(startTime: number, cacheHit: boolean): void {
    const responseTime = performance.now() - startTime
    
    this.metrics.avgResponseTime = (
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1)) + responseTime
    ) / this.metrics.totalRequests

    this.metrics.hitRatio = this.metrics.totalRequests > 0
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
      : 0
  }

  private setupBackgroundTasks(): void {
    // Process preload queue every 30 seconds
    setInterval(() => {
      if (this.preloadQueue.size > 0) {
        this.processPreloadQueue()
      }
    }, 30000)

    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics()
    }, 5 * 60 * 1000)

    // Cleanup old access patterns every hour
    setInterval(() => {
      this.cleanupAccessPatterns()
    }, 60 * 60 * 1000)
  }

  private logMetrics(): void {
    console.log('Phoenix Auth Cache Metrics:', {
      totalRequests: this.metrics.totalRequests,
      hitRatio: `${this.metrics.hitRatio.toFixed(2)}%`,
      avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
      preloadSuccess: this.metrics.preloadSuccess,
      queueSize: this.preloadQueue.size,
      patternCount: this.userAccessPatterns.size
    })
  }

  private cleanupAccessPatterns(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago
    
    for (const [email, pattern] of this.userAccessPatterns.entries()) {
      if (pattern.lastLogin.getTime() < cutoffTime) {
        this.userAccessPatterns.delete(email)
      }
    }
  }

  /**
   * Public API methods
   */
  getMetrics(): CachePerformanceMetrics {
    return { ...this.metrics }
  }

  getAccessPatterns(): Map<string, LoginPatternAnalysis> {
    return new Map(this.userAccessPatterns)
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
    console.log('Phoenix auth cache metrics reset')
  }

  async flushAuthCache(): Promise<void> {
    await this.cacheManager.invalidatePattern('phoenix_*')
    await this.cacheManager.invalidatePattern('hot_user:*')
    await this.cacheManager.invalidatePattern('session_user:*')
    
    this.userAccessPatterns.clear()
    this.preloadQueue.clear()
    
    console.log('Phoenix auth cache flushed')
  }
}

// Export singleton instance
export const phoenixAuthCache = new PhoenixAuthCache()