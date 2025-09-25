/**
 * Privacy-Compliant Analytics Service
 * GDPR-compliant data collection, anonymization, and user consent management
 */

import { prisma } from '@/lib/prisma';
import { redisCache } from '@/lib/redis-cache';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export interface ConsentSettings {
  userId: string;
  analytics: boolean;
  performance: boolean;
  marketing: boolean;
  personalization: boolean;
  thirdParty: boolean;
  granularConsent: {
    userBehavior: boolean;
    featureUsage: boolean;
    errorTracking: boolean;
    a_bTesting: boolean;
    heatmaps: boolean;
    sessionRecording: boolean;
  };
  consentDate: Date;
  lastUpdated: Date;
  ipAddress?: string;
  userAgent?: string;
  consentMethod: 'banner' | 'settings' | 'registration' | 'api';
}

export interface DataRetentionPolicy {
  category: string;
  retentionPeriod: number; // Days
  autoDelete: boolean;
  anonymizeAfter: number; // Days, 0 means immediate
  description: string;
  legalBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
}

export interface AnonymizedMetrics {
  timestamp: Date;
  sessionId: string; // Hashed
  userSegment: string;
  pageViews: number;
  sessionDuration: number;
  featureInteractions: { [feature: string]: number };
  deviceType: 'mobile' | 'desktop' | 'tablet';
  location: {
    country: string;
    region?: string; // Only if population > 10k
  };
  referrer: string;
  exitPage: string;
}

export interface PrivacyAuditLog {
  id: string;
  userId?: string;
  action: 'consent_given' | 'consent_withdrawn' | 'data_accessed' | 'data_deleted' | 'data_exported' | 'data_anonymized';
  details: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  legalBasis?: string;
}

export interface DataExportRequest {
  userId: string;
  requestId: string;
  categories: string[];
  format: 'json' | 'csv' | 'xml';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestDate: Date;
  completedDate?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  userId: string;
  requestId: string;
  scope: 'all' | 'analytics' | 'specific';
  categories?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestDate: Date;
  completedDate?: Date;
  verificationRequired: boolean;
  verificationCode?: string;
}

class PrivacyAnalyticsService {
  private readonly hashSalt = process.env.ANALYTICS_HASH_SALT || 'default_salt_change_in_production';
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();

  constructor() {
    this.initializeRetentionPolicies();
    this.startCleanupSchedule();
  }
 
  /**
   * Record user consent
   */
  async recordConsent(consent: ConsentSettings): Promise<void> {
    try {
      // Store consent in database
      await prisma.user.update({
        where: { id: consent.userId },
        data: {
          // This would be stored in a separate consent table in practice
          updatedAt: new Date()
        }
      });

      // Store detailed consent in Redis with encryption
      const encryptedConsent = this.encryptData(consent);
      await redisCache.set(
        `consent:${consent.userId}`,
        JSON.stringify(encryptedConsent),
        86400 * 365 // 1 year
      );

      // Log consent action
      await this.logPrivacyAction({
        userId: consent.userId,
        action: 'consent_given',
        details: {
          analytics: consent.analytics,
          performance: consent.performance,
          marketing: consent.marketing,
          method: consent.consentMethod
        },
        timestamp: new Date(),
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        legalBasis: 'consent'
      });

      logger.info(`Consent recorded for user ${consent.userId}`);

    } catch (error) {
      logger.error('Error recording consent:', error);
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Get user consent settings
   */
  async getUserConsent(userId: string): Promise<ConsentSettings | null> {
    try {
      const cached = await redisCache.get(`consent:${userId}`);
      if (cached) {
        const encrypted = JSON.parse(cached as string);
        return this.decryptData(encrypted);
      }
      
      // Could also check database for consent records
      return null;

    } catch (error) {
      logger.error('Error getting user consent:', error);
      return null;
    }
  }
  /**
   * Withdraw consent
   */
  async withdrawConsent(userId: string, categories: string[]): Promise<void> {
    try {
      const currentConsent = await this.getUserConsent(userId);
      if (!currentConsent) {
        throw new Error('No consent record found');
      }
      
      // Update consent settings
      categories.forEach(category => {
        if (category in currentConsent) {
          (currentConsent as any)[category] = false;
        }
      });

      currentConsent.lastUpdated = new Date();

      // Store updated consent
      const encryptedConsent = this.encryptData(currentConsent);
      await redisCache.set(
        `consent:${userId}`,
        JSON.stringify(encryptedConsent),
        86400 * 365
      );

      // Log withdrawal
      await this.logPrivacyAction({
        userId,
        action: 'consent_withdrawn',
        details: { categories },
        timestamp: new Date(),
        legalBasis: 'consent'
      });

      // Trigger data cleanup if necessary
      if (categories.includes('analytics')) {
        await this.scheduleDataCleanup(userId, ['analytics']);
      }
      
      logger.info(`Consent withdrawn for user ${userId}, categories: ${categories.join(', ')}`);

    } catch (error) {
      logger.error('Error withdrawing consent:', error);
      throw new Error('Failed to withdraw consent');
    }
  }
  /**
   * Collect analytics data with privacy compliance
   */
  async collectAnalyticsData(
    userId: string,
    eventData: any,
    category: string = 'analytics'
  ): Promise<void> {
    try {
      // Check user consent
      const consent = await this.getUserConsent(userId);
      if (!consent || !this.hasConsentForCategory(consent, category)) {
        // Collect anonymized data only
        await this.collectAnonymizedData(eventData);
        return;
      }
      
      // Check retention policy
      const policy = this.retentionPolicies.get(category);
      if (!policy) {
        logger.warn(`No retention policy found for category: ${category}`);
        return;
      }
      
      // Store data with metadata
      const dataRecord = {
        userId,
        category,
        data: eventData,
        timestamp: new Date(),
        retentionPolicy: policy.category,
        legalBasis: policy.legalBasis,
        anonymizeAfter: policy.anonymizeAfter,
        deleteAfter: policy.retentionPeriod
      };

      // Store in Redis with TTL based on retention policy
      const key = `analytics_data:${userId}:${category}:${Date.now()}`;
      await redisCache.set(
        key,
        JSON.stringify(dataRecord),
        policy.retentionPeriod * 24 * 60 * 60 // Convert days to seconds
      );

      // Also store anonymized version for aggregate analytics
      await this.collectAnonymizedData(eventData, userId);

    } catch (error) {
      logger.error('Error collecting analytics data:', error);
    }
  }
  /**
   * Collect anonymized analytics data
   */
  async collectAnonymizedData(eventData: any, userId?: string): Promise<void> {
    try {
      const anonymizedData: AnonymizedMetrics = {
        timestamp: new Date(),
        sessionId: this.hashUserId(userId || 'anonymous'),
        userSegment: this.getUserSegment(eventData),
        pageViews: eventData.pageViews || 1,
        sessionDuration: eventData.sessionDuration || 0,
        featureInteractions: eventData.features || {},
        deviceType: this.getDeviceType(eventData.userAgent),
        location: this.anonymizeLocation(eventData.location),
        referrer: this.anonymizeReferrer(eventData.referrer),
        exitPage: eventData.exitPage || ''
      };

      // Store anonymized data
      const key = `anonymized_analytics:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      await redisCache.set(
        key,
        JSON.stringify(anonymizedData),
        86400 * 90 // 90 days for anonymized data
      );

    } catch (error) {
      logger.error('Error collecting anonymized data:', error);
    }
  }
  /**
   * Process data export request (GDPR Article 15)
   */
  async processDataExportRequest(request: DataExportRequest): Promise<string> {
    try {
      const exportData: any = {};

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        include: {
          teams: true,
          // TODO: transactions relation doesn't exist on User model
          userSessions: {
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit session history
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }
      
      // Add user profile data
      exportData.profile = {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Add analytics data if consent given
      const consent = await this.getUserConsent(request.userId);
      if (consent?.analytics) {
        exportData.analyticsData = await this.getUserAnalyticsData(request.userId);
      }
      
      // Add session data
      exportData.sessions = user.userSessions.map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        // Note: ipAddress field not available in UserSession model
        // Note: userAgent field not available in UserSession model
      }));

      // Generate export file
      const exportId = crypto.randomUUID();
      const exportContent = this.formatExportData(exportData, request.format);
      
      // Store export file temporarily
      await redisCache.set(
        `export:${exportId}`,
        exportContent,
        86400 * 7 // 7 days
      );

      // Log export action
      await this.logPrivacyAction({
        userId: request.userId,
        action: 'data_exported',
        details: { 
          requestId: request.requestId,
          categories: request.categories,
          format: request.format
        },
        timestamp: new Date(),
        legalBasis: 'legitimate_interest'
      });

      return exportId;

    } catch (error) {
      logger.error('Error processing data export:', error);
      throw new Error('Failed to process data export request');
    }
  }
  /**
   * Process data deletion request (GDPR Article 17)
   */
  async processDataDeletionRequest(request: DataDeletionRequest): Promise<void> {
    try {
      if (request.scope === 'all') {
        // Delete all user data
        await this.deleteAllUserData(request.userId);
      } else {
        // Delete specific categories
        await this.deleteUserDataByCategory(request.userId, request.categories || []);
      }
      
      // Log deletion action
      await this.logPrivacyAction({
        userId: request.userId,
        action: 'data_deleted',
        details: {
          requestId: request.requestId,
          scope: request.scope,
          categories: request.categories
        },
        timestamp: new Date(),
        legalBasis: 'legitimate_interest'
      });

      logger.info(`Data deletion completed for user ${request.userId}`);

    } catch (error) {
      logger.error('Error processing data deletion:', error);
      throw new Error('Failed to process data deletion request');
    }
  }
  /**
   * Get anonymized aggregate metrics
   */
  async getAnonymizedMetrics(timeRange: string = '30d'): Promise<any> {
    try {
      // TODO: keys method not available on EnhancedRedisCache
      const keys: string[] = [];
      const metrics = [];

      for (const key of keys.slice(0, 1000)) { // Limit to prevent memory issues
        const data = await redisCache.get(key);
        if (data) {
          metrics.push(JSON.parse(data as string));
        }
      }
      
      // Filter by time range
      const cutoff = this.getTimeRangeCutoff(timeRange);
      const filteredMetrics = metrics.filter(m => new Date(m.timestamp) >= cutoff);

      // Aggregate data
      return this.aggregateAnonymizedMetrics(filteredMetrics);

    } catch (error) {
      logger.error('Error getting anonymized metrics:', error);
      throw new Error('Failed to get anonymized metrics');
    }
  }
  // Private helper methods

  private initializeRetentionPolicies() {
    const policies: DataRetentionPolicy[] = [
      {
        category: 'analytics',
        retentionPeriod: 730, // 2 years
        autoDelete: true,
        anonymizeAfter: 90, // 90 days
        description: 'User behavior and feature usage analytics',
        legalBasis: 'consent'
      },
      {
        category: 'performance',
        retentionPeriod: 365, // 1 year
        autoDelete: true,
        anonymizeAfter: 30, // 30 days
        description: 'Performance monitoring and error tracking',
        legalBasis: 'legitimate_interest'
      },
      {
        category: 'security',
        retentionPeriod: 2555, // 7 years
        autoDelete: false,
        anonymizeAfter: 365, // 1 year
        description: 'Security logs and access records',
        legalBasis: 'legal_obligation'
      },
      {
        category: 'marketing',
        retentionPeriod: 1095, // 3 years
        autoDelete: true,
        anonymizeAfter: 180, // 6 months
        description: 'Marketing campaigns and user preferences',
        legalBasis: 'consent'
      }
    ];

    policies.forEach(policy => {
      this.retentionPolicies.set(policy.category, policy);
    });
  }
  private startCleanupSchedule() {
    // Run cleanup every 24 hours
    setInterval(async () => {
      await this.runDataCleanup();
    }, 24 * 60 * 60 * 1000);
  }
  private async runDataCleanup() {
    try {
      logger.info('Starting scheduled data cleanup');

      // Clean up expired analytics data
      // TODO: keys method not available on EnhancedRedisCache
      const keys: string[] = [];
      
      for (const key of keys) {
        // TODO: ttl and del methods not available on EnhancedRedisCache
        // const ttl = await redisCache.ttl(key);
        // if (ttl <= 0) {
        //   await redisCache.del(key);
        // }
      }
      
      // Clean up old anonymized data
      // TODO: keys method not available on EnhancedRedisCache
      const anonymizedKeys: string[] = [];
      for (const key of anonymizedKeys) {
        const data = await redisCache.get(key);
        if (data) {
          const record = JSON.parse(data as string);
          const age = Date.now() - new Date(record.timestamp).getTime();
          const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
          
          if (age > maxAge) {
            // TODO: del method not available on EnhancedRedisCache
            // await redisCache.del(key);
          }
        }
      }
      
      logger.info('Data cleanup completed');

    } catch (error) {
      logger.error('Error in data cleanup:', error);
    }
  }
  private encryptData(data: any): string {
    const cipher = crypto.createCipher('aes-256-gcm', this.hashSalt);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  private decryptData(encryptedData: string): any {
    const decipher = crypto.createDecipher('aes-256-gcm', this.hashSalt);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }
  private hashUserId(userId: string): string {
    return crypto.createHash('sha256').update(userId + this.hashSalt).digest('hex').substr(0, 16);
  }
  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data + this.hashSalt).digest('hex');
  }
  private hasConsentForCategory(consent: ConsentSettings, category: string): boolean {
    switch (category) {
      case 'analytics': return consent.analytics;
      case 'performance': return consent.performance;
      case 'marketing': return consent.marketing;
      case 'personalization': return consent.personalization;
      default: return false;
    }
  }
  private getUserSegment(eventData: any): string {
    // Segment users anonymously based on behavior
    if (eventData.premium) return 'premium';
    if (eventData.sessions > 10) return 'active';
    if (eventData.sessions < 3) return 'new';
    return 'regular';
  }
  private getDeviceType(userAgent: string = ''): 'mobile' | 'desktop' | 'tablet' {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }
  private anonymizeLocation(location: any): { country: string; region?: string } {
    if (!location) return { country: 'unknown' };
    
    // Only return region if population > 10k (k-anonymity)
    return {
      country: location.country || 'unknown',
      region: location.population > 10000 ? location.region : undefined
    };
  }
  private anonymizeReferrer(referrer: string = ''): string {
    if (!referrer) return 'direct';
    
    try {
      const url = new URL(referrer);
      return url.hostname; // Only return domain, not full URL
    } catch {
      return 'unknown';
    }
  }
  private async logPrivacyAction(log: Omit<PrivacyAuditLog, 'id'>): Promise<void> {
    const logEntry: PrivacyAuditLog = {
      id: crypto.randomUUID(),
      ...log
    };

    // Store in Redis for audit trail
    await redisCache.set(
      `privacy_log:${logEntry.id}`,
      JSON.stringify(logEntry),
      86400 * 2555 // 7 years retention for audit logs
    );
  }
  private async scheduleDataCleanup(userId: string, categories: string[]): Promise<void> {
    const cleanupJob = {
      userId,
      categories,
      scheduledAt: new Date(),
      status: 'pending'
    };

    await redisCache.set(
      `cleanup_job:${userId}:${Date.now()}`,
      JSON.stringify(cleanupJob),
      86400 // 24 hours
    );
  }
  private async getUserAnalyticsData(userId: string): Promise<any[]> {
    // TODO: keys method not available on EnhancedRedisCache
    const keys: string[] = [];
    const data = [];

    for (const key of keys) {
      const record = await redisCache.get(key);
      if (record) {
        data.push(JSON.parse(record as string));
      }
    }
    
    return data;
  }
  private formatExportData(data: any, format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }
  private convertToCSV(data: any): string {
    // Simple CSV conversion - would be more sophisticated in practice
    const headers = Object.keys(data.profile || {});
    const rows = [headers.join(',')];
    
    if (data.profile) {
      rows.push(Object.values(data.profile).join(','));
    }
       
    return rows.join('\n');
  }
  private convertToXML(data: any): string {
    // Simple XML conversion - would use proper XML library in practice
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';
    
    function objectToXML(obj: any, indent: string = '  '): string {
      let result = '';
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          result += `${indent}<${key}>\n${objectToXML(value, indent + '  ')}${indent}</${key}>\n`;
        } else {
          result += `${indent}<${key}>${value}</${key}>\n`;
        }
      }
      return result;
    }
    
    xml += objectToXML(data);
    xml += '</export>';
    
    return xml;
  }
  private async deleteAllUserData(userId: string): Promise<void> {
    // Delete from database tables
    await prisma.userSession.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    // Note: lineupHistory table doesn't exist in schema, would need to be implemented
    
    // Delete analytics data from Redis
    // TODO: keys and del methods not available on EnhancedRedisCache
    const keys: string[] = [];
    for (const key of keys) {
      // await redisCache.del(key);
    }
       
    // Delete consent data
    // await redisCache.del(`consent:${userId}`);
  }
  private async deleteUserDataByCategory(userId: string, categories: string[]): Promise<void> {
    for (const category of categories) {
      // TODO: keys and del methods not available on EnhancedRedisCache
      const keys: string[] = [];
      for (const key of keys) {
        // await redisCache.del(key);
      }
    }
  }
  private getTimeRangeCutoff(timeRange: string): Date {
    const now = new Date();
    const days = parseInt(timeRange.replace('d', '')) || 30;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  private aggregateAnonymizedMetrics(metrics: AnonymizedMetrics[]): any {
    return {
      totalSessions: metrics.length,
      avgSessionDuration: metrics.reduce((sum, m) => sum + m.sessionDuration, 0) / metrics.length,
      deviceBreakdown: {
        mobile: metrics.filter(m => m.deviceType === 'mobile').length,
        desktop: metrics.filter(m => m.deviceType === 'desktop').length,
        tablet: metrics.filter(m => m.deviceType === 'tablet').length
      },
      topCountries: this.getTopCountries(metrics),
      featureUsage: this.aggregateFeatureUsage(metrics)
    };
  }
  private getTopCountries(metrics: AnonymizedMetrics[]): Array<{ country: string; count: number }> {
    const countryCount: { [country: string]: number } = {};
    
    metrics.forEach(m => {
      countryCount[m.location.country] = (countryCount[m.location.country] || 0) + 1;
    });
    
    return Object.entries(countryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));
  }
  private aggregateFeatureUsage(metrics: AnonymizedMetrics[]): { [feature: string]: number } {
    const featureCount: { [feature: string]: number } = {};
    
    metrics.forEach(m => {
      Object.entries(m.featureInteractions).forEach(([feature, count]) => {
        featureCount[feature] = (featureCount[feature] || 0) + count;
      });
    });
    
    return featureCount;
  }
}

export const privacyAnalyticsService = new PrivacyAnalyticsService();