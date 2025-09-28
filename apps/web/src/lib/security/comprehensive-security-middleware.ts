// Guardian Security: Comprehensive Security Middleware
// Combines all security measures into a unified, enterprise-grade protection system

import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from './rate-limit-middleware'
import { guardianSecurityHeaders, guardianSecurityHeadersDev } from './security-headers'
import { InputSanitizer } from './input-sanitization'
import { guardianThreatDetection, threatDetectionMiddleware } from './threat-detection'
import { guardianEncryption } from './encryption-service'
import { guardianAuditLogger, SecurityEventType } from './audit-logger'

export interface SecurityMiddlewareConfig {
  enableThreatDetection: boolean
  enableInputSanitization: boolean
  enableRateLimit: boolean
  enableSecurityHeaders: boolean
  enableAuditLogging: boolean
  enableEncryption: boolean
  customRules?: {
    blockPatterns?: RegExp[]
    allowedMethods?: string[]
    allowedPaths?: string[]
    requireAuth?: string[]
  }
  environment: 'development' | 'production'
}

export interface SecurityContext {
  userId?: string
  sessionId?: string
  ip: string
  userAgent: string
  method: string
  path: string
  headers: Record<string, string>
  body?: any
  query?: Record<string, string>
  location?: {
    country?: string
    region?: string
    city?: string
  }
}

export interface SecurityResponse {
  allowed: boolean
  blocked: boolean
  riskScore: number
  threats: string[]
  actions: string[]
  recommendations: string[]
  sanitizedData?: any
  headers: Record<string, string>
}

export class GuardianSecurityMiddleware {
  private config: SecurityMiddlewareConfig
  private blockedRequests = new Map<string, number>()
  private securityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    threatsDetected: 0,
    sanitizedInputs: 0,
    rateLimitHits: 0,
    lastReset: Date.now()
  }

  constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
    this.config = {
      enableThreatDetection: true,
      enableInputSanitization: true,
      enableRateLimit: true,
      enableSecurityHeaders: true,
      enableAuditLogging: true,
      enableEncryption: true,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      ...config
    }

    console.log('Guardian Security Middleware initialized', {
      environment: this.config.environment,
      features: this.getEnabledFeatures()
    })
  }

  /**
   * Main security middleware handler
   */
  async processRequest(request: NextRequest): Promise<SecurityResponse> {
    const startTime = Date.now()
    this.securityMetrics.totalRequests++

    try {
      // Extract security context
      const context = await this.extractSecurityContext(request)
      
      // Initialize response
      const response: SecurityResponse = {
        allowed: true,
        blocked: false,
        riskScore: 0,
        threats: [],
        actions: [],
        recommendations: [],
        headers: {}
      }

      // Step 1: Apply security headers
      if (this.config.enableSecurityHeaders) {
        response.headers = this.applySecurityHeaders()
      }

      // Step 2: Check custom block rules
      const customRuleResult = this.checkCustomRules(context)
      if (!customRuleResult.allowed) {
        response.blocked = true
        response.allowed = false
        response.threats.push('Custom security rule violation')
        response.actions.push('Request blocked by custom rule')
        this.securityMetrics.blockedRequests++
        return response
      }

      // Step 3: Threat detection
      if (this.config.enableThreatDetection) {
        const threatResult = await threatDetectionMiddleware(context)
        response.riskScore = Math.max(response.riskScore, threatResult.assessment.riskScore)
        response.threats.push(...threatResult.assessment.threats.map(t => t.description))
        response.actions.push(...threatResult.actions)
        response.recommendations.push(...threatResult.assessment.recommendations)
        
        if (!threatResult.allowed) {
          response.blocked = true
          response.allowed = false
          this.securityMetrics.threatsDetected++
          this.securityMetrics.blockedRequests++
          return response
        }
      }

      // Step 4: Rate limiting
      if (this.config.enableRateLimit) {
        const rateLimitResult = await this.checkRateLimit(request, context)
        if (!rateLimitResult.allowed) {
          response.blocked = true
          response.allowed = false
          response.threats.push('Rate limit exceeded')
          response.actions.push('Request rate limited')
          this.securityMetrics.rateLimitHits++
          this.securityMetrics.blockedRequests++
          return response
        }
      }

      // Step 5: Input sanitization
      if (this.config.enableInputSanitization && context.body) {
        try {
          const sanitizedData = this.sanitizeInput(context.body)
          response.sanitizedData = sanitizedData
          response.actions.push('Input sanitized')
          this.securityMetrics.sanitizedInputs++
        } catch (error) {
          response.blocked = true
          response.allowed = false
          response.threats.push('Malicious input detected')
          response.actions.push('Request blocked due to malicious input')
          this.securityMetrics.blockedRequests++
          return response
        }
      }

      // Step 6: Audit logging
      if (this.config.enableAuditLogging && response.riskScore > 0.3) {
        await this.logSecurityEvent(context, response)
      }

      // Calculate processing time
      const processingTime = Date.now() - startTime
      response.actions.push(`Processed in ${processingTime}ms`)

      return response

    } catch (error) {
      console.error('Security middleware error:', error)
      
      // Fail securely - block request on error
      this.securityMetrics.blockedRequests++
      return {
        allowed: false,
        blocked: true,
        riskScore: 1.0,
        threats: ['Security middleware error'],
        actions: ['Request blocked due to security error'],
        recommendations: ['Review security logs'],
        headers: this.applySecurityHeaders()
      }
    }
  }

  /**
   * Extract security context from request
   */
  private async extractSecurityContext(request: NextRequest): Promise<SecurityContext> {
    const url = new URL(request.url)
    
    // Extract IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              request.headers.get('cf-connecting-ip') ||
              request.ip ||
              'unknown'

    // Extract location from headers (Cloudflare or similar)
    const location = {
      country: request.headers.get('cf-ipcountry') || request.headers.get('x-country'),
      region: request.headers.get('cf-region') || request.headers.get('x-region'),
      city: request.headers.get('cf-city') || request.headers.get('x-city')
    }

    // Extract body for POST requests
    let body = null
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      try {
        const text = await request.text()
        if (text) {
          body = JSON.parse(text)
        }
      } catch {
        // Non-JSON body or empty body
      }
    }

    // Convert headers to object
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    return {
      ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      method: request.method,
      path: url.pathname,
      headers,
      body,
      query: Object.fromEntries(url.searchParams.entries()),
      location: location.country ? location : undefined
    }
  }

  /**
   * Apply security headers
   */
  private applySecurityHeaders(): Record<string, string> {
    const isProduction = this.config.environment === 'production'
    const headerProvider = isProduction ? guardianSecurityHeaders : guardianSecurityHeadersDev
    return headerProvider.generateHeaders(isProduction)
  }

  /**
   * Check custom security rules
   */
  private checkCustomRules(context: SecurityContext): { allowed: boolean; reason?: string } {
    const rules = this.config.customRules

    if (!rules) {
      return { allowed: true }
    }

    // Check blocked patterns
    if (rules.blockPatterns) {
      const searchText = `${context.path} ${JSON.stringify(context.body || {})} ${JSON.stringify(context.query || {})}`
      for (const pattern of rules.blockPatterns) {
        if (pattern.test(searchText)) {
          return { allowed: false, reason: 'Blocked pattern detected' }
        }
      }
    }

    // Check allowed methods
    if (rules.allowedMethods && !rules.allowedMethods.includes(context.method)) {
      return { allowed: false, reason: 'Method not allowed' }
    }

    // Check allowed paths
    if (rules.allowedPaths && !rules.allowedPaths.some(path => context.path.startsWith(path))) {
      return { allowed: false, reason: 'Path not allowed' }
    }

    return { allowed: true }
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(request: NextRequest, context: SecurityContext): Promise<{ allowed: boolean }> {
    try {
      // Use existing rate limit middleware
      const rateLimitMiddleware = withRateLimit({
        ruleKey: this.getRuleLimitKey(context.path),
        customIdentifier: () => context.ip
      })

      // Create a dummy handler that always succeeds
      const dummyHandler = async () => NextResponse.next()
      
      const response = await rateLimitMiddleware(request, dummyHandler)
      
      // If response status is 429, rate limit was exceeded
      return { allowed: response.status !== 429 }
    } catch {
      // If rate limiting fails, allow the request but log the error
      return { allowed: true }
    }
  }

  /**
   * Get rate limit rule key based on path
   */
  private getRuleLimitKey(path: string): string {
    if (path.includes('/api/auth/')) return 'auth:strict'
    if (path.includes('/api/admin/')) return 'admin:strict'
    if (path.startsWith('/api/')) return 'api:general'
    return 'global'
  }

  /**
   * Sanitize input data
   */
  private sanitizeInput(data: any): any {
    if (!data) return data

    if (typeof data === 'string') {
      return InputSanitizer.sanitizeInput(data, {
        allowHtml: false,
        maxLength: 10000,
        allowSpecialChars: true,
        strictMode: false
      })
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item))
    }

    if (typeof data === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = InputSanitizer.sanitizeInput(key, {
          allowHtml: false,
          maxLength: 100,
          allowSpecialChars: false,
          strictMode: true
        })
        sanitized[sanitizedKey] = this.sanitizeInput(value)
      }
      return sanitized
    }

    return data
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(context: SecurityContext, response: SecurityResponse): Promise<void> {
    if (!this.config.enableAuditLogging) return

    try {
      await guardianAuditLogger.logSecurityEvent(
        SecurityEventType.SECURITY_SCAN,
        context.userId,
        {
          ip: context.ip,
          userAgent: context.userAgent
        },
        {
          description: 'Security middleware scan completed',
          riskScore: response.riskScore,
          context: {
            path: context.path,
            method: context.method,
            threats: response.threats,
            actions: response.actions,
            blocked: response.blocked
          }
        }
      )
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Get enabled features list
   */
  private getEnabledFeatures(): string[] {
    const features: string[] = []
    if (this.config.enableThreatDetection) features.push('threat-detection')
    if (this.config.enableInputSanitization) features.push('input-sanitization')
    if (this.config.enableRateLimit) features.push('rate-limiting')
    if (this.config.enableSecurityHeaders) features.push('security-headers')
    if (this.config.enableAuditLogging) features.push('audit-logging')
    if (this.config.enableEncryption) features.push('encryption')
    return features
  }

  /**
   * Get security metrics
   */
  getMetrics(): {
    totalRequests: number
    blockedRequests: number
    threatsDetected: number
    sanitizedInputs: number
    rateLimitHits: number
    blockRate: number
    threatRate: number
    uptime: number
  } {
    const now = Date.now()
    const uptime = now - this.securityMetrics.lastReset

    return {
      ...this.securityMetrics,
      blockRate: this.securityMetrics.totalRequests > 0 
        ? this.securityMetrics.blockedRequests / this.securityMetrics.totalRequests 
        : 0,
      threatRate: this.securityMetrics.totalRequests > 0
        ? this.securityMetrics.threatsDetected / this.securityMetrics.totalRequests
        : 0,
      uptime: uptime
    }
  }

  /**
   * Reset security metrics
   */
  resetMetrics(): void {
    this.securityMetrics = {
      totalRequests: 0,
      blockedRequests: 0,
      threatsDetected: 0,
      sanitizedInputs: 0,
      rateLimitHits: 0,
      lastReset: Date.now()
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SecurityMiddlewareConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('Guardian Security Middleware configuration updated')
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityMiddlewareConfig {
    return { ...this.config }
  }

  /**
   * Emergency security lockdown
   */
  emergencyLockdown(reason: string, durationMs: number = 60 * 60 * 1000): void {
    console.error(`EMERGENCY SECURITY LOCKDOWN ACTIVATED: ${reason}`)
    
    // Block all requests temporarily
    this.config.customRules = {
      ...this.config.customRules,
      blockPatterns: [/.*/] // Block everything
    }

    // Schedule lockdown removal
    setTimeout(() => {
      console.log('Emergency lockdown lifted')
      this.config.customRules = {
        ...this.config.customRules,
        blockPatterns: []
      }
    }, durationMs)

    // Log the lockdown
    guardianAuditLogger.logSecurityEvent(
      SecurityEventType.EMERGENCY_LOCKDOWN,
      undefined,
      { ip: 'system', userAgent: 'system' },
      {
        description: `Emergency lockdown activated: ${reason}`,
        riskScore: 1.0,
        context: { reason, duration: durationMs }
      }
    )
  }

  /**
   * Security health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    checks: Record<string, boolean>
    recommendations: string[]
  }> {
    const checks = {
      threatDetection: this.config.enableThreatDetection,
      inputSanitization: this.config.enableInputSanitization,
      rateLimit: this.config.enableRateLimit,
      securityHeaders: this.config.enableSecurityHeaders,
      auditLogging: this.config.enableAuditLogging,
      encryption: guardianEncryption.getServiceStatus().initialized
    }

    const enabledCount = Object.values(checks).filter(Boolean).length
    const totalCount = Object.keys(checks).length

    let status: 'healthy' | 'warning' | 'critical'
    const recommendations: string[] = []

    if (enabledCount === totalCount) {
      status = 'healthy'
    } else if (enabledCount >= totalCount * 0.8) {
      status = 'warning'
      recommendations.push('Some security features are disabled')
    } else {
      status = 'critical'
      recommendations.push('Critical security features are disabled')
      recommendations.push('Immediate security review required')
    }

    // Check metrics for anomalies
    const metrics = this.getMetrics()
    if (metrics.blockRate > 0.1) {
      status = metrics.blockRate > 0.5 ? 'critical' : 'warning'
      recommendations.push('High block rate detected - possible attack in progress')
    }

    if (metrics.threatRate > 0.05) {
      status = 'warning'
      recommendations.push('Elevated threat detection rate')
    }

    return { status, checks, recommendations }
  }
}

// Global security middleware instance
export const guardianSecurityMiddleware = new GuardianSecurityMiddleware()

// Helper function for Next.js middleware integration
export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
  const result = await guardianSecurityMiddleware.processRequest(request)
  
  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'SECURITY_BLOCKED',
        message: 'Request blocked by security middleware',
        threats: result.threats,
        riskScore: result.riskScore
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...result.headers
        }
      }
    )
  }

  // Return success response with security headers
  const response = NextResponse.next()
  
  Object.entries(result.headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export default guardianSecurityMiddleware