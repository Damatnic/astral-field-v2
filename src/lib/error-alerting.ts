/**
 * Real-time Error Monitoring and Alerting System
 * Provides real-time error monitoring, alerting, and notification capabilities
 */

import { logger, logError, logSecurity } from './logger';
import { errorTracker, ErrorMetrics, ErrorSeverity, ErrorCategory, StructuredError } from './error-tracking';

// Alert configuration interface
export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: ErrorSeverity[];
  categories: ErrorCategory[];
  thresholds: {
    errorCount?: number;
    errorRate?: number;
    timeWindow?: number; // minutes
  };
  actions: AlertAction[];
  cooldown?: number; // minutes
  lastTriggered?: Date;
}

// Alert action types
export interface AlertAction {
  type: 'webhook' | 'email' | 'sms' | 'slack' | 'teams' | 'log';
  config: {
    url?: string;
    recipients?: string[];
    template?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
  enabled: boolean;
}

// Alert event interface
export interface AlertEvent {
  id: string;
  alertConfigId: string;
  triggeredAt: Date;
  severity: ErrorSeverity;
  message: string;
  details: {
    errorCount: number;
    errorRate: number;
    timeWindow: number;
    affectedErrors: StructuredError[];
    metrics: ErrorMetrics;
  };
  actions: {
    type: string;
    status: 'pending' | 'success' | 'failed';
    executedAt?: Date;
    error?: string;
  }[];
  resolved?: boolean;
  resolvedAt?: Date;
}

// Monitoring stats
export interface MonitoringStats {
  alertsTriggered: number;
  activeAlerts: number;
  lastAlertTime?: Date;
  errorTrends: {
    hourly: number[];
    daily: number[];
    categories: Record<ErrorCategory, number>;
    severities: Record<ErrorSeverity, number>;
  };
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    errorRate: number;
    responseTime: number;
  };
}

class ErrorAlertingSystem {
  private static instance: ErrorAlertingSystem;
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private alertHistory: AlertEvent[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private webhookQueue: Array<{ url: string; payload: any; retries: number }> = [];
  private maxRetries = 3;
  private systemStartTime = Date.now();

  private constructor() {
    this.setupDefaultAlerts();
    this.startMonitoring();
  }

  static getInstance(): ErrorAlertingSystem {
    if (!ErrorAlertingSystem.instance) {
      ErrorAlertingSystem.instance = new ErrorAlertingSystem();
    }
    return ErrorAlertingSystem.instance;
  }

  private setupDefaultAlerts(): void {
    // Critical error alert
    this.addAlertConfig({
      id: 'critical-errors',
      name: 'Critical Errors',
      description: 'Alert when critical errors occur',
      enabled: true,
      severity: [ErrorSeverity.CRITICAL],
      categories: Object.values(ErrorCategory),
      thresholds: {
        errorCount: 1,
        timeWindow: 5
      },
      actions: [
        {
          type: 'webhook',
          config: {
            url: process.env.CRITICAL_ALERT_WEBHOOK,
            priority: 'critical'
          },
          enabled: !!process.env.CRITICAL_ALERT_WEBHOOK
        },
        {
          type: 'log',
          config: {
            priority: 'critical'
          },
          enabled: true
        }
      ],
      cooldown: 10
    });

    // High error rate alert
    this.addAlertConfig({
      id: 'high-error-rate',
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds threshold',
      enabled: true,
      severity: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
      categories: Object.values(ErrorCategory),
      thresholds: {
        errorRate: 10, // 10 errors per hour
        timeWindow: 60
      },
      actions: [
        {
          type: 'webhook',
          config: {
            url: process.env.ERROR_RATE_WEBHOOK,
            priority: 'high'
          },
          enabled: !!process.env.ERROR_RATE_WEBHOOK
        },
        {
          type: 'log',
          config: {
            priority: 'high'
          },
          enabled: true
        }
      ],
      cooldown: 30
    });

    // Database error alert
    this.addAlertConfig({
      id: 'database-errors',
      name: 'Database Errors',
      description: 'Alert when database errors occur',
      enabled: true,
      severity: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
      categories: [ErrorCategory.DATABASE_ERROR],
      thresholds: {
        errorCount: 5,
        timeWindow: 15
      },
      actions: [
        {
          type: 'webhook',
          config: {
            url: process.env.DB_ERROR_WEBHOOK,
            priority: 'high'
          },
          enabled: !!process.env.DB_ERROR_WEBHOOK
        },
        {
          type: 'log',
          config: {
            priority: 'high'
          },
          enabled: true
        }
      ],
      cooldown: 20
    });

    // Authentication error spike
    this.addAlertConfig({
      id: 'auth-error-spike',
      name: 'Authentication Error Spike',
      description: 'Alert when authentication errors spike (potential attack)',
      enabled: true,
      severity: Object.values(ErrorSeverity),
      categories: [ErrorCategory.AUTHENTICATION_ERROR, ErrorCategory.AUTHORIZATION_ERROR],
      thresholds: {
        errorCount: 10,
        timeWindow: 10
      },
      actions: [
        {
          type: 'webhook',
          config: {
            url: process.env.SECURITY_ALERT_WEBHOOK,
            priority: 'critical'
          },
          enabled: !!process.env.SECURITY_ALERT_WEBHOOK
        },
        {
          type: 'log',
          config: {
            priority: 'critical'
          },
          enabled: true
        }
      ],
      cooldown: 5
    });
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Check for alerts every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkAlerts();
      this.processWebhookQueue();
    }, 30000);

    logger.info('Error alerting system started');
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    logger.info('Error alerting system stopped');
  }

  private async checkAlerts(): Promise<void> {
    try {
      for (const [configId, config] of this.alertConfigs) {
        if (!config.enabled) continue;

        // Check cooldown
        if (config.lastTriggered && config.cooldown) {
          const timeSinceLastTrigger = Date.now() - config.lastTriggered.getTime();
          if (timeSinceLastTrigger < config.cooldown * 60 * 1000) {
            continue;
          }
        }

        const shouldTrigger = await this.evaluateAlertCondition(config);
        if (shouldTrigger) {
          await this.triggerAlert(config);
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'alert_checking' });
    }
  }

  private async evaluateAlertCondition(config: AlertConfig): Promise<boolean> {
    const timeWindow = config.thresholds.timeWindow || 60; // Default 1 hour
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow * 60 * 1000);

    // Get metrics for the time window
    const metrics = errorTracker.getErrorMetrics({ start: startTime, end: endTime });
    
    // Filter errors by severity and category
    const recentErrors = errorTracker.getRecentErrors(1000);
    const relevantErrors = recentErrors.filter(error => {
      const matchesSeverity = config.severity.includes(error.severity);
      const matchesCategory = config.categories.includes(error.category);
      const withinTimeWindow = error.lastSeen && 
        error.lastSeen >= startTime && 
        error.lastSeen <= endTime;
      
      return matchesSeverity && matchesCategory && withinTimeWindow;
    });

    const errorCount = relevantErrors.reduce((sum, error) => sum + (error.count || 1), 0);
    const errorRate = errorCount / (timeWindow / 60); // errors per hour

    // Check thresholds
    if (config.thresholds.errorCount && errorCount >= config.thresholds.errorCount) {
      return true;
    }

    if (config.thresholds.errorRate && errorRate >= config.thresholds.errorRate) {
      return true;
    }

    return false;
  }

  private async triggerAlert(config: AlertConfig): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const triggeredAt = new Date();

    // Update last triggered time
    config.lastTriggered = triggeredAt;

    // Get current metrics
    const timeWindow = config.thresholds.timeWindow || 60;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindow * 60 * 1000);
    const metrics = errorTracker.getErrorMetrics({ start: startTime, end: endTime });

    // Get affected errors
    const recentErrors = errorTracker.getRecentErrors(100);
    const affectedErrors = recentErrors.filter(error => {
      const matchesSeverity = config.severity.includes(error.severity);
      const matchesCategory = config.categories.includes(error.category);
      const withinTimeWindow = error.lastSeen && 
        error.lastSeen >= startTime && 
        error.lastSeen <= endTime;
      
      return matchesSeverity && matchesCategory && withinTimeWindow;
    });

    const errorCount = affectedErrors.reduce((sum, error) => sum + (error.count || 1), 0);
    const errorRate = errorCount / (timeWindow / 60);

    // Determine alert severity
    const alertSeverity = this.determineAlertSeverity(config, affectedErrors);

    // Create alert event
    const alertEvent: AlertEvent = {
      id: alertId,
      alertConfigId: config.id,
      triggeredAt,
      severity: alertSeverity,
      message: this.generateAlertMessage(config, errorCount, errorRate),
      details: {
        errorCount,
        errorRate,
        timeWindow,
        affectedErrors,
        metrics
      },
      actions: config.actions.map(action => ({
        type: action.type,
        status: 'pending'
      }))
    };

    // Store alert
    this.activeAlerts.set(alertId, alertEvent);
    this.alertHistory.push(alertEvent);

    // Execute alert actions
    await this.executeAlertActions(alertEvent, config.actions);

    // Log alert
    logSecurity('alert_triggered', {
      alertId,
      configId: config.id,
      severity: alertSeverity,
      errorCount,
      errorRate,
      timeWindow
    });

    logger.warn({
      alert: {
        id: alertId,
        name: config.name,
        severity: alertSeverity,
        errorCount,
        errorRate,
        timeWindow
      }
    }, 'Error alert triggered');
  }

  private determineAlertSeverity(config: AlertConfig, errors: StructuredError[]): ErrorSeverity {
    // Use the highest severity from affected errors
    const severities = errors.map(error => error.severity);
    
    if (severities.includes(ErrorSeverity.CRITICAL)) return ErrorSeverity.CRITICAL;
    if (severities.includes(ErrorSeverity.HIGH)) return ErrorSeverity.HIGH;
    if (severities.includes(ErrorSeverity.MEDIUM)) return ErrorSeverity.MEDIUM;
    
    return ErrorSeverity.LOW;
  }

  private generateAlertMessage(config: AlertConfig, errorCount: number, errorRate: number): string {
    return `${config.name}: ${errorCount} errors detected (${errorRate.toFixed(1)} errors/hour)`;
  }

  private async executeAlertActions(alertEvent: AlertEvent, actions: AlertAction[]): Promise<void> {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!action.enabled) continue;

      try {
        alertEvent.actions[i].status = 'pending';
        alertEvent.actions[i].executedAt = new Date();

        await this.executeAction(action, alertEvent);
        
        alertEvent.actions[i].status = 'success';
      } catch (error) {
        alertEvent.actions[i].status = 'failed';
        alertEvent.actions[i].error = (error as Error).message;
        
        logError(error as Error, {
          context: 'alert_action_execution',
          alertId: alertEvent.id,
          actionType: action.type
        });
      }
    }
  }

  private async executeAction(action: AlertAction, alertEvent: AlertEvent): Promise<void> {
    switch (action.type) {
      case 'webhook':
        await this.executeWebhookAction(action, alertEvent);
        break;
      
      case 'log':
        await this.executeLogAction(action, alertEvent);
        break;
      
      case 'email':
        // Email action would be implemented here
        logger.info('Email alert action not implemented');
        break;
      
      case 'slack':
        // Slack action would be implemented here
        logger.info('Slack alert action not implemented');
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeWebhookAction(action: AlertAction, alertEvent: AlertEvent): Promise<void> {
    if (!action.config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alertId: alertEvent.id,
      severity: alertEvent.severity,
      message: alertEvent.message,
      triggeredAt: alertEvent.triggeredAt,
      details: {
        errorCount: alertEvent.details.errorCount,
        errorRate: alertEvent.details.errorRate,
        timeWindow: alertEvent.details.timeWindow,
        topErrors: alertEvent.details.affectedErrors.slice(0, 5).map(error => ({
          message: error.message,
          severity: error.severity,
          category: error.category,
          count: error.count,
          component: error.context.component
        }))
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    // Add to webhook queue for retry logic
    this.webhookQueue.push({
      url: action.config.url,
      payload,
      retries: 0
    });
  }

  private async executeLogAction(action: AlertAction, alertEvent: AlertEvent): Promise<void> {
    const priority = action.config.priority || 'medium';
    
    switch (priority) {
      case 'critical':
        logger.fatal({
          alert: alertEvent
        }, `CRITICAL ALERT: ${alertEvent.message}`);
        break;
      
      case 'high':
        logger.error({
          alert: alertEvent
        }, `HIGH ALERT: ${alertEvent.message}`);
        break;
      
      case 'medium':
        logger.warn({
          alert: alertEvent
        }, `MEDIUM ALERT: ${alertEvent.message}`);
        break;
      
      case 'low':
        logger.info({
          alert: alertEvent
        }, `LOW ALERT: ${alertEvent.message}`);
        break;
    }
  }

  private async processWebhookQueue(): Promise<void> {
    const webhooksToProcess = [...this.webhookQueue];
    this.webhookQueue = [];

    for (const webhook of webhooksToProcess) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhook.payload)
        });

        if (!response.ok) {
          throw new Error(`Webhook failed with status: ${response.status}`);
        }

        logger.debug({
          webhook: {
            url: webhook.url,
            status: response.status,
            retries: webhook.retries
          }
        }, 'Webhook delivered successfully');

      } catch (error) {
        webhook.retries++;
        
        if (webhook.retries < this.maxRetries) {
          // Add back to queue for retry
          this.webhookQueue.push(webhook);
          
          logger.warn({
            webhook: {
              url: webhook.url,
              error: (error as Error).message,
              retries: webhook.retries
            }
          }, 'Webhook delivery failed, will retry');
        } else {
          logger.error({
            webhook: {
              url: webhook.url,
              error: (error as Error).message,
              retries: webhook.retries
            }
          }, 'Webhook delivery failed after max retries');
        }
      }
    }
  }

  // Public methods
  public addAlertConfig(config: AlertConfig): void {
    this.alertConfigs.set(config.id, config);
    logger.info({
      alertConfig: {
        id: config.id,
        name: config.name,
        enabled: config.enabled
      }
    }, 'Alert configuration added');
  }

  public removeAlertConfig(configId: string): void {
    this.alertConfigs.delete(configId);
    logger.info({ configId }, 'Alert configuration removed');
  }

  public getAlertConfigs(): AlertConfig[] {
    return Array.from(this.alertConfigs.values());
  }

  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(limit: number = 100): AlertEvent[] {
    return this.alertHistory
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(alertId);
      
      logger.info({ alertId }, 'Alert resolved');
    }
  }

  public getMonitoringStats(): MonitoringStats {
    const uptime = Date.now() - this.systemStartTime;
    const metrics = errorTracker.getErrorMetrics();
    
    return {
      alertsTriggered: this.alertHistory.length,
      activeAlerts: this.activeAlerts.size,
      lastAlertTime: this.alertHistory.length > 0 
        ? this.alertHistory[this.alertHistory.length - 1].triggeredAt 
        : undefined,
      errorTrends: {
        hourly: [], // Would be implemented with time-series data
        daily: [],
        categories: metrics.errorsByCategory,
        severities: metrics.errorsBySeverity
      },
      systemHealth: {
        status: this.determineSystemHealth(metrics),
        uptime: uptime / 1000, // seconds
        errorRate: metrics.errorRate,
        responseTime: 0 // Would be tracked separately
      }
    };
  }

  private determineSystemHealth(metrics: ErrorMetrics): 'healthy' | 'degraded' | 'critical' {
    const criticalErrors = metrics.errorsBySeverity[ErrorSeverity.CRITICAL] || 0;
    const highErrors = metrics.errorsBySeverity[ErrorSeverity.HIGH] || 0;
    
    if (criticalErrors > 0 || metrics.errorRate > 50) {
      return 'critical';
    }
    
    if (highErrors > 5 || metrics.errorRate > 20) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

// Singleton instance
export const errorAlerting = ErrorAlertingSystem.getInstance();

// Convenience functions
export const addAlert = (config: AlertConfig) => errorAlerting.addAlertConfig(config);
export const removeAlert = (configId: string) => errorAlerting.removeAlertConfig(configId);
export const getAlerts = () => errorAlerting.getAlertConfigs();
export const getActiveAlerts = () => errorAlerting.getActiveAlerts();
export const resolveAlert = (alertId: string) => errorAlerting.resolveAlert(alertId);
export const getMonitoringStats = () => errorAlerting.getMonitoringStats();

export default errorAlerting;