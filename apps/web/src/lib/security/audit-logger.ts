// Guardian Security: Comprehensive Audit Logging & Intrusion Detection System
// Implements SIEM-compatible logging, threat detection, and security event correlation

export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGIN_BLOCKED = 'login_blocked',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  SESSION_TERMINATED = 'session_terminated',
  
  // Authorization Events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  
  // MFA Events
  MFA_SETUP = 'mfa_setup',
  MFA_SUCCESS = 'mfa_success',
  MFA_FAILURE = 'mfa_failure',
  MFA_DISABLED = 'mfa_disabled',
  BACKUP_CODE_USED = 'backup_code_used',
  
  // Security Events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  ACCOUNT_LOCKOUT = 'account_lockout',
  PASSWORD_CHANGED = 'password_changed',
  EMAIL_CHANGED = 'email_changed',
  
  // System Events
  SECURITY_ALERT = 'security_alert',
  INTRUSION_DETECTED = 'intrusion_detected',
  MALWARE_DETECTED = 'malware_detected',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  
  // Administrative Events
  USER_CREATED = 'user_created',
  USER_DELETED = 'user_deleted',
  ROLE_CHANGED = 'role_changed',
  PERMISSIONS_MODIFIED = 'permissions_modified',
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  
  // Registration Events
  REGISTRATION_SUCCESS = 'REGISTRATION_SUCCESS',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  
  // Security Scanning
  SECURITY_SCAN = 'SECURITY_SCAN',
  THREAT_DETECTED = 'THREAT_DETECTED',
  EMERGENCY_LOCKDOWN = 'EMERGENCY_LOCKDOWN'
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityEvent {
  id: string
  timestamp: string
  eventType: SecurityEventType
  severity: SeverityLevel
  userId?: string
  sessionId?: string
  source: {
    ip: string
    userAgent: string
    location?: {
      country?: string
      region?: string
      city?: string
    }
    deviceFingerprint?: string
  }
  target?: {
    resource: string
    resourceId?: string
    action: string
  }
  details: {
    description: string
    riskScore: number
    context: Record<string, any>
    metadata: Record<string, any>
  }
  correlation: {
    incidentId?: string
    relatedEvents: string[]
    threatCategory?: string
  }
  compliance: {
    gdpr: boolean
    pci: boolean
    soc2: boolean
    hipaa: boolean
  }
}

export interface ThreatPattern {
  name: string
  description: string
  indicators: Array<{
    field: string
    operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt'
    value: any
  }>
  severity: SeverityLevel
  action: 'log' | 'alert' | 'block' | 'escalate'
  cooldown: number // Minimum time between alerts for this pattern
}

export interface SecurityIncident {
  id: string
  title: string
  description: string
  severity: SeverityLevel
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  events: string[]
  firstSeen: string
  lastSeen: string
  affectedUsers: string[]
  threatCategory: string
  response: {
    actions: string[]
    assignee?: string
    notes: string[]
  }
}

export class GuardianAuditLogger {
  private events: Map<string, SecurityEvent> = new Map()
  private incidents: Map<string, SecurityIncident> = new Map()
  private threatPatterns: ThreatPattern[] = []
  private patternCooldowns: Map<string, number> = new Map()
  
  constructor() {
    this.initializeThreatPatterns()
    
    // Cleanup old events every hour
    setInterval(() => this.cleanupOldEvents(), 60 * 60 * 1000)
  }

  /**
   * Log a security event with automatic threat detection
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    userId: string | undefined,
    source: SecurityEvent['source'],
    details: Partial<SecurityEvent['details']>,
    target?: SecurityEvent['target'],
    sessionId?: string
  ): Promise<string> {
    const eventId = this.generateEventId()
    const timestamp = new Date().toISOString()
    
    // Determine severity based on event type
    const severity = this.determineSeverity(eventType, details.riskScore || 0)
    
    const event: SecurityEvent = {
      id: eventId,
      timestamp,
      eventType,
      severity,
      userId,
      sessionId,
      source,
      target,
      details: {
        description: details.description || this.getDefaultDescription(eventType),
        riskScore: details.riskScore || 0,
        context: details.context || {},
        metadata: details.metadata || {}
      },
      correlation: {
        relatedEvents: [],
        threatCategory: this.categorizeThreat(eventType)
      },
      compliance: this.determineComplianceFlags(eventType)
    }

    // Store event
    this.events.set(eventId, event)

    // Perform threat detection and correlation
    await this.analyzeEvent(event)

    // Output structured log for SIEM integration
    this.outputStructuredLog(event)

    return eventId
  }

  /**
   * Analyze event for threats and correlate with existing events
   */
  private async analyzeEvent(event: SecurityEvent): Promise<void> {
    // Check against threat patterns
    for (const pattern of this.threatPatterns) {
      if (this.matchesThreatPattern(event, pattern)) {
        await this.handleThreatPatternMatch(event, pattern)
      }
    }

    // Correlate with recent events
    const relatedEvents = this.findRelatedEvents(event)
    if (relatedEvents.length > 0) {
      event.correlation.relatedEvents = relatedEvents.map(e => e.id)
      
      // Check if this creates or updates an incident
      await this.handleEventCorrelation(event, relatedEvents)
    }
  }

  /**
   * Check if event matches a threat pattern
   */
  private matchesThreatPattern(event: SecurityEvent, pattern: ThreatPattern): boolean {
    return pattern.indicators.every(indicator => {
      const fieldValue = this.getFieldValue(event, indicator.field)
      
      switch (indicator.operator) {
        case 'equals':
          return fieldValue === indicator.value
        case 'contains':
          return String(fieldValue).includes(String(indicator.value))
        case 'regex':
          return new RegExp(indicator.value).test(String(fieldValue))
        case 'gt':
          return Number(fieldValue) > Number(indicator.value)
        case 'lt':
          return Number(fieldValue) < Number(indicator.value)
        default:
          return false
      }
    })
  }

  /**
   * Handle threat pattern match
   */
  private async handleThreatPatternMatch(event: SecurityEvent, pattern: ThreatPattern): Promise<void> {
    const patternKey = `${pattern.name}_${event.userId || event.source.ip}`
    const now = Date.now()
    const lastAlert = this.patternCooldowns.get(patternKey) || 0
    
    // Check cooldown
    if (now - lastAlert < pattern.cooldown) {
      return
    }
    
    this.patternCooldowns.set(patternKey, now)
    
    console.warn(`Threat pattern detected: ${pattern.name}`, {
      eventId: event.id,
      pattern: pattern.name,
      severity: pattern.severity,
      userId: event.userId,
      ip: event.source.ip
    })
    
    switch (pattern.action) {
      case 'alert':
        await this.createSecurityAlert(event, pattern)
        break
      case 'block':
        await this.blockSource(event, pattern)
        break
      case 'escalate':
        await this.escalateIncident(event, pattern)
        break
    }
  }

  /**
   * Find events related to the current event
   */
  private findRelatedEvents(event: SecurityEvent, timeWindow: number = 5 * 60 * 1000): SecurityEvent[] {
    const eventTime = new Date(event.timestamp).getTime()
    const related: SecurityEvent[] = []
    
    for (const otherEvent of this.events.values()) {
      if (otherEvent.id === event.id) continue
      
      const otherTime = new Date(otherEvent.timestamp).getTime()
      const timeDiff = Math.abs(eventTime - otherTime)
      
      if (timeDiff <= timeWindow) {
        // Check for correlation criteria
        const isRelated = 
          // Same user
          (event.userId && event.userId === otherEvent.userId) ||
          // Same IP
          (event.source.ip === otherEvent.source.ip) ||
          // Same session
          (event.sessionId && event.sessionId === otherEvent.sessionId) ||
          // Related event types
          this.areEventTypesRelated(event.eventType, otherEvent.eventType)
        
        if (isRelated) {
          related.push(otherEvent)
        }
      }
    }
    
    return related.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  /**
   * Handle event correlation and incident management
   */
  private async handleEventCorrelation(event: SecurityEvent, relatedEvents: SecurityEvent[]): Promise<void> {
    // Look for existing incident
    let incident = this.findExistingIncident(event, relatedEvents)
    
    if (!incident) {
      // Create new incident if criteria met
      if (this.shouldCreateIncident(event, relatedEvents)) {
        incident = await this.createIncident(event, relatedEvents)
      }
    } else {
      // Update existing incident
      incident.events.push(event.id)
      incident.lastSeen = event.timestamp
      
      if (!incident.affectedUsers.includes(event.userId || '')) {
        incident.affectedUsers.push(event.userId || '')
      }
    }
    
    if (incident) {
      event.correlation.incidentId = incident.id
    }
  }

  /**
   * Create security incident
   */
  private async createIncident(primaryEvent: SecurityEvent, relatedEvents: SecurityEvent[]): Promise<SecurityIncident> {
    const incidentId = this.generateIncidentId()
    
    const incident: SecurityIncident = {
      id: incidentId,
      title: this.generateIncidentTitle(primaryEvent),
      description: this.generateIncidentDescription(primaryEvent, relatedEvents),
      severity: this.calculateIncidentSeverity(primaryEvent, relatedEvents),
      status: 'open',
      events: [primaryEvent.id, ...relatedEvents.map(e => e.id)],
      firstSeen: relatedEvents.length > 0 ? relatedEvents[0].timestamp : primaryEvent.timestamp,
      lastSeen: primaryEvent.timestamp,
      affectedUsers: Array.from(new Set([primaryEvent.userId, ...relatedEvents.map(e => e.userId)].filter(Boolean))) as string[],
      threatCategory: primaryEvent.correlation.threatCategory || 'unknown',
      response: {
        actions: [],
        notes: []
      }
    }
    
    this.incidents.set(incidentId, incident)
    
    console.error(`Security incident created: ${incident.title}`, {
      incidentId,
      severity: incident.severity,
      eventsCount: incident.events.length,
      affectedUsers: incident.affectedUsers.length
    })
    
    return incident
  }

  /**
   * Initialize built-in threat patterns
   */
  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      // Brute force detection
      {
        name: 'brute_force_login',
        description: 'Multiple failed login attempts',
        indicators: [
          { field: 'eventType', operator: 'equals', value: SecurityEventType.LOGIN_FAILURE },
        ],
        severity: SeverityLevel.HIGH,
        action: 'alert',
        cooldown: 5 * 60 * 1000 // 5 minutes
      },
      
      // High-risk login
      {
        name: 'high_risk_login',
        description: 'Login with high risk score',
        indicators: [
          { field: 'eventType', operator: 'equals', value: SecurityEventType.LOGIN_SUCCESS },
          { field: 'details.riskScore', operator: 'gt', value: 0.8 }
        ],
        severity: SeverityLevel.MEDIUM,
        action: 'alert',
        cooldown: 10 * 60 * 1000
      },
      
      // Suspicious user agent
      {
        name: 'suspicious_user_agent',
        description: 'Login from suspicious user agent',
        indicators: [
          { field: 'source.userAgent', operator: 'regex', value: '(bot|crawler|spider|scraper|curl|wget)' }
        ],
        severity: SeverityLevel.MEDIUM,
        action: 'alert',
        cooldown: 15 * 60 * 1000
      },
      
      // Geographic anomaly
      {
        name: 'geographic_anomaly',
        description: 'Login from unexpected location',
        indicators: [
          { field: 'eventType', operator: 'equals', value: SecurityEventType.LOGIN_SUCCESS },
          { field: 'details.context.geographic_anomaly', operator: 'equals', value: true }
        ],
        severity: SeverityLevel.MEDIUM,
        action: 'alert',
        cooldown: 30 * 60 * 1000
      },
      
      // Rate limit abuse
      {
        name: 'rate_limit_abuse',
        description: 'Excessive rate limiting',
        indicators: [
          { field: 'eventType', operator: 'equals', value: SecurityEventType.RATE_LIMIT_EXCEEDED },
        ],
        severity: SeverityLevel.HIGH,
        action: 'block',
        cooldown: 15 * 60 * 1000
      }
    ]
  }

  /**
   * Output structured log for SIEM integration
   */
  private outputStructuredLog(event: SecurityEvent): void {
    const logEntry = {
      '@timestamp': event.timestamp,
      level: this.severityToLogLevel(event.severity),
      message: event.details.description,
      labels: {
        service: 'astralfield-auth',
        environment: process.env.NODE_ENV || 'development',
        event_type: event.eventType,
        severity: event.severity
      },
      security: {
        event_id: event.id,
        event_type: event.eventType,
        severity: event.severity,
        risk_score: event.details.riskScore,
        threat_category: event.correlation.threatCategory
      },
      user: event.userId ? {
        id: event.userId
      } : undefined,
      source: {
        ip: event.source.ip,
        user_agent: event.source.userAgent,
        geo: event.source.location
      },
      target: event.target,
      details: event.details.context,
      metadata: event.details.metadata,
      compliance: event.compliance
    }
    
    // In production, send to logging infrastructure (ELK, Splunk, etc.)
    console.log('AUDIT_LOG:', JSON.stringify(logEntry))
  }

  /**
   * Utility methods
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateIncidentId(): string {
    return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private determineSeverity(eventType: SecurityEventType, riskScore: number): SeverityLevel {
    // Critical events
    if ([
      SecurityEventType.INTRUSION_DETECTED,
      SecurityEventType.DATA_BREACH_ATTEMPT,
      SecurityEventType.MALWARE_DETECTED
    ].includes(eventType)) {
      return SeverityLevel.CRITICAL
    }
    
    // High severity events
    if ([
      SecurityEventType.BRUTE_FORCE_ATTEMPT,
      SecurityEventType.ACCOUNT_LOCKOUT,
      SecurityEventType.PRIVILEGE_ESCALATION
    ].includes(eventType) || riskScore > 0.8) {
      return SeverityLevel.HIGH
    }
    
    // Medium severity events
    if ([
      SecurityEventType.LOGIN_FAILURE,
      SecurityEventType.MFA_FAILURE,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.RATE_LIMIT_EXCEEDED
    ].includes(eventType) || riskScore > 0.5) {
      return SeverityLevel.MEDIUM
    }
    
    return SeverityLevel.LOW
  }

  private getDefaultDescription(eventType: SecurityEventType): string {
    const descriptions: Partial<Record<SecurityEventType, string>> = {
      [SecurityEventType.LOGIN_SUCCESS]: 'User successfully authenticated',
      [SecurityEventType.LOGIN_FAILURE]: 'Failed authentication attempt',
      [SecurityEventType.LOGIN_BLOCKED]: 'Authentication attempt blocked',
      [SecurityEventType.LOGOUT]: 'User logged out',
      [SecurityEventType.SESSION_EXPIRED]: 'Session expired',
      [SecurityEventType.SESSION_TERMINATED]: 'Session terminated',
      [SecurityEventType.ACCESS_GRANTED]: 'Access granted to resource',
      [SecurityEventType.ACCESS_DENIED]: 'Access denied to resource',
      [SecurityEventType.PRIVILEGE_ESCALATION]: 'Privilege escalation attempt',
      [SecurityEventType.MFA_SETUP]: 'Multi-factor authentication setup',
      [SecurityEventType.MFA_SUCCESS]: 'Multi-factor authentication successful',
      [SecurityEventType.MFA_FAILURE]: 'Multi-factor authentication failed',
      [SecurityEventType.MFA_DISABLED]: 'Multi-factor authentication disabled',
      [SecurityEventType.BACKUP_CODE_USED]: 'MFA backup code used',
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected',
      [SecurityEventType.BRUTE_FORCE_ATTEMPT]: 'Brute force attack detected',
      [SecurityEventType.ACCOUNT_LOCKOUT]: 'Account locked due to security policy',
      [SecurityEventType.PASSWORD_CHANGED]: 'Password changed',
      [SecurityEventType.EMAIL_CHANGED]: 'Email address changed',
      [SecurityEventType.SECURITY_ALERT]: 'Security alert triggered',
      [SecurityEventType.INTRUSION_DETECTED]: 'Intrusion attempt detected',
      [SecurityEventType.MALWARE_DETECTED]: 'Malware detected',
      [SecurityEventType.DATA_BREACH_ATTEMPT]: 'Data breach attempt detected',
      [SecurityEventType.USER_CREATED]: 'User account created',
      [SecurityEventType.USER_DELETED]: 'User account deleted',
      [SecurityEventType.ROLE_CHANGED]: 'User role changed',
      [SecurityEventType.PERMISSIONS_MODIFIED]: 'User permissions modified',
      [SecurityEventType.SYSTEM_CONFIG_CHANGED]: 'System configuration changed',
      [SecurityEventType.REGISTRATION_SUCCESS]: 'User registration successful',
      [SecurityEventType.REGISTRATION_FAILED]: 'User registration failed',
      [SecurityEventType.SECURITY_SCAN]: 'Security scan performed',
      [SecurityEventType.THREAT_DETECTED]: 'Security threat detected',
      [SecurityEventType.EMERGENCY_LOCKDOWN]: 'Emergency lockdown activated'
    }
    
    return descriptions[eventType] || 'Security event occurred'
  }

  private categorizeThreat(eventType: SecurityEventType): string {
    const categories: Record<string, SecurityEventType[]> = {
      'authentication': [
        SecurityEventType.LOGIN_SUCCESS,
        SecurityEventType.LOGIN_FAILURE,
        SecurityEventType.LOGIN_BLOCKED,
        SecurityEventType.BRUTE_FORCE_ATTEMPT
      ],
      'authorization': [
        SecurityEventType.ACCESS_GRANTED,
        SecurityEventType.ACCESS_DENIED,
        SecurityEventType.PRIVILEGE_ESCALATION
      ],
      'session_management': [
        SecurityEventType.SESSION_EXPIRED,
        SecurityEventType.SESSION_TERMINATED
      ],
      'mfa': [
        SecurityEventType.MFA_SETUP,
        SecurityEventType.MFA_SUCCESS,
        SecurityEventType.MFA_FAILURE,
        SecurityEventType.MFA_DISABLED,
        SecurityEventType.BACKUP_CODE_USED
      ],
      'abuse': [
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventType.SUSPICIOUS_ACTIVITY
      ],
      'intrusion': [
        SecurityEventType.INTRUSION_DETECTED,
        SecurityEventType.MALWARE_DETECTED,
        SecurityEventType.DATA_BREACH_ATTEMPT
      ]
    }
    
    for (const [category, events] of Object.entries(categories)) {
      if (events.includes(eventType)) {
        return category
      }
    }
    
    return 'general'
  }

  private determineComplianceFlags(eventType: SecurityEventType): SecurityEvent['compliance'] {
    // All authentication and access events are relevant for compliance
    const authEvents = [
      SecurityEventType.LOGIN_SUCCESS,
      SecurityEventType.LOGIN_FAILURE,
      SecurityEventType.ACCESS_GRANTED,
      SecurityEventType.ACCESS_DENIED
    ]
    
    const sensitiveEvents = [
      SecurityEventType.PASSWORD_CHANGED,
      SecurityEventType.EMAIL_CHANGED,
      SecurityEventType.USER_CREATED,
      SecurityEventType.USER_DELETED
    ]
    
    return {
      gdpr: authEvents.includes(eventType) || sensitiveEvents.includes(eventType),
      pci: authEvents.includes(eventType),
      soc2: true, // All security events relevant for SOC2
      hipaa: sensitiveEvents.includes(eventType)
    }
  }

  private severityToLogLevel(severity: SeverityLevel): string {
    const mapping = {
      [SeverityLevel.LOW]: 'info',
      [SeverityLevel.MEDIUM]: 'warn',
      [SeverityLevel.HIGH]: 'error',
      [SeverityLevel.CRITICAL]: 'fatal'
    }
    
    return mapping[severity]
  }

  private getFieldValue(event: SecurityEvent, field: string): any {
    const parts = field.split('.')
    let value: any = event
    
    for (const part of parts) {
      value = value?.[part]
    }
    
    return value
  }

  private areEventTypesRelated(type1: SecurityEventType, type2: SecurityEventType): boolean {
    const relatedGroups = [
      [SecurityEventType.LOGIN_FAILURE, SecurityEventType.LOGIN_BLOCKED, SecurityEventType.BRUTE_FORCE_ATTEMPT],
      [SecurityEventType.MFA_SETUP, SecurityEventType.MFA_SUCCESS, SecurityEventType.MFA_FAILURE],
      [SecurityEventType.ACCESS_DENIED, SecurityEventType.PRIVILEGE_ESCALATION],
      [SecurityEventType.RATE_LIMIT_EXCEEDED, SecurityEventType.SUSPICIOUS_ACTIVITY]
    ]
    
    return relatedGroups.some(group => group.includes(type1) && group.includes(type2))
  }

  private findExistingIncident(event: SecurityEvent, relatedEvents: SecurityEvent[]): SecurityIncident | null {
    for (const incident of this.incidents.values()) {
      if (incident.status === 'resolved' || incident.status === 'false_positive') continue
      
      // Check if any related events are already part of this incident
      const hasRelatedEvent = relatedEvents.some(e => incident.events.includes(e.id))
      
      if (hasRelatedEvent) {
        return incident
      }
    }
    
    return null
  }

  private shouldCreateIncident(event: SecurityEvent, relatedEvents: SecurityEvent[]): boolean {
    // Create incident for high/critical severity events
    if ([SeverityLevel.HIGH, SeverityLevel.CRITICAL].includes(event.severity)) {
      return true
    }
    
    // Create incident if there are multiple related events
    if (relatedEvents.length >= 3) {
      return true
    }
    
    // Create incident for specific event patterns
    const suspiciousPatterns = [
      SecurityEventType.BRUTE_FORCE_ATTEMPT,
      SecurityEventType.INTRUSION_DETECTED,
      SecurityEventType.PRIVILEGE_ESCALATION
    ]
    
    return suspiciousPatterns.includes(event.eventType)
  }

  private generateIncidentTitle(event: SecurityEvent): string {
    const titles: Partial<Record<SecurityEventType, string>> = {
      [SecurityEventType.BRUTE_FORCE_ATTEMPT]: 'Brute Force Attack Detected',
      [SecurityEventType.INTRUSION_DETECTED]: 'System Intrusion Detected',
      [SecurityEventType.PRIVILEGE_ESCALATION]: 'Privilege Escalation Attempt',
      [SecurityEventType.DATA_BREACH_ATTEMPT]: 'Data Breach Attempt',
      [SecurityEventType.MALWARE_DETECTED]: 'Malware Detection',
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 'Abuse Pattern Detected'
    }
    
    return titles[event.eventType] || `Security Incident - ${event.eventType}`
  }

  private generateIncidentDescription(primaryEvent: SecurityEvent, relatedEvents: SecurityEvent[]): string {
    return `Security incident involving ${relatedEvents.length + 1} events. ` +
           `Primary event: ${primaryEvent.details.description}. ` +
           `Source: ${primaryEvent.source.ip}. ` +
           `Risk score: ${primaryEvent.details.riskScore}.`
  }

  private calculateIncidentSeverity(primaryEvent: SecurityEvent, relatedEvents: SecurityEvent[]): SeverityLevel {
    const allEvents = [primaryEvent, ...relatedEvents]
    const maxSeverity = allEvents.reduce((max, event) => {
      const severityLevels = [SeverityLevel.LOW, SeverityLevel.MEDIUM, SeverityLevel.HIGH, SeverityLevel.CRITICAL]
      const currentIndex = severityLevels.indexOf(event.severity)
      const maxIndex = severityLevels.indexOf(max)
      return currentIndex > maxIndex ? event.severity : max
    }, SeverityLevel.LOW)
    
    return maxSeverity
  }

  private async createSecurityAlert(event: SecurityEvent, pattern: ThreatPattern): Promise<void> {
    // In production, send to alerting system (PagerDuty, Slack, etc.)
    console.warn(`SECURITY ALERT: ${pattern.description}`, {
      pattern: pattern.name,
      eventId: event.id,
      severity: pattern.severity,
      userId: event.userId,
      ip: event.source.ip,
      timestamp: event.timestamp
    })
  }

  private async blockSource(event: SecurityEvent, pattern: ThreatPattern): Promise<void> {
    // In production, integrate with firewall/WAF to block source
    console.error(`BLOCKING SOURCE: ${event.source.ip}`, {
      reason: pattern.name,
      eventId: event.id,
      severity: pattern.severity
    })
  }

  private async escalateIncident(event: SecurityEvent, pattern: ThreatPattern): Promise<void> {
    // In production, escalate to security team
    console.error(`ESCALATING INCIDENT: ${pattern.description}`, {
      pattern: pattern.name,
      eventId: event.id,
      severity: pattern.severity,
      requiresImmediate: true
    })
  }

  private cleanupOldEvents(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days
    let cleanedCount = 0
    
    for (const [eventId, event] of this.events.entries()) {
      if (new Date(event.timestamp).getTime() < cutoff) {
        this.events.delete(eventId)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old audit events`)
    }
  }

  /**
   * Public methods for querying events and incidents
   */
  getEvents(filters?: {
    eventType?: SecurityEventType
    severity?: SeverityLevel
    userId?: string
    since?: string
    limit?: number
  }): SecurityEvent[] {
    let events = Array.from(this.events.values())
    
    if (filters) {
      if (filters.eventType) {
        events = events.filter(e => e.eventType === filters.eventType)
      }
      if (filters.severity) {
        events = events.filter(e => e.severity === filters.severity)
      }
      if (filters.userId) {
        events = events.filter(e => e.userId === filters.userId)
      }
      if (filters.since) {
        const since = new Date(filters.since).getTime()
        events = events.filter(e => new Date(e.timestamp).getTime() >= since)
      }
    }
    
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return filters?.limit ? events.slice(0, filters.limit) : events
  }

  getIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
  }

  getSecurityMetrics(): {
    eventsToday: number
    incidentsToday: number
    averageRiskScore: number
    topThreatCategories: Array<{ category: string; count: number }>
    severityDistribution: Record<SeverityLevel, number>
  } {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEvents = this.getEvents({ since: today.toISOString() })
    
    const incidentsToday = Array.from(this.incidents.values())
      .filter(i => new Date(i.firstSeen) >= today).length
    
    const averageRiskScore = todayEvents.length > 0
      ? todayEvents.reduce((sum, e) => sum + e.details.riskScore, 0) / todayEvents.length
      : 0
    
    const threatCategories: Record<string, number> = {}
    const severityDistribution: Record<SeverityLevel, number> = {
      [SeverityLevel.LOW]: 0,
      [SeverityLevel.MEDIUM]: 0,
      [SeverityLevel.HIGH]: 0,
      [SeverityLevel.CRITICAL]: 0
    }
    
    todayEvents.forEach(event => {
      const category = event.correlation.threatCategory || 'unknown'
      threatCategories[category] = (threatCategories[category] || 0) + 1
      severityDistribution[event.severity]++
    })
    
    const topThreatCategories = Object.entries(threatCategories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    return {
      eventsToday: todayEvents.length,
      incidentsToday,
      averageRiskScore,
      topThreatCategories,
      severityDistribution
    }
  }
}

// Guardian Security: Global audit logger instance
export const guardianAuditLogger = new GuardianAuditLogger()