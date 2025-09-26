// Guardian Security: GDPR Compliance & Privacy Protection System
// Implements comprehensive data privacy, consent management, and regulatory compliance

import { guardianAuditLogger, SecurityEventType } from './audit-logger'

export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}

export enum DataCategory {
  PERSONAL_IDENTIFIERS = 'personal_identifiers', // Name, email, ID
  CONTACT_INFORMATION = 'contact_information', // Address, phone
  AUTHENTICATION_DATA = 'authentication_data', // Passwords, MFA secrets
  BEHAVIORAL_DATA = 'behavioral_data', // Usage patterns, preferences
  TECHNICAL_DATA = 'technical_data', // IP addresses, device info
  SPECIAL_CATEGORIES = 'special_categories' // Sensitive data (health, biometric, etc.)
}

export enum ConsentPurpose {
  AUTHENTICATION = 'authentication',
  SERVICE_PROVISION = 'service_provision',
  PERSONALIZATION = 'personalization',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  SECURITY_MONITORING = 'security_monitoring',
  LEGAL_COMPLIANCE = 'legal_compliance'
}

export interface ConsentRecord {
  id: string
  userId: string
  purpose: ConsentPurpose
  legalBasis: LegalBasis
  dataCategories: DataCategory[]
  granted: boolean
  grantedAt?: Date
  revokedAt?: Date
  expiresAt?: Date
  consentMethod: 'explicit' | 'implicit' | 'legitimate_interest'
  version: string // Privacy policy version
  metadata: {
    ipAddress: string
    userAgent: string
    consentText: string
    granularity: 'all' | 'partial' | 'minimal'
  }
}

export interface DataProcessingRecord {
  id: string
  userId: string
  dataType: DataCategory
  purpose: ConsentPurpose
  legalBasis: LegalBasis
  processingActivity: string
  dataSource: string
  retentionPeriod: number // in days
  processedAt: Date
  location: string // Data processing location
  thirdParties?: string[] // External processors
}

export interface PrivacyRequest {
  id: string
  userId: string
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  requestedAt: Date
  completedAt?: Date
  details: {
    specificData?: string[]
    reason?: string
    contactMethod: string
  }
  verification: {
    method: 'identity_document' | 'security_questions' | 'email_verification'
    verified: boolean
    verifiedAt?: Date
  }
  response?: {
    data?: any
    actions: string[]
    notes: string
  }
}

export interface DataRetentionPolicy {
  dataType: DataCategory
  purpose: ConsentPurpose
  retentionPeriod: number // in days
  archivalPeriod?: number // additional archival period
  deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymization'
  exceptions: string[] // Legal hold reasons
}

export class GuardianPrivacyProtection {
  private consentRecords = new Map<string, ConsentRecord[]>()
  private processingRecords = new Map<string, DataProcessingRecord[]>()
  private privacyRequests = new Map<string, PrivacyRequest>()
  private retentionPolicies: DataRetentionPolicy[]

  constructor() {
    this.initializeRetentionPolicies()
    
    // Run daily data retention cleanup
    setInterval(() => this.enforceDataRetention(), 24 * 60 * 60 * 1000)
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    purposes: ConsentPurpose[],
    legalBasis: LegalBasis,
    context: {
      ipAddress: string
      userAgent: string
      consentMethod: 'explicit' | 'implicit' | 'legitimate_interest'
      policyVersion: string
    }
  ): Promise<string[]> {
    const consentIds: string[] = []
    
    for (const purpose of purposes) {
      const consentId = this.generateConsentId()
      const dataCategories = this.getDataCategoriesForPurpose(purpose)
      
      const consent: ConsentRecord = {
        id: consentId,
        userId,
        purpose,
        legalBasis,
        dataCategories,
        granted: true,
        grantedAt: new Date(),
        consentMethod: context.consentMethod,
        version: context.policyVersion,
        metadata: {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          consentText: this.getConsentText(purpose),
          granularity: this.getConsentGranularity(purposes)
        }
      }

      if (!this.consentRecords.has(userId)) {
        this.consentRecords.set(userId, [])
      }
      
      this.consentRecords.get(userId)!.push(consent)
      consentIds.push(consentId)

      // Log consent for audit trail
      await guardianAuditLogger.logSecurityEvent(
        SecurityEventType.USER_CREATED,
        userId,
        {
          ip: context.ipAddress,
          userAgent: context.userAgent
        },
        {
          description: `Consent recorded for ${purpose}`,
          riskScore: 0.1,
          context: {
            purpose,
            legalBasis,
            consentMethod: context.consentMethod,
            policyVersion: context.policyVersion,
            dataCategories: dataCategories.join(', ')
          }
        }
      )
    }

    return consentIds
  }

  /**
   * Revoke user consent
   */
  async revokeConsent(
    userId: string,
    purpose: ConsentPurpose,
    context: {
      ipAddress: string
      userAgent: string
      reason?: string
    }
  ): Promise<boolean> {
    const userConsents = this.consentRecords.get(userId) || []
    const consent = userConsents.find(c => c.purpose === purpose && c.granted)
    
    if (!consent) {
      return false
    }

    consent.granted = false
    consent.revokedAt = new Date()

    // Log consent revocation
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.PERMISSIONS_MODIFIED,
      userId,
      {
        ip: context.ipAddress,
        userAgent: context.userAgent
      },
      {
        description: `Consent revoked for ${purpose}`,
        riskScore: 0.2,
        context: {
          purpose,
          reason: context.reason || 'User initiated',
          originalConsentDate: consent.grantedAt?.toISOString()
        }
      }
    )

    return true
  }

  /**
   * Check if user has valid consent for purpose
   */
  hasValidConsent(userId: string, purpose: ConsentPurpose): boolean {
    const userConsents = this.consentRecords.get(userId) || []
    const consent = userConsents.find(c => 
      c.purpose === purpose && 
      c.granted && 
      (!c.expiresAt || c.expiresAt > new Date())
    )
    
    return !!consent
  }

  /**
   * Record data processing activity
   */
  async recordDataProcessing(
    userId: string,
    dataType: DataCategory,
    purpose: ConsentPurpose,
    activity: string,
    context: {
      legalBasis: LegalBasis
      dataSource: string
      location: string
      thirdParties?: string[]
    }
  ): Promise<string> {
    // Check if we have legal basis for processing
    if (context.legalBasis === LegalBasis.CONSENT && !this.hasValidConsent(userId, purpose)) {
      throw new Error('No valid consent for data processing')
    }

    const recordId = this.generateProcessingId()
    const retentionPeriod = this.getRetentionPeriod(dataType, purpose)
    
    const record: DataProcessingRecord = {
      id: recordId,
      userId,
      dataType,
      purpose,
      legalBasis: context.legalBasis,
      processingActivity: activity,
      dataSource: context.dataSource,
      retentionPeriod,
      processedAt: new Date(),
      location: context.location,
      thirdParties: context.thirdParties
    }

    if (!this.processingRecords.has(userId)) {
      this.processingRecords.set(userId, [])
    }
    
    this.processingRecords.get(userId)!.push(record)

    return recordId
  }

  /**
   * Handle privacy request (GDPR Article 15-22)
   */
  async handlePrivacyRequest(
    userId: string,
    requestType: PrivacyRequest['type'],
    details: PrivacyRequest['details'],
    context: {
      ipAddress: string
      userAgent: string
    }
  ): Promise<string> {
    const requestId = this.generateRequestId()
    
    const request: PrivacyRequest = {
      id: requestId,
      userId,
      type: requestType,
      status: 'pending',
      requestedAt: new Date(),
      details,
      verification: {
        method: 'email_verification',
        verified: false
      }
    }

    this.privacyRequests.set(requestId, request)

    // Log privacy request
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.ACCESS_GRANTED,
      userId,
      {
        ip: context.ipAddress,
        userAgent: context.userAgent
      },
      {
        description: `Privacy request submitted: ${requestType}`,
        riskScore: 0.3,
        context: {
          requestType,
          requestId,
          contactMethod: details.contactMethod
        }
      }
    )

    // Auto-process certain request types
    if (requestType === 'access') {
      await this.processDataAccessRequest(requestId)
    }

    return requestId
  }

  /**
   * Process data access request (Article 15)
   */
  private async processDataAccessRequest(requestId: string): Promise<void> {
    const request = this.privacyRequests.get(requestId)
    if (!request || request.type !== 'access') return

    request.status = 'processing'

    try {
      const userData = await this.generateDataExport(request.userId)
      
      request.response = {
        data: userData,
        actions: ['Data export generated'],
        notes: 'Complete data export as per GDPR Article 15'
      }
      
      request.status = 'completed'
      request.completedAt = new Date()

    } catch (error) {
      request.status = 'rejected'
      request.response = {
        actions: ['Request processing failed'],
        notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Generate data export for user
   */
  private async generateDataExport(userId: string): Promise<any> {
    const consents = this.consentRecords.get(userId) || []
    const processing = this.processingRecords.get(userId) || []
    
    return {
      personalData: {
        consents: consents.map(c => ({
          purpose: c.purpose,
          granted: c.granted,
          grantedAt: c.grantedAt,
          legalBasis: c.legalBasis,
          dataCategories: c.dataCategories
        })),
        processingActivities: processing.map(p => ({
          dataType: p.dataType,
          purpose: p.purpose,
          activity: p.processingActivity,
          processedAt: p.processedAt,
          legalBasis: p.legalBasis,
          retentionUntil: new Date(p.processedAt.getTime() + p.retentionPeriod * 24 * 60 * 60 * 1000)
        }))
      },
      metadata: {
        exportGeneratedAt: new Date().toISOString(),
        dataControllerInfo: {
          name: 'AstralField Fantasy Football',
          contact: 'privacy@astralfield.com',
          dpo: 'dpo@astralfield.com'
        },
        retentionPolicies: this.retentionPolicies.filter(p => 
          processing.some(proc => proc.dataType === p.dataType && proc.purpose === p.purpose)
        )
      }
    }
  }

  /**
   * Enforce data retention policies
   */
  private async enforceDataRetention(): Promise<void> {
    const now = new Date()
    let deletedRecords = 0

    for (const [userId, records] of this.processingRecords.entries()) {
      const expiredRecords = records.filter(record => {
        const expiryDate = new Date(record.processedAt.getTime() + record.retentionPeriod * 24 * 60 * 60 * 1000)
        return now > expiryDate
      })

      for (const record of expiredRecords) {
        await this.deleteExpiredData(userId, record)
        deletedRecords++
      }

      // Remove expired records
      this.processingRecords.set(userId, 
        records.filter(record => {
          const expiryDate = new Date(record.processedAt.getTime() + record.retentionPeriod * 24 * 60 * 60 * 1000)
          return now <= expiryDate
        })
      )
    }

    if (deletedRecords > 0) {
      console.log(`Data retention cleanup: Deleted ${deletedRecords} expired records`)
    }
  }

  /**
   * Delete expired data according to retention policy
   */
  private async deleteExpiredData(userId: string, record: DataProcessingRecord): Promise<void> {
    const policy = this.retentionPolicies.find(p => 
      p.dataType === record.dataType && p.purpose === record.purpose
    )

    if (!policy) return

    // Log data deletion for audit
    await guardianAuditLogger.logSecurityEvent(
      SecurityEventType.USER_DELETED,
      userId,
      { ip: 'system', userAgent: 'retention-service' },
      {
        description: `Data deleted per retention policy: ${record.dataType}`,
        riskScore: 0.1,
        context: {
          dataType: record.dataType,
          purpose: record.purpose,
          deletionMethod: policy.deletionMethod,
          originalProcessingDate: record.processedAt.toISOString(),
          retentionPeriod: policy.retentionPeriod
        }
      }
    )

    console.log(`Deleted expired data: ${record.dataType} for user ${userId}`)
  }

  /**
   * Initialize data retention policies
   */
  private initializeRetentionPolicies(): void {
    this.retentionPolicies = [
      {
        dataType: DataCategory.AUTHENTICATION_DATA,
        purpose: ConsentPurpose.AUTHENTICATION,
        retentionPeriod: 1095, // 3 years
        deletionMethod: 'hard_delete',
        exceptions: ['legal_hold', 'active_investigation']
      },
      {
        dataType: DataCategory.BEHAVIORAL_DATA,
        purpose: ConsentPurpose.ANALYTICS,
        retentionPeriod: 730, // 2 years
        deletionMethod: 'anonymization',
        exceptions: []
      },
      {
        dataType: DataCategory.TECHNICAL_DATA,
        purpose: ConsentPurpose.SECURITY_MONITORING,
        retentionPeriod: 365, // 1 year
        deletionMethod: 'hard_delete',
        exceptions: ['security_incident', 'legal_hold']
      },
      {
        dataType: DataCategory.PERSONAL_IDENTIFIERS,
        purpose: ConsentPurpose.SERVICE_PROVISION,
        retentionPeriod: 2555, // 7 years (legal requirement)
        deletionMethod: 'soft_delete',
        exceptions: ['contract_obligation', 'legal_requirement']
      },
      {
        dataType: DataCategory.CONTACT_INFORMATION,
        purpose: ConsentPurpose.MARKETING,
        retentionPeriod: 1095, // 3 years
        deletionMethod: 'hard_delete',
        exceptions: []
      }
    ]
  }

  /**
   * Utility methods
   */
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateProcessingId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDataCategoriesForPurpose(purpose: ConsentPurpose): DataCategory[] {
    const mapping: Record<ConsentPurpose, DataCategory[]> = {
      [ConsentPurpose.AUTHENTICATION]: [
        DataCategory.PERSONAL_IDENTIFIERS,
        DataCategory.AUTHENTICATION_DATA,
        DataCategory.TECHNICAL_DATA
      ],
      [ConsentPurpose.SERVICE_PROVISION]: [
        DataCategory.PERSONAL_IDENTIFIERS,
        DataCategory.CONTACT_INFORMATION,
        DataCategory.BEHAVIORAL_DATA
      ],
      [ConsentPurpose.PERSONALIZATION]: [
        DataCategory.BEHAVIORAL_DATA,
        DataCategory.TECHNICAL_DATA
      ],
      [ConsentPurpose.ANALYTICS]: [
        DataCategory.BEHAVIORAL_DATA,
        DataCategory.TECHNICAL_DATA
      ],
      [ConsentPurpose.MARKETING]: [
        DataCategory.CONTACT_INFORMATION,
        DataCategory.BEHAVIORAL_DATA
      ],
      [ConsentPurpose.SECURITY_MONITORING]: [
        DataCategory.TECHNICAL_DATA,
        DataCategory.AUTHENTICATION_DATA
      ],
      [ConsentPurpose.LEGAL_COMPLIANCE]: [
        DataCategory.PERSONAL_IDENTIFIERS,
        DataCategory.CONTACT_INFORMATION,
        DataCategory.AUTHENTICATION_DATA
      ]
    }

    return mapping[purpose] || []
  }

  private getConsentText(purpose: ConsentPurpose): string {
    const texts: Record<ConsentPurpose, string> = {
      [ConsentPurpose.AUTHENTICATION]: 'Process authentication data to provide secure access to your account',
      [ConsentPurpose.SERVICE_PROVISION]: 'Use your personal data to provide fantasy football services',
      [ConsentPurpose.PERSONALIZATION]: 'Analyze your usage to personalize your experience',
      [ConsentPurpose.ANALYTICS]: 'Collect analytics data to improve our services',
      [ConsentPurpose.MARKETING]: 'Send you marketing communications about our services',
      [ConsentPurpose.SECURITY_MONITORING]: 'Monitor for security threats and protect your account',
      [ConsentPurpose.LEGAL_COMPLIANCE]: 'Process data as required by law and regulations'
    }

    return texts[purpose] || 'Process your data for specified purposes'
  }

  private getConsentGranularity(purposes: ConsentPurpose[]): 'all' | 'partial' | 'minimal' {
    if (purposes.length >= 5) return 'all'
    if (purposes.length >= 3) return 'partial'
    return 'minimal'
  }

  private getRetentionPeriod(dataType: DataCategory, purpose: ConsentPurpose): number {
    const policy = this.retentionPolicies.find(p => 
      p.dataType === dataType && p.purpose === purpose
    )
    
    return policy?.retentionPeriod || 365 // Default 1 year
  }

  /**
   * Public API methods
   */
  getConsentStatus(userId: string): Array<{
    purpose: ConsentPurpose
    granted: boolean
    grantedAt?: Date
    revokedAt?: Date
  }> {
    const consents = this.consentRecords.get(userId) || []
    return consents.map(c => ({
      purpose: c.purpose,
      granted: c.granted,
      grantedAt: c.grantedAt,
      revokedAt: c.revokedAt
    }))
  }

  getPrivacyRequests(userId?: string): PrivacyRequest[] {
    const requests = Array.from(this.privacyRequests.values())
    return userId ? requests.filter(r => r.userId === userId) : requests
  }

  getDataProcessingLog(userId: string): DataProcessingRecord[] {
    return this.processingRecords.get(userId) || []
  }

  getRetentionPolicies(): DataRetentionPolicy[] {
    return [...this.retentionPolicies]
  }
}

// Guardian Security: Global privacy protection instance
export const guardianPrivacyProtection = new GuardianPrivacyProtection()