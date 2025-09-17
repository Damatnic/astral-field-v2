/**
 * Security Monitoring API Endpoint
 * Provides security metrics, threat analysis, and security configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiSecurity } from '@/lib/security/api-security-enhanced'
import { authMiddleware, Permission } from '@/lib/security/auth-middleware'
import { securityMonitor, SecurityEventType, SecuritySeverity } from '@/lib/security/security-monitor'
import { dataProtection } from '@/lib/security/data-protection'
import { SecurityConfigHelpers } from '@/lib/security-config'
import { logger } from '@/lib/logger'
import { monitoring } from '@/lib/monitoring'

// GET /api/system/security - Get security metrics and status
export async function GET(req?: NextRequest) {
  try {
    // Enhanced API security

  const securityCheck = await apiSecurity.secure(request, {
    requireAuth: true,
    rateLimit: 'admin',
    allowedMethods: ['GET'],
    enableThreatDetection: true,
    requireSecureTransport: true,
    sanitizeInput: true


  if (!securityCheck.success) {
    return securityCheck.response!

  // Enhanced authentication and authorization for admin access
  const authResult = await authMiddleware.authenticate(request, {
    requireAuth: true,
    requiredPermissions: [Permission.ACCESS_ADMIN_PANEL, Permission.MANAGE_SECURITY],
    validateSession: true,
    requireActiveUser: true


         });

  if (!authResult.success) {
    // Log unauthorized admin access attempt
    await securityMonitor.recordEvent(
      SecurityEventType.UNAUTHORIZED_ACCESS,
      SecuritySeverity.HIGH,

        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });


        userId: securityCheck.user?.sub || 'unknown' 

        endpoint: '/api/system/security' 

        method: 'GET'

      },

        description: 'Unauthorized attempt to access security dashboard',
        threat: 'Administrative privilege escalation attempt',
        evidence: { endpoint: '/api/system/security'  

        recommendations: ['Review user permissions', 'Check for compromised accounts']
      },

        requestId: request.headers.get('x-request-id') || undefined,
        tags: ['admin-access', 'security-dashboard']

    );
    
    return authResult.response!;

  const { user } = authResult;

  try { // Get enhanced security dashboard data
    const securityDashboard = await securityMonitor.getSecurityDashboard()
    
    // Get API security statistics
    const apiSecurityStats = apiSecurity.getSecurityStats()
    
    // Get authentication statistics
    const authStats = authMiddleware.getAuthStats()
    
    // Get data protection statistics
    const dataProtectionStats = dataProtection.getProtectionStats()
    
    // Get monitoring statistics
    const monitoringStats = securityMonitor.getMonitoringStats()
    
    // Get system health for security context
    const systemHealth = monitoring.getHealthStatus()
    
    const response = {
      timestamp: new Date().toISOString(),
      status: securityDashboard.systemHealth,
      overview: {

        totalEvents: securityDashboard.recentEvents.length,
        criticalEvents: securityDashboard.severityCounts.critical || 0,
        highEvents: securityDashboard.severityCounts.high || 0,
        mediumEvents: securityDashboard.severityCounts.medium || 0,
        lowEvents: securityDashboard.severityCounts.low || 0,
        topThreatIPs: securityDashboard.topThreats

      statistics: {
        api: {

          ...apiSecurityStats,
          totalThreatsBlocked: apiSecurityStats.blockedIPs 

          suspiciousIPs: apiSecurityStats.suspiciousIPs

        },
        authentication: { activeSessions: authStats.activeSessions,
          totalUsers: authStats.totalUsers

        dataProtection: {

          encryptionConfigured: dataProtectionStats.encryptionConfigured,
          piiPatterns: dataProtectionStats.piiPatterns 

          sensitiveFields: dataProtectionStats.sensitiveFields

        },
        monitoring: { enabled: monitoringStats.enabled,
          eventsInBuffer: monitoringStats.eventsInBuffer,
          anomalyPatterns: monitoringStats.anomalyPatterns,
          alertThresholds: monitoringStats.alertThresholds

      recentEvents: securityDashboard.recentEvents,
      eventCounts: securityDashboard.eventCounts,
      configuration: {
        rateLimiting: {

          enabled: true,
          ddosProtectionEnabled: true 

          adaptiveThresholds: true

        },
        contentSecurity: { cspEnabled: true,
          xssProtectionEnabled: true,
          frameOptionsEnabled: true,
          hstsEnabled: process.env.NODE_ENV === 'production'

        threatDetection: {

          sqlInjectionDetection: true,
          xssDetection: true,
          pathTraversalDetection: true,
          commandInjectionDetection: true,
          autoBlockEnabled: true 

          anomalyDetection: true

        },
        dataProtection: { inputSanitization: true,
          outputEncoding: true,
          piiDetection: true,
          secureLogging: true

      recommendations: generateEnhancedSecurityRecommendations(securityDashboard, systemHealth)

    logger.info('Security dashboard accessed', 'SecurityAPI', 
      dataProtection.sanitizeForLogging({
        userId: user.sub,
        securityStatus: response.status,
        totalEvents: response.overview.totalEvents,
        requestId: request.headers.get('x-request-id')


    return NextResponse.json({ success: true });

      data: response

    }, { headers: {

        'Content-Security-Policy': SecurityConfigHelpers.getCspHeader()   } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error('Unknown error')
    logger.error('Failed to get security metrics', errorInstance, 'SecurityAPI', {
      userId: user.sub


    return NextResponse.json(
      { error: 'Failed to retrieve security metrics' },

        status: 500,
        headers: { 'Content-Security-Policy': SecurityConfigHelpers.getCspHeader(),




// POST /api/system/security - Security actions (unblock IPs, update config)
export async function POST(req?: NextRequest) {
  try {
    const securityCheck = await apiSecurity.secure(request, {
    requireAuth: true,
    rateLimit: 'admin',
    allowedMethods: ['POST'],
    enableThreatDetection: true,
    validateSchema: require('zod').object({

      action: require('zod').enum(['unblock_ip', 'update_config', 'clear_logs']),
      data: require('zod').object({ 

).passthrough().optional()


  if (!securityCheck.success) {
    return securityCheck.response!

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });



  const { user, data } = securityCheck

  try { const { action, data: actionData  

= data
    let result: any = {

    switch (action) { case 'unblock_ip':
        if (actionData?.ip) {
          const wasBlocked = apiSecurity.unblockIP(actionData.ip)
          result = { 
            success: wasBlocked, 
            message: wasBlocked ? 'IP unblocked successfully' : 'IP was not blocked' 


          logger.info('IP unblocked by admin', 'SecurityAPI', {
            adminUserId: user.sub 

            ip: actionData.ip 

            wasBlocked

        } else { throw new Error('IP address required for unblock action')

        break

      case 'update_config':
        // In production, this would update security configuration in database
        result = { 
          success: true, 
          message: 'Security configuration updated (feature not implemented)' 


        logger.info('Security config update attempted', 'SecurityAPI', {
          adminUserId: user.sub,
          configChanges: actionData


        break

      case 'clear_logs':
        // In production, this would clear old security logs
        result = { 
          success: true, 
          message: 'Security logs cleared (feature not implemented)' 


        logger.info('Security logs cleared by admin', 'SecurityAPI', {
          adminUserId: user.sub


        break

      default: throw new Error('Invalid action specified')


    return NextResponse.json({ success: true });

      data: result

    , {
      headers: {

        'Content-Security-Policy': SecurityConfigHelpers.getCspHeader()  }
    } catch (error) { const errorInstance = error instanceof Error ? error : new Error('Unknown error')
    logger.error('Security action failed', errorInstance, 'SecurityAPI', {
      userId: user.sub,
      action: data?.action


    return NextResponse.json({ success: true });
          'Content-Security-Policy': SecurityConfigHelpers.getCspHeader() }
/**
 * Get recent security events (mock implementation)
 */
async function getRecentSecurityEvents(): Promise<Array<{
  timestamp: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  ip?: string
  blocked: boolean

}>> { // In production, this would query the security events database
  return [

      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      type: 'rate_limit_exceeded',
      severity: 'medium',
      description: 'Multiple rate limit violations from IP',
      ip: '192.168.1.100',
      blocked: false

      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      type: 'sql_injection_attempt',
      severity: 'high',
      description: 'SQL injection pattern detected in request',
      ip: '10.0.0.5' 

      blocked: true

    },

      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: 'ddos_protection_activated',
      severity: 'high',
      description: 'DDoS protection triggered for high request volume',
      blocked: true


  ]

/**
 * Get security metrics over time (mock implementation)
 */
async function getSecurityMetrics(): Promise<{ requestsBlocked: Array<{ timestamp: string; count: number  

>
  threatsByType: Record<string, number>
  ipReputationDistribution: Record<string, number>
}> { const now = Date.now()
  const hourlyBlocks = []
  
  // Generate mock hourly data for last 24 hours
  for (let i = 23; i >= 0; i--) {
    hourlyBlocks.push({
      timestamp: new Date(now - i * 60 * 60 * 1000).toISOString(),
      count: Math.floor(Math.random() * 20)



  return {
    requestsBlocked: hourlyBlocks,
    threatsByType: {

      'sql-injection': 15,
      'xss-attempt': 8,
      'rate-limit': 45,
      'ddos': 3,
      'path-traversal': 5 }
      'command-injection': 2
    },
    ipReputationDistribution: { 'trusted': 85,
      'suspicious': 12,
      'blocked': 3



/**
 * Analyze threat patterns (mock implementation)
 */
async function analyzeThreatPatterns(): Promise<{
  topThreats: Array<{ type: string; count: number; trend: 'increasing' | 'decreasing' | 'stable'  

>
  geographicDistribution: Array<{ country: string; threatCount: number }>
  timePatterns: Array<{ hour: number; threatCount: number  

>
}> { return {
    topThreats: [

      { type: 'Rate Limiting', count: 45, trend: 'increasing'  

      { type: 'SQL Injection', count: 15, trend: 'stable' },
      { type: 'XSS Attempts', count: 8, trend: 'decreasing'  

      { type: 'Path Traversal', count: 5, trend: 'stable' },
      { type: 'DDoS Attempts', count: 3, trend: 'decreasing' ,
] }
    geographicDistribution: [

      { country: 'Unknown', threatCount: 35 },
      { country: 'China', threatCount: 18  

      { country: 'Russia', threatCount: 12 },
      { country: 'United States', threatCount: 8  

      { country: 'India', threatCount: 6 

    ],
    timePatterns: Array.from({ length: 24 , (_, hour) => ({
      hour }
      threatCount: Math.floor(Math.random() * 10) + (hour >= 8 && hour <= 20 ? 5 : 0) // More threats during business hours

    }))


/**
 * Determine overall security status
 */
function determineSecurityStatus(
  securityStats: ReturnType<typeof apiSecurity.getSecurityStats>,
  systemHealth: ReturnType<typeof monitoring.getHealthStatus>
): 'secure' | 'monitoring' | 'at-risk' | 'critical' { if (securityStats.blockedIPs > 50 || systemHealth.status === 'unhealthy') {
    return 'critical'


  if (securityStats.blockedIPs > 20 || securityStats.suspiciousIPs > 100) {
    return 'at-risk'

  if (securityStats.suspiciousIPs > 10 || systemHealth.status === 'degraded') {
    return 'monitoring'

  return 'secure'

/**
 * Generate security recommendations
 */
function generateSecurityRecommendations(
  securityStats: ReturnType<typeof apiSecurity.getSecurityStats>,
  systemHealth: ReturnType<typeof monitoring.getHealthStatus>
): string[] {
  const recommendations: string[] = []
  
  if (securityStats.blockedIPs > 10) {
    recommendations.push('High number of blocked IPs detected - consider reviewing firewall rules')


  if (securityStats.suspiciousIPs > 50) {
    recommendations.push('Many suspicious IPs detected - consider enabling stricter rate limiting')

  if (systemHealth.status !== 'healthy') {
    recommendations.push('System performance issues may indicate security incidents - investigate logs')

  if (systemHealth.metrics.errorRate > 5) {
    recommendations.push('High error rate may indicate ongoing attacks - enable enhanced monitoring')

  if (recommendations.length === 0) {
    recommendations.push('Security posture is strong - maintain current monitoring practices')

  return recommendations

/**
 * Generate enhanced security recommendations based on security dashboard data
 */
function generateEnhancedSecurityRecommendations(

  securityDashboard: any 

  systemHealth: any
): string[] {
  const recommendations: string[] = []
  
  // Critical events analysis
  const criticalEvents = securityDashboard.severityCounts.critical || 0
  if (criticalEvents > 0) {

    recommendations.push(`${criticalEvents} critical security event(s) detected - immediate investigation required`)

  // High event volume analysis
  const totalEvents = securityDashboard.recentEvents.length
  if (totalEvents > 100) {
    recommendations.push('High security event volume detected - consider reviewing threat detection thresholds')

  // Top threats analysis
  if (securityDashboard.topThreats.length > 5) {
    recommendations.push('Multiple threat sources identified - consider implementing geographic restrictions')

  // System health correlation
  if (systemHealth.status === 'unhealthy' && totalEvents > 50) {
    recommendations.push('System performance issues correlate with security events - possible ongoing attack')

  // Event type analysis
  const eventTypes = Object.keys(securityDashboard.eventCounts)
  if (eventTypes.includes('sql_injection_attempt')) {
    recommendations.push('SQL injection attempts detected - ensure database security measures are active')

  if (eventTypes.includes('ddos_detected')) {
    recommendations.push('DDoS activity detected - verify traffic shaping and rate limiting effectiveness')

  if (eventTypes.includes('auth_multiple_failures')) {
    recommendations.push('Multiple authentication failures - consider implementing account lockout policies')

  // Positive security posture
  if (recommendations.length === 0) {
    recommendations.push('Security posture is strong - continue monitoring and maintain current practices')
    recommendations.push('Consider periodic security assessments to identify potential improvements')

  return recommendations
