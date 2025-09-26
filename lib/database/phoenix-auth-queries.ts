/**
 * Phoenix High-Performance Authentication Queries
 * Optimized database queries for sub-10ms authentication operations
 */

import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'

export interface OptimizedUserResult {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  teamName: string | null
  hashedPassword: string | null
  updatedAt: Date
}

export interface QueryPerformanceMetrics {
  queryTime: number
  cacheHit: boolean
  rowsAffected: number
}

export class PhoenixAuthQueries {
  private static prisma: PrismaClient
  private static queryCache = new Map<string, { data: any; timestamp: number }>()
  private static readonly CACHE_TTL = 30000 // 30 seconds

  static initialize(prismaClient: PrismaClient): void {
    this.prisma = prismaClient
    
    // Setup query performance monitoring
    this.setupPerformanceMonitoring()
  }

  /**
   * Optimized user authentication with covering index
   * Target: <10ms response time
   */
  static async authenticateUser(email: string): Promise<{
    user: OptimizedUserResult | null
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = performance.now()
    const normalizedEmail = email.toLowerCase().trim()
    const cacheKey = `user:${normalizedEmail}`

    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return {
        user: cached,
        metrics: {
          queryTime: performance.now() - startTime,
          cacheHit: true,
          rowsAffected: 1
        }
      }
    }

    try {
      // Use optimized query with covering index
      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          teamName: true,
          hashedPassword: true,
          updatedAt: true
        }
      })

      const queryTime = performance.now() - startTime

      // Cache successful result
      if (user) {
        this.setCache(cacheKey, user, queryTime)
      }

      // Log slow queries
      if (queryTime > 10) {
        console.warn(`Slow auth query detected: ${queryTime.toFixed(2)}ms for ${normalizedEmail}`)
      }

      return {
        user,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: user ? 1 : 0
        }
      }
    } catch (error) {
      const queryTime = performance.now() - startTime
      console.error('Authentication query failed:', {
        email: normalizedEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime
      })

      return {
        user: null,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: 0
        }
      }
    }
  }

  /**
   * Optimized user lookup by ID with minimal data
   * Target: <5ms response time
   */
  static async getUserById(userId: string): Promise<{
    user: Pick<OptimizedUserResult, 'id' | 'email' | 'name' | 'role'> | null
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = performance.now()
    const cacheKey = `user:id:${userId}`

    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return {
        user: cached,
        metrics: {
          queryTime: performance.now() - startTime,
          cacheHit: true,
          rowsAffected: 1
        }
      }
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      })

      const queryTime = performance.now() - startTime

      if (user) {
        this.setCache(cacheKey, user, queryTime)
      }

      return {
        user,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: user ? 1 : 0
        }
      }
    } catch (error) {
      const queryTime = performance.now() - startTime
      console.error('User lookup by ID failed:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime
      })

      return {
        user: null,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: 0
        }
      }
    }
  }

  /**
   * Non-blocking last login update
   * Executes in background to avoid blocking authentication
   */
  static updateLastLogin(userId: string): void {
    // Use setImmediate for non-blocking execution
    setImmediate(async () => {
      const startTime = performance.now()
      
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { updatedAt: new Date() },
          select: { id: true } // Minimal select for performance
        })

        const queryTime = performance.now() - startTime
        
        // Invalidate cache for this user
        this.invalidateUserCache(userId)
        
        if (queryTime > 25) {
          console.warn(`Slow last login update: ${queryTime.toFixed(2)}ms for user ${userId}`)
        }
      } catch (error) {
        const queryTime = performance.now() - startTime
        console.warn('Failed to update last login:', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          queryTime
        })
      }
    })
  }

  /**
   * Bulk user validation for session management
   * Target: <15ms for up to 100 users
   */
  static async validateUsersExist(userIds: string[]): Promise<{
    validUsers: string[]
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = performance.now()

    try {
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds }
        },
        select: {
          id: true
        }
      })

      const queryTime = performance.now() - startTime
      const validUsers = users.map(u => u.id)

      return {
        validUsers,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: users.length
        }
      }
    } catch (error) {
      const queryTime = performance.now() - startTime
      console.error('Bulk user validation failed:', {
        userIds: userIds.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime
      })

      return {
        validUsers: [],
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: 0
        }
      }
    }
  }

  /**
   * Optimized user creation for registration
   * Target: <20ms response time
   */
  static async createUser(userData: {
    email: string
    name?: string
    hashedPassword: string
    role?: string
  }): Promise<{
    user: OptimizedUserResult | null
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = performance.now()
    const normalizedEmail = userData.email.toLowerCase().trim()

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          name: userData.name || null,
          hashedPassword: userData.hashedPassword,
          role: userData.role || 'USER'
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          teamName: true,
          hashedPassword: true,
          updatedAt: true
        }
      })

      const queryTime = performance.now() - startTime

      // Cache the new user
      this.setCache(`user:${normalizedEmail}`, user, queryTime)

      return {
        user,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: 1
        }
      }
    } catch (error) {
      const queryTime = performance.now() - startTime
      console.error('User creation failed:', {
        email: normalizedEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime
      })

      return {
        user: null,
        metrics: {
          queryTime,
          cacheHit: false,
          rowsAffected: 0
        }
      }
    }
  }

  /**
   * Cache management methods
   */
  private static getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key)
    if (!cached) return null

    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.queryCache.delete(key)
      return null
    }

    return cached.data
  }

  private static setCache(key: string, data: any, queryTime: number): void {
    // Only cache fast queries to avoid caching slow outliers
    if (queryTime < 50) {
      this.queryCache.set(key, {
        data,
        timestamp: Date.now()
      })

      // Prevent cache from growing too large
      if (this.queryCache.size > 1000) {
        this.cleanupCache()
      }
    }
  }

  private static invalidateUserCache(userId: string): void {
    // Remove all cache entries for this user
    for (const [key] of this.queryCache) {
      if (key.includes(userId)) {
        this.queryCache.delete(key)
      }
    }
  }

  private static cleanupCache(): void {
    const now = Date.now()
    const entries = Array.from(this.queryCache.entries())
    
    // Remove expired entries
    for (const [key, value] of entries) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key)
      }
    }

    // If still too large, remove oldest entries
    if (this.queryCache.size > 800) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.queryCache.size - 800)

      for (const [key] of sortedEntries) {
        this.queryCache.delete(key)
      }
    }
  }

  /**
   * Performance monitoring setup
   */
  private static setupPerformanceMonitoring(): void {
    // Log cache statistics every 5 minutes
    setInterval(() => {
      const cacheSize = this.queryCache.size
      const now = Date.now()
      
      let totalEntries = 0
      let expiredEntries = 0
      
      for (const [, value] of this.queryCache) {
        totalEntries++
        if (now - value.timestamp > this.CACHE_TTL) {
          expiredEntries++
        }
      }

      console.log('Phoenix Auth Query Cache Stats:', {
        totalEntries,
        expiredEntries,
        hitRatio: totalEntries > 0 ? ((totalEntries - expiredEntries) / totalEntries * 100).toFixed(2) + '%' : '0%',
        cacheSize: `${cacheSize}/1000`
      })
    }, 5 * 60 * 1000)

    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanupCache()
    }, 60 * 1000)
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    cacheSize: number
    cacheHitRatio: number
    totalQueries: number
  } {
    const now = Date.now()
    let validEntries = 0

    for (const [, value] of this.queryCache) {
      if (now - value.timestamp <= this.CACHE_TTL) {
        validEntries++
      }
    }

    return {
      cacheSize: this.queryCache.size,
      cacheHitRatio: this.queryCache.size > 0 ? (validEntries / this.queryCache.size) : 0,
      totalQueries: this.queryCache.size
    }
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.queryCache.clear()
    console.log('Phoenix auth query cache cleared')
  }
}