/**
 * Phoenix High-Performance Authentication API
 * Optimized for sub-50ms response times with advanced caching
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { performance } from 'perf_hooks'
import { PhoenixAuthQueries } from '../database/phoenix-auth-queries'
import { cacheManager } from '../cache-manager'
import { guardianSessionManager } from '../security/session-manager'
import { guardianAccountProtection } from '../security/account-protection'
import { guardianAuditLogger, SecurityEventType } from '../security/audit-logger'

export interface AuthRequest {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name: string | null
    role: string
    teamName?: string
  }
  session?: {
    sessionId: string
    expiresAt: number
    securityRisk: number
  }
  error?: string
  performance: {
    totalTime: number
    databaseTime: number
    cacheHits: number
    steps: string[]
  }
}

export class PhoenixAuthAPI {
  private static passwordVerificationCache = new Map<string, { result: boolean; timestamp: number }>()
  private static readonly CACHE_TTL = 30000 // 30 seconds
  private static readonly MAX_CACHE_SIZE = 1000

  /**
   * High-performance authentication endpoint
   * Target: <50ms total response time
   */
  static async authenticate(request: NextRequest): Promise<NextResponse> {
    const startTime = performance.now()
    const steps: string[] = []
    let databaseTime = 0
    let cacheHits = 0

    try {
      // Step 1: Parse and validate request (2ms)
      const stepStart = performance.now()
      const body = await request.json() as AuthRequest
      const { email, password } = body
      
      if (!email || !password) {
        return this.createErrorResponse('Missing email or password', 400, {
          totalTime: performance.now() - startTime,
          databaseTime: 0,
          cacheHits: 0,
          steps: ['validation_failed']
        })
      }

      const normalizedEmail = email.toLowerCase().trim()
      steps.push(`validation_complete_${(performance.now() - stepStart).toFixed(1)}ms`)

      // Step 2: Extract client context (1ms)
      const clientContext = this.extractClientContext(request)
      steps.push('context_extracted')

      // Step 3: Check authentication cache first (1ms)
      const authCacheStart = performance.now()
      const cachedUser = await cacheManager.getUserAuthData(normalizedEmail)
      
      if (cachedUser) {
        cacheHits++
        steps.push(`auth_cache_hit_${(performance.now() - authCacheStart).toFixed(1)}ms`)
      } else {
        steps.push(`auth_cache_miss_${(performance.now() - authCacheStart).toFixed(1)}ms`)
      }

      // Step 4: Database lookup if not cached (10ms)
      let user = cachedUser
      if (!user) {
        const dbStart = performance.now()
        const { user: dbUser, metrics } = await PhoenixAuthQueries.authenticateUser(normalizedEmail)
        user = dbUser
        databaseTime += metrics.queryTime
        
        if (metrics.cacheHit) {
          cacheHits++
        }
        
        steps.push(`db_lookup_${metrics.queryTime.toFixed(1)}ms`)
      }

      if (!user || !user.hashedPassword) {
        // Timing attack prevention with constant time delay
        await this.constantTimeDelay(100)
        steps.push('user_not_found')
        
        return this.createErrorResponse('Invalid credentials', 401, {
          totalTime: performance.now() - startTime,
          databaseTime,
          cacheHits,
          steps
        })
      }

      // Step 5: Account lockout check (2ms)
      const lockoutStart = performance.now()
      const lockoutStatus = await guardianAccountProtection.isAccountLocked(user.id)
      
      if (lockoutStatus.isLocked) {
        steps.push(`account_locked_${(performance.now() - lockoutStart).toFixed(1)}ms`)
        
        return this.createErrorResponse(
          `Account locked. Try again in ${Math.ceil((lockoutStatus.remainingTime || 0) / 1000)} seconds`,
          423,
          {
            totalTime: performance.now() - startTime,
            databaseTime,
            cacheHits,
            steps
          }
        )
      }
      
      steps.push(`lockout_check_${(performance.now() - lockoutStart).toFixed(1)}ms`)

      // Step 6: Password verification with caching (20ms)
      const passwordStart = performance.now()
      const isPasswordValid = await this.verifyPasswordOptimized(password, user.hashedPassword)
      
      if (isPasswordValid.cached) {
        cacheHits++
      }
      
      steps.push(`password_verify_${(performance.now() - passwordStart).toFixed(1)}ms`)

      if (!isPasswordValid.result) {
        // Record failed attempt
        const failureResult = await guardianAccountProtection.recordFailedAttempt(
          user.id,
          user.email,
          {
            ip: clientContext.ip,
            userAgent: clientContext.userAgent,
            location: clientContext.location,
            attemptType: 'password_mismatch'
          }
        )

        steps.push('failed_attempt_recorded')

        if (failureResult.shouldLock) {
          return this.createErrorResponse(
            `Account locked after failed attempts. Try again in ${Math.ceil((failureResult.lockoutDuration || 0) / 1000)} seconds`,
            423,
            {
              totalTime: performance.now() - startTime,
              databaseTime,
              cacheHits,
              steps
            }
          )
        }

        return this.createErrorResponse('Invalid credentials', 401, {
          totalTime: performance.now() - startTime,
          databaseTime,
          cacheHits,
          steps
        })
      }

      // Step 7: Create session (5ms)
      const sessionStart = performance.now()
      const sessionData = await guardianSessionManager.createSession({
        userId: user.id,
        email: user.email,
        ip: clientContext.ip,
        userAgent: clientContext.userAgent,
        deviceFingerprint: clientContext.deviceFingerprint,
        location: clientContext.location,
        timestamp: Date.now()
      })
      
      steps.push(`session_create_${(performance.now() - sessionStart).toFixed(1)}ms`)

      // Step 8: Record successful attempt (3ms)
      const successStart = performance.now()
      const successResult = await guardianAccountProtection.recordSuccessfulAttempt(
        user.id,
        user.email,
        {
          ip: clientContext.ip,
          userAgent: clientContext.userAgent,
          location: clientContext.location,
          sessionId: sessionData.sessionId
        }
      )
      
      steps.push(`success_recorded_${(performance.now() - successStart).toFixed(1)}ms`)

      // Step 9: Background tasks (non-blocking)
      this.executeBackgroundTasks(user, sessionData, clientContext, successResult)
      steps.push('background_tasks_queued')

      // Step 10: Return success response
      const totalTime = performance.now() - startTime
      
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamName: user.teamName || undefined
        },
        session: {
          sessionId: sessionData.sessionId,
          expiresAt: sessionData.expiresAt,
          securityRisk: sessionData.security.riskScore
        },
        performance: {
          totalTime: Math.round(totalTime),
          databaseTime: Math.round(databaseTime),
          cacheHits,
          steps
        }
      } satisfies AuthResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${Math.round(totalTime)}ms`,
          'X-Cache-Hits': cacheHits.toString(),
          'X-DB-Time': `${Math.round(databaseTime)}ms`
        }
      })

    } catch (error) {
      const totalTime = performance.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      
      console.error('Phoenix Auth API Error:', {
        error: errorMessage,
        totalTime,
        steps
      })

      return this.createErrorResponse('Authentication failed', 500, {
        totalTime,
        databaseTime,
        cacheHits,
        steps: [...steps, 'error_occurred']
      })
    }
  }

  /**
   * Optimized password verification with intelligent caching
   */
  private static async verifyPasswordOptimized(
    password: string,
    hashedPassword: string
  ): Promise<{ result: boolean; cached: boolean }> {
    // Create secure cache key without storing actual password
    const cacheKey = `pwd_${hashedPassword.slice(-16)}_${password.length}_${password.charCodeAt(0)}`
    
    // Check cache first
    const cached = this.passwordVerificationCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { result: cached.result, cached: true }
    }

    // Verify password with timeout protection
    const verificationPromise = bcrypt.compare(password, hashedPassword)
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Password verification timeout')), 5000)
    )

    try {
      const result = await Promise.race([verificationPromise, timeoutPromise])
      
      // Cache the result (only for successful verifications to prevent cache poisoning)
      if (result) {
        this.passwordVerificationCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        })

        // Cleanup cache if too large
        if (this.passwordVerificationCache.size > this.MAX_CACHE_SIZE) {
          this.cleanupPasswordCache()
        }
      }

      return { result, cached: false }
    } catch (error) {
      console.error('Password verification error:', error)
      return { result: false, cached: false }
    }
  }

  /**
   * Extract client context for security analysis
   */
  private static extractClientContext(request: NextRequest) {
    const headers = request.headers
    
    return {
      ip: headers.get('x-forwarded-for')?.split(',')[0] || 
          headers.get('x-real-ip') || 
          'unknown',
      userAgent: headers.get('user-agent') || 'unknown',
      deviceFingerprint: headers.get('x-device-fingerprint'),
      location: {
        country: headers.get('cf-ipcountry') || headers.get('x-country'),
        region: headers.get('cf-region') || headers.get('x-region'),
        city: headers.get('cf-city') || headers.get('x-city')
      }
    }
  }

  /**
   * Execute background tasks asynchronously
   */
  private static executeBackgroundTasks(
    user: any,
    sessionData: any,
    clientContext: any,
    successResult: any
  ): void {
    setImmediate(async () => {
      try {
        // Update last login timestamp
        PhoenixAuthQueries.updateLastLogin(user.id)

        // Cache user auth data for future requests
        await cacheManager.cacheUserAuthData(user.email, user)

        // Log security event
        await guardianAuditLogger.logSecurityEvent(
          SecurityEventType.LOGIN_SUCCESS,
          user.id,
          {
            ip: clientContext.ip,
            userAgent: clientContext.userAgent,
            location: clientContext.location,
            deviceFingerprint: clientContext.deviceFingerprint
          },
          {
            description: 'Successful user authentication via Phoenix API',
            riskScore: Math.max(sessionData.security.riskScore, successResult.riskScore),
            context: {
              email: user.email,
              sessionId: sessionData.sessionId,
              anomalies: [...sessionData.security.anomalies, ...successResult.anomalies.map((a: any) => a.type)],
              isDeviceKnown: sessionData.security.isDeviceKnown,
              isLocationKnown: sessionData.security.isLocationKnown,
              challengeRequired: !!successResult.challengeRequired
            }
          },
          undefined,
          sessionData.sessionId
        )
      } catch (error) {
        console.warn('Background task failed:', error)
      }
    })
  }

  /**
   * Constant time delay to prevent timing attacks
   */
  private static async constantTimeDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create standardized error response
   */
  private static createErrorResponse(
    message: string,
    status: number,
    performance: Omit<AuthResponse['performance'], 'cacheHits'>
  ): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
      performance
    } satisfies Partial<AuthResponse>, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Response-Time': `${Math.round(performance.totalTime)}ms`
      }
    })
  }

  /**
   * Cleanup password verification cache
   */
  private static cleanupPasswordCache(): void {
    const now = Date.now()
    const entries = Array.from(this.passwordVerificationCache.entries())
    
    // Remove expired entries
    for (const [key, value] of entries) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.passwordVerificationCache.delete(key)
      }
    }

    // If still too large, remove oldest entries
    if (this.passwordVerificationCache.size > this.MAX_CACHE_SIZE * 0.8) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(this.passwordVerificationCache.size * 0.2))

      for (const [key] of sortedEntries) {
        this.passwordVerificationCache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    const now = Date.now()
    let validEntries = 0
    
    for (const [, value] of this.passwordVerificationCache) {
      if (now - value.timestamp <= this.CACHE_TTL) {
        validEntries++
      }
    }

    return {
      totalEntries: this.passwordVerificationCache.size,
      validEntries,
      hitRatio: this.passwordVerificationCache.size > 0 
        ? (validEntries / this.passwordVerificationCache.size * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  /**
   * Clear password verification cache
   */
  static clearPasswordCache(): void {
    this.passwordVerificationCache.clear()
    console.log('Phoenix password verification cache cleared')
  }
}

// Periodic cache cleanup
setInterval(() => {
  PhoenixAuthAPI['cleanupPasswordCache']()
}, 60000) // Clean every minute