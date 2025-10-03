/**
 * Audit Logger Tests
 * 
 * Tests for Guardian audit logging and intrusion detection system
 */

import { 
  GuardianAuditLogger, 
  SecurityEventType, 
  SeverityLevel 
} from '@/lib/security/audit-logger'

describe('GuardianAuditLogger', () => {
  let logger: GuardianAuditLogger

  beforeEach(() => {
    logger = new GuardianAuditLogger()
    jest.clearAllMocks()
  })

  describe('Event Logging', () => {
    it('should log security event', async () => {
      const eventId = await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test Browser' },
        { description: 'Test login', riskScore: 0.1, context: {}, metadata: {} }
      )

      expect(eventId).toBeDefined()
      expect(eventId).toMatch(/^evt_/)
    })

    it('should store event details', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test Browser' },
        { description: 'Test login', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events.length).toBeGreaterThan(0)
      expect(events[0].userId).toBe('user-123')
    })

    it('should include timestamp', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test Browser' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].timestamp).toBeDefined()
      expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should determine severity automatically', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.INTRUSION_DETECTED,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].severity).toBe(SeverityLevel.CRITICAL)
    })

    it('should include source information', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { 
          ip: '1.2.3.4', 
          userAgent: 'Test Browser',
          location: { country: 'US', city: 'New York' }
        },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].source.ip).toBe('1.2.3.4')
      expect(events[0].source.location?.country).toBe('US')
    })
  })

  describe('Severity Determination', () => {
    it('should assign CRITICAL severity to intrusion events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.INTRUSION_DETECTED,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].severity).toBe(SeverityLevel.CRITICAL)
    })

    it('should assign HIGH severity to brute force', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.BRUTE_FORCE_ATTEMPT,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].severity).toBe(SeverityLevel.HIGH)
    })

    it('should assign MEDIUM severity to login failures', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILURE,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].severity).toBe(SeverityLevel.MEDIUM)
    })

    it('should assign severity based on risk score', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.9, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].severity).toBe(SeverityLevel.HIGH)
    })
  })

  describe('Threat Categorization', () => {
    it('should categorize authentication events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].correlation.threatCategory).toBe('authentication')
    })

    it('should categorize authorization events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.ACCESS_DENIED,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].correlation.threatCategory).toBe('authorization')
    })

    it('should categorize intrusion events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.INTRUSION_DETECTED,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].correlation.threatCategory).toBe('intrusion')
    })
  })

  describe('Compliance Flags', () => {
    it('should set GDPR flag for auth events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].compliance.gdpr).toBe(true)
    })

    it('should set SOC2 flag for all events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].compliance.soc2).toBe(true)
    })

    it('should set HIPAA flag for sensitive events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.USER_DELETED,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].compliance.hipaa).toBe(true)
    })
  })

  describe('Event Querying', () => {
    beforeEach(async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-1',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} }
      )
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILURE,
        'user-2',
        { ip: '1.2.3.5', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.5, context: {}, metadata: {} }
      )
    })

    it('should get all events', () => {
      const events = logger.getEvents()
      expect(events.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by event type', () => {
      const events = logger.getEvents({ 
        eventType: SecurityEventType.LOGIN_SUCCESS 
      })
      
      expect(events.every(e => e.eventType === SecurityEventType.LOGIN_SUCCESS)).toBe(true)
    })

    it('should filter by severity', () => {
      const events = logger.getEvents({ 
        severity: SeverityLevel.MEDIUM 
      })
      
      expect(events.every(e => e.severity === SeverityLevel.MEDIUM)).toBe(true)
    })

    it('should filter by user ID', () => {
      const events = logger.getEvents({ userId: 'user-1' })
      
      expect(events.every(e => e.userId === 'user-1')).toBe(true)
    })

    it('should limit results', () => {
      const events = logger.getEvents({ limit: 1 })
      
      expect(events.length).toBe(1)
    })

    it('should sort by timestamp descending', () => {
      const events = logger.getEvents()
      
      if (events.length > 1) {
        const time1 = new Date(events[0].timestamp).getTime()
        const time2 = new Date(events[1].timestamp).getTime()
        expect(time1).toBeGreaterThanOrEqual(time2)
      }
    })
  })

  describe('Security Metrics', () => {
    beforeEach(async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-1',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.2, context: {}, metadata: {} }
      )
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILURE,
        'user-2',
        { ip: '1.2.3.5', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.6, context: {}, metadata: {} }
      )
    })

    it('should calculate events today', () => {
      const metrics = logger.getSecurityMetrics()
      
      expect(metrics.eventsToday).toBeGreaterThanOrEqual(2)
    })

    it('should calculate average risk score', () => {
      const metrics = logger.getSecurityMetrics()
      
      expect(metrics.averageRiskScore).toBeGreaterThan(0)
      expect(metrics.averageRiskScore).toBeLessThanOrEqual(1)
    })

    it('should provide severity distribution', () => {
      const metrics = logger.getSecurityMetrics()
      
      expect(metrics.severityDistribution).toHaveProperty(SeverityLevel.LOW)
      expect(metrics.severityDistribution).toHaveProperty(SeverityLevel.MEDIUM)
      expect(metrics.severityDistribution).toHaveProperty(SeverityLevel.HIGH)
      expect(metrics.severityDistribution).toHaveProperty(SeverityLevel.CRITICAL)
    })

    it('should provide top threat categories', () => {
      const metrics = logger.getSecurityMetrics()
      
      expect(Array.isArray(metrics.topThreatCategories)).toBe(true)
      if (metrics.topThreatCategories.length > 0) {
        expect(metrics.topThreatCategories[0]).toHaveProperty('category')
        expect(metrics.topThreatCategories[0]).toHaveProperty('count')
      }
    })
  })

  describe('Incident Management', () => {
    it('should get incidents', () => {
      const incidents = logger.getIncidents()
      
      expect(Array.isArray(incidents)).toBe(true)
    })

    it('should sort incidents by last seen', async () => {
      // Create multiple high-severity events to trigger incidents
      for (let i = 0; i < 5; i++) {
        await logger.logSecurityEvent(
          SecurityEventType.BRUTE_FORCE_ATTEMPT,
          'user-123',
          { ip: '1.2.3.4', userAgent: 'Test' },
          { description: 'Test', riskScore: 0.9, context: {}, metadata: {} }
        )
      }

      const incidents = logger.getIncidents()
      
      if (incidents.length > 1) {
        const time1 = new Date(incidents[0].lastSeen).getTime()
        const time2 = new Date(incidents[1].lastSeen).getTime()
        expect(time1).toBeGreaterThanOrEqual(time2)
      }
    })
  })

  describe('Session ID Tracking', () => {
    it('should track session ID', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} },
        undefined,
        'session-123'
      )

      const events = logger.getEvents()
      expect(events[0].sessionId).toBe('session-123')
    })
  })

  describe('Target Resource Tracking', () => {
    it('should track target resource', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.ACCESS_GRANTED,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Test', riskScore: 0.1, context: {}, metadata: {} },
        { resource: 'api/leagues', resourceId: 'league-123', action: 'read' }
      )

      const events = logger.getEvents()
      expect(events[0].target?.resource).toBe('api/leagues')
      expect(events[0].target?.resourceId).toBe('league-123')
    })
  })

  describe('Default Descriptions', () => {
    it('should provide default description for known events', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].details.description).toBe('User successfully authenticated')
    })

    it('should use custom description when provided', async () => {
      await logger.logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        'user-123',
        { ip: '1.2.3.4', userAgent: 'Test' },
        { description: 'Custom description', riskScore: 0.1, context: {}, metadata: {} }
      )

      const events = logger.getEvents()
      expect(events[0].details.description).toBe('Custom description')
    })
  })
})
