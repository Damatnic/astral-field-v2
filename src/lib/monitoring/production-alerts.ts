import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis';

interface AlertConfig {
  type: 'system' | 'user' | 'business' | 'security';
  threshold: number;
  interval: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  recipients: string[];
  channels: ('email' | 'slack' | 'webhook')[];
}

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export class ProductionAlertsService {
  private redis: Redis;
  private prisma: PrismaClient;
  private alertConfigs: Map<string, AlertConfig>;
  private activeAlerts: Map<string, Alert>;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.prisma = new PrismaClient();
    this.alertConfigs = new Map();
    this.activeAlerts = new Map();
    this.initializeAlertConfigs();
  }

  private initializeAlertConfigs() {
    // System Health Alerts
    this.alertConfigs.set('api_response_time', {
      type: 'system',
      threshold: 5000, // 5 seconds
      interval: 5,
      severity: 'high',
      enabled: true,
      recipients: ['admin@astralfield.com'],
      channels: ['email', 'slack']
    });

    this.alertConfigs.set('database_connection_failures', {
      type: 'system',
      threshold: 5,
      interval: 5,
      severity: 'critical',
      enabled: true,
      recipients: ['admin@astralfield.com', 'dev@astralfield.com'],
      channels: ['email', 'slack']
    });

    this.alertConfigs.set('redis_connection_failures', {
      type: 'system',
      threshold: 3,
      interval: 5,
      severity: 'high',
      enabled: true,
      recipients: ['admin@astralfield.com'],
      channels: ['email', 'slack']
    });

    this.alertConfigs.set('error_rate_spike', {
      type: 'system',
      threshold: 10, // 10% error rate
      interval: 10,
      severity: 'high',
      enabled: true,
      recipients: ['admin@astralfield.com', 'dev@astralfield.com'],
      channels: ['email', 'slack']
    });

    // User Activity Alerts
    this.alertConfigs.set('user_registration_drop', {
      type: 'user',
      threshold: -50, // 50% drop
      interval: 60,
      severity: 'medium',
      enabled: true,
      recipients: ['growth@astralfield.com'],
      channels: ['email', 'slack']
    });

    this.alertConfigs.set('active_users_drop', {
      type: 'user',
      threshold: -30, // 30% drop
      interval: 30,
      severity: 'medium',
      enabled: true,
      recipients: ['product@astralfield.com'],
      channels: ['email']
    });

    this.alertConfigs.set('failed_logins_spike', {
      type: 'security',
      threshold: 100,
      interval: 10,
      severity: 'high',
      enabled: true,
      recipients: ['security@astralfield.com', 'admin@astralfield.com'],
      channels: ['email', 'slack']
    });

    // Business Metrics Alerts
    this.alertConfigs.set('league_creation_drop', {
      type: 'business',
      threshold: -25, // 25% drop
      interval: 60,
      severity: 'medium',
      enabled: true,
      recipients: ['product@astralfield.com'],
      channels: ['email']
    });

    this.alertConfigs.set('trade_volume_drop', {
      type: 'business',
      threshold: -40, // 40% drop
      interval: 60,
      severity: 'low',
      enabled: true,
      recipients: ['product@astralfield.com'],
      channels: ['email']
    });

    // Security Alerts
    this.alertConfigs.set('suspicious_api_activity', {
      type: 'security',
      threshold: 1000, // requests per minute from single IP
      interval: 1,
      severity: 'critical',
      enabled: true,
      recipients: ['security@astralfield.com', 'admin@astralfield.com'],
      channels: ['email', 'slack', 'webhook']
    });

    this.alertConfigs.set('multiple_account_creation', {
      type: 'security',
      threshold: 10, // accounts from same IP/hour
      interval: 60,
      severity: 'medium',
      enabled: true,
      recipients: ['security@astralfield.com'],
      channels: ['email']
    });
  }

  async checkSystemHealth(): Promise<void> {
    const healthChecks = [
      this.checkApiResponseTime(),
      this.checkDatabaseConnections(),
      this.checkRedisConnections(),
      this.checkErrorRates(),
    ];

    await Promise.all(healthChecks);
  }

  async checkUserMetrics(): Promise<void> {
    const userChecks = [
      this.checkUserRegistrations(),
      this.checkActiveUsers(),
      this.checkFailedLogins(),
    ];

    await Promise.all(userChecks);
  }

  async checkBusinessMetrics(): Promise<void> {
    const businessChecks = [
      this.checkLeagueCreation(),
      this.checkTradeVolume(),
    ];

    await Promise.all(businessChecks);
  }

  async checkSecurityMetrics(): Promise<void> {
    const securityChecks = [
      this.checkSuspiciousActivity(),
      this.checkMultipleAccountCreation(),
    ];

    await Promise.all(securityChecks);
  }

  private async checkApiResponseTime(): Promise<void> {
    const key = 'api_response_times';
    const config = this.alertConfigs.get('api_response_time')!;
    
    try {
      const responseTimes = await this.redis.lrange(`metrics:${key}`, 0, -1);
      const recentTimes = responseTimes
        .map(time => parseInt(time))
        .slice(-100); // Last 100 requests

      if (recentTimes.length === 0) return;

      const avgResponseTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
      const slowRequests = recentTimes.filter(time => time > config.threshold).length;
      const slowRequestPercentage = (slowRequests / recentTimes.length) * 100;

      if (slowRequestPercentage > 20) { // More than 20% of requests are slow
        await this.triggerAlert('api_response_time', {
          message: `API response time degradation: ${avgResponseTime.toFixed(0)}ms avg, ${slowRequestPercentage.toFixed(1)}% of requests over ${config.threshold}ms`,
          metadata: {
            averageResponseTime: avgResponseTime,
            slowRequestPercentage,
            threshold: config.threshold,
            sampleSize: recentTimes.length
          }
        });
      }
    } catch (error) {
      console.error('Error checking API response time:', error);
    }
  }

  private async checkDatabaseConnections(): Promise<void> {
    const key = 'database_connection_failures';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const failures = await this.redis.get(`failures:database:${Math.floor(Date.now() / (config.interval * 60000))}`);
      const failureCount = parseInt(failures as string || '0');

      if (failureCount >= config.threshold) {
        await this.triggerAlert(key, {
          message: `Database connection failures: ${failureCount} failures in last ${config.interval} minutes`,
          metadata: {
            failureCount,
            threshold: config.threshold,
            interval: config.interval
          }
        });
      }
    } catch (error) {
      console.error('Error checking database connections:', error);
    }
  }

  private async checkRedisConnections(): Promise<void> {
    const key = 'redis_connection_failures';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const failures = await this.redis.get(`failures:redis:${Math.floor(Date.now() / (config.interval * 60000))}`);
      const failureCount = parseInt(failures as string || '0');

      if (failureCount >= config.threshold) {
        await this.triggerAlert(key, {
          message: `Redis connection failures: ${failureCount} failures in last ${config.interval} minutes`,
          metadata: {
            failureCount,
            threshold: config.threshold,
            interval: config.interval
          }
        });
      }
    } catch (error) {
      console.error('Error checking Redis connections:', error);
    }
  }

  private async checkErrorRates(): Promise<void> {
    const key = 'error_rate_spike';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const timeSlot = Math.floor(Date.now() / (config.interval * 60000));
      const totalRequests = await this.redis.get(`requests:total:${timeSlot}`);
      const errorRequests = await this.redis.get(`requests:errors:${timeSlot}`);

      const total = parseInt(totalRequests as string || '0');
      const errors = parseInt(errorRequests as string || '0');

      if (total > 100) { // Only alert if we have significant traffic
        const errorRate = (errors / total) * 100;

        if (errorRate >= config.threshold) {
          await this.triggerAlert(key, {
            message: `Error rate spike: ${errorRate.toFixed(2)}% (${errors}/${total} requests) in last ${config.interval} minutes`,
            metadata: {
              errorRate,
              errorCount: errors,
              totalRequests: total,
              threshold: config.threshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking error rates:', error);
    }
  }

  private async checkUserRegistrations(): Promise<void> {
    const key = 'user_registration_drop';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const [currentCount, previousCount] = await Promise.all([
        this.prisma.user.count({
          where: { createdAt: { gte: lastHour } }
        }),
        this.prisma.user.count({
          where: { 
            createdAt: { 
              gte: previousHour,
              lt: lastHour 
            }
          }
        })
      ]);

      if (previousCount > 0) {
        const change = ((currentCount - previousCount) / previousCount) * 100;
        
        if (change <= config.threshold) {
          await this.triggerAlert(key, {
            message: `User registration drop: ${change.toFixed(1)}% change (${currentCount} vs ${previousCount} previous hour)`,
            metadata: {
              currentCount,
              previousCount,
              changePercentage: change,
              threshold: config.threshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking user registrations:', error);
    }
  }

  private async checkActiveUsers(): Promise<void> {
    const key = 'active_users_drop';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const now = new Date();
      const last30Min = new Date(now.getTime() - 30 * 60 * 1000);
      const previous30Min = new Date(now.getTime() - 60 * 60 * 1000);

      const currentActive = await this.redis.scard(`active_users:${Math.floor(last30Min.getTime() / (30 * 60 * 1000))}`);
      const previousActive = await this.redis.scard(`active_users:${Math.floor(previous30Min.getTime() / (30 * 60 * 1000))}`);

      if (previousActive > 0) {
        const change = ((currentActive - previousActive) / previousActive) * 100;
        
        if (change <= config.threshold) {
          await this.triggerAlert(key, {
            message: `Active users drop: ${change.toFixed(1)}% change (${currentActive} vs ${previousActive} previous 30min)`,
            metadata: {
              currentActive,
              previousActive,
              changePercentage: change,
              threshold: config.threshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking active users:', error);
    }
  }

  private async checkFailedLogins(): Promise<void> {
    const key = 'failed_logins_spike';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const timeSlot = Math.floor(Date.now() / (config.interval * 60000));
      const failedLogins = await this.redis.get(`failed_logins:${timeSlot}`);
      const count = parseInt(failedLogins as string || '0');

      if (count >= config.threshold) {
        await this.triggerAlert(key, {
          message: `Failed login spike: ${count} failed attempts in last ${config.interval} minutes`,
          metadata: {
            failedLoginCount: count,
            threshold: config.threshold,
            interval: config.interval
          }
        });
      }
    } catch (error) {
      console.error('Error checking failed logins:', error);
    }
  }

  private async checkLeagueCreation(): Promise<void> {
    const key = 'league_creation_drop';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const [currentCount, previousCount] = await Promise.all([
        this.prisma.league.count({
          where: { createdAt: { gte: lastHour } }
        }),
        this.prisma.league.count({
          where: { 
            createdAt: { 
              gte: previousHour,
              lt: lastHour 
            }
          }
        })
      ]);

      if (previousCount > 0) {
        const change = ((currentCount - previousCount) / previousCount) * 100;
        
        if (change <= config.threshold) {
          await this.triggerAlert(key, {
            message: `League creation drop: ${change.toFixed(1)}% change (${currentCount} vs ${previousCount} previous hour)`,
            metadata: {
              currentCount,
              previousCount,
              changePercentage: change,
              threshold: config.threshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking league creation:', error);
    }
  }

  private async checkTradeVolume(): Promise<void> {
    const key = 'trade_volume_drop';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const [currentCount, previousCount] = await Promise.all([
        this.prisma.trade.count({
          where: { 
            createdAt: { gte: lastHour },
            status: 'COMPLETED'
          }
        }),
        this.prisma.trade.count({
          where: { 
            createdAt: { 
              gte: previousHour,
              lt: lastHour 
            },
            status: 'COMPLETED'
          }
        })
      ]);

      if (previousCount > 0) {
        const change = ((currentCount - previousCount) / previousCount) * 100;
        
        if (change <= config.threshold) {
          await this.triggerAlert(key, {
            message: `Trade volume drop: ${change.toFixed(1)}% change (${currentCount} vs ${previousCount} previous hour)`,
            metadata: {
              currentCount,
              previousCount,
              changePercentage: change,
              threshold: config.threshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking trade volume:', error);
    }
  }

  private async checkSuspiciousActivity(): Promise<void> {
    const key = 'suspicious_api_activity';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const timeSlot = Math.floor(Date.now() / (config.interval * 60000));
      const ipActivityPattern = `ip_activity:${timeSlot}:*`;
      
      // This would require Redis SCAN to check all IPs
      // For now, we'll implement a simplified version
      const suspiciousIPs = await this.redis.smembers('suspicious_ips');
      
      for (const ip of suspiciousIPs) {
        const requestCount = await this.redis.get(`ip_activity:${timeSlot}:${ip}`);
        const count = parseInt(requestCount as string || '0');

        if (count >= config.threshold) {
          await this.triggerAlert(key, {
            message: `Suspicious API activity: ${count} requests from IP ${ip} in last minute`,
            metadata: {
              ipAddress: ip,
              requestCount: count,
              threshold: config.threshold,
              timeWindow: '1 minute'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
    }
  }

  private async checkMultipleAccountCreation(): Promise<void> {
    const key = 'multiple_account_creation';
    const config = this.alertConfigs.get(key)!;
    
    try {
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      
      // Check for multiple accounts from same IP
      const accountsByIP = await this.prisma.$queryRaw<Array<{ip: string, count: bigint}>>`
        SELECT "lastLoginIp" as ip, COUNT(*) as count
        FROM "User" 
        WHERE "createdAt" >= ${lastHour}
        AND "lastLoginIp" IS NOT NULL
        GROUP BY "lastLoginIp"
        HAVING COUNT(*) >= ${config.threshold}
      `;

      for (const result of accountsByIP) {
        const count = Number(result.count);
        if (count >= config.threshold) {
          await this.triggerAlert(key, {
            message: `Multiple account creation: ${count} accounts created from IP ${result.ip} in last hour`,
            metadata: {
              ipAddress: result.ip,
              accountCount: count,
              threshold: config.threshold,
              timeWindow: '1 hour'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking multiple account creation:', error);
    }
  }

  private async triggerAlert(alertType: string, alertData: Partial<Alert>): Promise<void> {
    const config = this.alertConfigs.get(alertType);
    if (!config || !config.enabled) return;

    const alertId = `${alertType}_${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      type: alertType,
      message: alertData.message || 'Unknown alert',
      severity: config.severity,
      timestamp: new Date(),
      resolved: false,
      metadata: alertData.metadata
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert)); // Store for 24 hours

    // Check if we should throttle this alert type
    const recentAlerts = await this.redis.get(`alert_throttle:${alertType}`);
    if (recentAlerts) {
      console.log(`Alert throttled: ${alertType}`);
      return;
    }

    // Set throttle (prevent same alert type for next 15 minutes)
    await this.redis.setex(`alert_throttle:${alertType}`, 900, '1');

    // Send notifications
    for (const channel of config.channels) {
      try {
        await this.sendNotification(channel, alert, config);
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
      }
    }

    console.log(`Alert triggered: ${alertType} - ${alert.message}`);
  }

  private async sendNotification(channel: string, alert: Alert, config: AlertConfig): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmailNotification(alert, config);
        break;
      case 'slack':
        await this.sendSlackNotification(alert, config);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, config);
        break;
      default:
        console.warn(`Unknown notification channel: ${channel}`);
    }
  }

  private async sendEmailNotification(alert: Alert, config: AlertConfig): Promise<void> {
    // In production, this would integrate with an email service like SendGrid
    console.log(`EMAIL ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    console.log(`Recipients: ${config.recipients.join(', ')}`);
    
    // Store email notification record
    await this.redis.lpush('email_notifications', JSON.stringify({
      alert: alert.id,
      recipients: config.recipients,
      timestamp: new Date(),
      subject: `[AstralField ${alert.severity.toUpperCase()}] ${alert.type}`,
      body: alert.message
    }));
  }

  private async sendSlackNotification(alert: Alert, config: AlertConfig): Promise<void> {
    // In production, this would integrate with Slack API
    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff4444',
      critical: '#cc0000'
    }[alert.severity];

    console.log(`SLACK ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Store Slack notification record
    await this.redis.lpush('slack_notifications', JSON.stringify({
      alert: alert.id,
      channel: '#alerts',
      timestamp: new Date(),
      color,
      text: alert.message,
      metadata: alert.metadata
    }));
  }

  private async sendWebhookNotification(alert: Alert, config: AlertConfig): Promise<void> {
    // In production, this would send HTTP POST to configured webhook URLs
    console.log(`WEBHOOK ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Store webhook notification record
    await this.redis.lpush('webhook_notifications', JSON.stringify({
      alert: alert.id,
      timestamp: new Date(),
      payload: {
        alertType: alert.type,
        severity: alert.severity,
        message: alert.message,
        metadata: alert.metadata,
        timestamp: alert.timestamp
      }
    }));
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.activeAlerts.set(alertId, alert);
      await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert));
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  async getAlertHistory(hours: number = 24): Promise<Alert[]> {
    const keys = await this.redis.keys('alert:*');
    const alerts = [];

    for (const key of keys) {
      const alertData = await this.redis.get(key);
      if (alertData) {
        const alert = JSON.parse(alertData);
        const alertTime = new Date(alert.timestamp);
        const hoursAgo = (Date.now() - alertTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursAgo <= hours) {
          alerts.push(alert);
        }
      }
    }

    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async updateAlertConfig(alertType: string, config: Partial<AlertConfig>): Promise<void> {
    const existingConfig = this.alertConfigs.get(alertType);
    if (existingConfig) {
      const updatedConfig = { ...existingConfig, ...config };
      this.alertConfigs.set(alertType, updatedConfig);
      
      // Store updated config in Redis for persistence
      await this.redis.set(`alert_config:${alertType}`, JSON.stringify(updatedConfig));
    }
  }

  // Background monitoring process
  async startMonitoring(): Promise<void> {
    console.log('Starting production monitoring...');

    // Run system checks every 5 minutes
    setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        console.error('System health check failed:', error);
      }
    }, 5 * 60 * 1000);

    // Run user metrics checks every 10 minutes
    setInterval(async () => {
      try {
        await this.checkUserMetrics();
      } catch (error) {
        console.error('User metrics check failed:', error);
      }
    }, 10 * 60 * 1000);

    // Run business metrics checks every 15 minutes
    setInterval(async () => {
      try {
        await this.checkBusinessMetrics();
      } catch (error) {
        console.error('Business metrics check failed:', error);
      }
    }, 15 * 60 * 1000);

    // Run security checks every 1 minute
    setInterval(async () => {
      try {
        await this.checkSecurityMetrics();
      } catch (error) {
        console.error('Security metrics check failed:', error);
      }
    }, 60 * 1000);

    console.log('Production monitoring started successfully');
  }
}

export const productionAlerts = new ProductionAlertsService();