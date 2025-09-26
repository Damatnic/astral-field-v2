/**
 * Guardian Security Monitor
 * Real-time security threat detection and response system
 */

import { Request, Response, NextFunction } from 'express'
import { redis, logger } from '../server'
import crypto from 'crypto'

interface SecurityEvent {
  id: string
  type: SecurityEventType
  severity: SecuritySeverity
  ip: string
  userAgent: string
  path: string
  method: string
  userId?: string
  details: any
  timestamp: string
  blocked: boolean
}

enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  COMMAND_INJECTION_ATTEMPT = 'COMMAND_INJECTION_ATTEMPT',
  SUSPICIOUS_USER_AGENT = 'SUSPICIOUS_USER_AGENT',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  INVALID_TOKEN = 'INVALID_TOKEN',
  ACCOUNT_ENUMERATION = 'ACCOUNT_ENUMERATION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  GEO_ANOMALY = 'GEO_ANOMALY',
  CONCURRENT_SESSION_LIMIT = 'CONCURRENT_SESSION_LIMIT',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT'
}

enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export class GuardianSecurityMonitor {
  private static instance: GuardianSecurityMonitor
  private eventBuffer: SecurityEvent[] = []
  private alertThresholds = {
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: 5,
    [SecurityEventType.SQL_INJECTION_ATTEMPT]: 1,
    [SecurityEventType.XSS_ATTEMPT]: 1,
    [SecurityEventType.BRUTE_FORCE_ATTEMPT]: 3,
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: 3
  }

  static getInstance(): GuardianSecurityMonitor {
    if (!GuardianSecurityMonitor.instance) {
      GuardianSecurityMonitor.instance = new GuardianSecurityMonitor()
    }
    return GuardianSecurityMonitor.instance
  }

  /**
   * Guardian Security: Log security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }

    // Store in buffer
    this.eventBuffer.push(securityEvent)
    if (this.eventBuffer.length > 1000) {
      this.eventBuffer.shift() // Remove oldest event
    }

    // Store in Redis for real-time monitoring
    await redis.lpush('security:events', JSON.stringify(securityEvent))
    await redis.ltrim('security:events', 0, 999) // Keep last 1000 events

    // Log to application logger
    logger.warn('Guardian Security Event', securityEvent)

    // Check for alert conditions
    await this.checkAlertConditions(securityEvent)

    // Store in database for long-term analysis
    await this.storeInDatabase(securityEvent)
  }

  /**
   * Guardian Security: Check if alert conditions are met
   */
  private async checkAlertConditions(event: SecurityEvent): Promise<void> {
    const timeWindow = 5 * 60 * 1000 // 5 minutes
    const now = Date.now()
    const windowStart = now - timeWindow

    // Count recent events of the same type from the same IP
    const recentEvents = this.eventBuffer.filter(e => 
      e.type === event.type &&
      e.ip === event.ip &&
      new Date(e.timestamp).getTime() > windowStart
    )

    const threshold = this.alertThresholds[event.type] || 10

    if (recentEvents.length >= threshold) {
      await this.triggerAlert(event, recentEvents.length)
    }

    // Check for critical severity events
    if (event.severity === SecuritySeverity.CRITICAL) {
      await this.triggerCriticalAlert(event)
    }
  }

  /**
   * Guardian Security: Trigger security alert
   */
  private async triggerAlert(event: SecurityEvent, eventCount: number): Promise<void> {
    const alert = {
      id: crypto.randomUUID(),
      type: 'SECURITY_ALERT',
      severity: 'HIGH',
      message: `Multiple ${event.type} events detected`,
      ip: event.ip,
      eventCount,
      timestamp: new Date().toISOString(),
      details: event
    }

    // Store alert
    await redis.lpush('security:alerts', JSON.stringify(alert))
    await redis.ltrim('security:alerts', 0, 99) // Keep last 100 alerts

    // Log critical alert
    logger.error('Guardian Security Alert', alert)

    // Auto-block IP if necessary
    if (eventCount >= (this.alertThresholds[event.type] || 10) * 2) {
      await this.autoBlockIP(event.ip, event.type)
    }
  }

  /**
   * Guardian Security: Trigger critical alert
   */
  private async triggerCriticalAlert(event: SecurityEvent): Promise<void> {
    const alert = {
      id: crypto.randomUUID(),
      type: 'CRITICAL_SECURITY_EVENT',
      severity: 'CRITICAL',
      message: `Critical security event: ${event.type}`,
      timestamp: new Date().toISOString(),
      event
    }

    // Immediate notification
    logger.error('CRITICAL SECURITY EVENT', alert)

    // Store critical alert
    await redis.lpush('security:critical', JSON.stringify(alert))

    // Auto-block for critical events
    await this.autoBlockIP(event.ip, event.type)
  }

  /**
   * Guardian Security: Auto-block IP address
   */
  private async autoBlockIP(ip: string, reason: SecurityEventType): Promise<void> {
    const blockDuration = this.getBlockDuration(reason)
    const blockEntry = {
      ip,
      reason,
      blockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + blockDuration).toISOString()
    }

    // Store in Redis with expiration
    await redis.setex(`security:blocked:${ip}`, Math.floor(blockDuration / 1000), JSON.stringify(blockEntry))

    logger.warn('Guardian Security: IP Auto-blocked', blockEntry)
  }

  /**
   * Guardian Security: Get block duration based on threat type
   */
  private getBlockDuration(eventType: SecurityEventType): number {
    const durations = {
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 24 * 60 * 60 * 1000, // 24 hours
      [SecurityEventType.XSS_ATTEMPT]: 24 * 60 * 60 * 1000, // 24 hours
      [SecurityEventType.BRUTE_FORCE_ATTEMPT]: 60 * 60 * 1000, // 1 hour
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 15 * 60 * 1000, // 15 minutes
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 60 * 60 * 1000 // 1 hour
    }

    return durations[eventType] || 60 * 60 * 1000 // Default 1 hour
  }

  /**
   * Guardian Security: Check if IP is blocked
   */
  async isIPBlocked(ip: string): Promise<boolean> {
    const blocked = await redis.get(`security:blocked:${ip}`)
    return blocked !== null
  }

  /**
   * Guardian Security: Store event in database
   */
  private async storeInDatabase(event: SecurityEvent): Promise<void> {
    try {
      // Store in audit log table
      // This would use your Prisma client
      // await prisma.security_events.create({ data: event })
    } catch (error) {
      logger.error('Failed to store security event in database', error)
    }
  }

  /**
   * Guardian Security: Get security metrics
   */
  async getSecurityMetrics(timeWindow: number = 24 * 60 * 60 * 1000): Promise<any> {
    const now = Date.now()
    const windowStart = now - timeWindow

    const recentEvents = this.eventBuffer.filter(e => 
      new Date(e.timestamp).getTime() > windowStart
    )

    const metrics = {
      totalEvents: recentEvents.length,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      topAttackerIPs: {} as Record<string, number>,
      blockedRequests: recentEvents.filter(e => e.blocked).length,
      criticalEvents: recentEvents.filter(e => e.severity === SecuritySeverity.CRITICAL).length
    }

    // Calculate metrics
    recentEvents.forEach(event => {
      metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1
      metrics.eventsBySeverity[event.severity] = (metrics.eventsBySeverity[event.severity] || 0) + 1
      metrics.topAttackerIPs[event.ip] = (metrics.topAttackerIPs[event.ip] || 0) + 1
    })

    return metrics
  }

  /**
   * Guardian Security: Generate security report
   */
  async generateSecurityReport(): Promise<any> {
    const metrics24h = await this.getSecurityMetrics(24 * 60 * 60 * 1000)
    const metrics7d = await this.getSecurityMetrics(7 * 24 * 60 * 60 * 1000)

    const alerts = await redis.lrange('security:alerts', 0, -1)
    const criticalEvents = await redis.lrange('security:critical', 0, -1)

    return {
      timestamp: new Date().toISOString(),
      summary: {
        last24Hours: metrics24h,
        last7Days: metrics7d
      },
      recentAlerts: alerts.slice(0, 10).map(a => JSON.parse(a)),
      criticalEvents: criticalEvents.slice(0, 5).map(e => JSON.parse(e)),
      recommendations: this.generateRecommendations(metrics24h)
    }
  }

  /**
   * Guardian Security: Generate security recommendations
   */
  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = []

    if (metrics.criticalEvents > 0) {
      recommendations.push('Immediate investigation required for critical security events')
    }

    if (metrics.eventsByType[SecurityEventType.BRUTE_FORCE_ATTEMPT] > 10) {
      recommendations.push('Consider implementing stronger password policies')
    }

    if (metrics.eventsByType[SecurityEventType.RATE_LIMIT_EXCEEDED] > 50) {
      recommendations.push('Review rate limiting configuration')
    }

    if (Object.keys(metrics.topAttackerIPs).length > 20) {
      recommendations.push('Consider implementing geo-blocking for high-risk regions')
    }

    return recommendations
  }
}

/**
 * Guardian Security: Security monitoring middleware
 */
export function securityMonitoringMiddleware() {
  const monitor = GuardianSecurityMonitor.getInstance()

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
    
    // Check if IP is blocked
    if (await monitor.isIPBlocked(ip)) {
      await monitor.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        details: { reason: 'Blocked IP attempted access' },
        blocked: true
      })

      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been temporarily blocked due to suspicious activity'
      })
    }

    // Add monitoring to request
    req.securityMonitor = monitor

    next()
  }
}

/**
 * Guardian Security: Create security event logging function
 */
export function createSecurityLogger(eventType: SecurityEventType, severity: SecuritySeverity) {
  const monitor = GuardianSecurityMonitor.getInstance()

  return async (req: Request, details: any = {}) => {
    await monitor.logSecurityEvent({
      type: eventType,
      severity,
      ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      path: req.path,
      method: req.method,
      userId: (req as any).user?.id,
      details,
      blocked: false
    })
  }
}

export { SecurityEventType, SecuritySeverity }
export default GuardianSecurityMonitor