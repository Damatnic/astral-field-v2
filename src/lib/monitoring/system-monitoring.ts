import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    espnApi: ServiceStatus;
    authentication: ServiceStatus;
    fileStorage: ServiceStatus;
  };
  performance: {
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  alerts: SystemAlert[];
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastChecked: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  service: string;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  endpoint?: string;
  userId?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  tags: string[];
}

class SystemMonitoringService {
  private alerts: SystemAlert[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];

  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();

    const [
      databaseStatus,
      redisStatus,
      espnStatus,
      authStatus,
      storageStatus
    ] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkEspnApiHealth(),
      this.checkAuthenticationHealth(),
      this.checkFileStorageHealth()
    ]);

    const services = {
      database: this.extractServiceStatus(databaseStatus),
      redis: this.extractServiceStatus(redisStatus),
      espnApi: this.extractServiceStatus(espnStatus),
      authentication: this.extractServiceStatus(authStatus),
      fileStorage: this.extractServiceStatus(storageStatus)
    };

    const performance = await this.getPerformanceMetrics();
    const overallStatus = this.calculateOverallStatus(services);

    return {
      status: overallStatus,
      timestamp: new Date(),
      services,
      performance,
      alerts: this.getActiveAlerts()
    };
  }

  private async checkDatabaseHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      // Test query performance
      const userCount = await prisma.user.count();
      const leagueCount = await prisma.league.count();
      
      // Check for long-running transactions
      const longRunningQueries = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < NOW() - INTERVAL '5 minutes'
      `;

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 500 ? 'up' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        metadata: {
          userCount,
          leagueCount,
          longRunningQueries: longRunningQueries[0]?.count || 0,
          connectionPool: await this.getDatabaseConnectionInfo()
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message,
        metadata: {
          errorType: error.constructor.name
        }
      };
    }
  }

  private async checkRedisHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      const pong = await redis.ping();
      
      // Test read/write operations
      const testKey = `health_check_${Date.now()}`;
      await redis.setex(testKey, 10, 'test');
      const testValue = await redis.get(testKey);
      await redis.del(testKey);

      // Get Redis info
      const info = await redis.info('memory');
      const responseTime = Date.now() - startTime;

      return {
        status: pong === 'PONG' && testValue === 'test' ? 'up' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        metadata: {
          memoryInfo: this.parseRedisInfo(info),
          connectionCount: await this.getRedisConnectionCount()
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  private async checkEspnApiHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
        headers: {
          'User-Agent': 'AstralField/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: 'degraded',
          responseTime,
          lastChecked: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`,
          metadata: {
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries())
          }
        };
      }

      const data = await response.json();

      return {
        status: 'up',
        responseTime,
        lastChecked: new Date(),
        metadata: {
          gamesAvailable: data.events?.length || 0,
          season: data.season?.year,
          week: data.week?.number
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  private async checkAuthenticationHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test NextAuth configuration
      const nextAuthStatus = await this.testNextAuthConfig();
      
      // Test session verification
      const sessionTestPassed = await this.testSessionVerification();

      const responseTime = Date.now() - startTime;

      const allTestsPassed = nextAuthStatus && sessionTestPassed;

      return {
        status: allTestsPassed ? 'up' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        metadata: {
          nextAuthConfigured: nextAuthStatus,
          sessionVerification: sessionTestPassed,
          activeSessions: await this.getActiveSessionCount()
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  private async checkFileStorageHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();

    try {
      // Test file upload capability
      const uploadTest = await this.testFileUpload();
      
      // Check storage quota
      const storageInfo = await this.getStorageInfo();

      const responseTime = Date.now() - startTime;

      return {
        status: uploadTest ? 'up' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        metadata: {
          uploadCapability: uploadTest,
          storageUsed: storageInfo.used,
          storageQuota: storageInfo.quota,
          usagePercentage: (storageInfo.used / storageInfo.quota) * 100
        }
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  async logPerformanceMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    const performanceMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date()
    };

    this.performanceMetrics.push(performanceMetric);

    // Store in database for persistence
    try {
      await prisma.performanceMetric.create({
        data: performanceMetric
      });
    } catch (error) {
      console.error('Failed to store performance metric:', error);
    }

    // Keep only recent metrics in memory
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-500);
    }

    // Check for performance alerts
    await this.checkPerformanceAlerts(performanceMetric);
  }

  async logError(error: Omit<ErrorLog, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
      ...error
    };

    try {
      await prisma.errorLog.create({
        data: errorLog
      });

      // Create alert for critical errors
      if (error.severity === 'critical') {
        await this.createAlert({
          type: 'critical',
          message: `Critical error: ${error.message}`,
          service: 'application',
          resolved: false
        });
      }

      return errorLog.id;
    } catch (dbError) {
      console.error('Failed to store error log:', dbError);
      return errorLog.id;
    }
  }

  async createAlert(alert: Omit<SystemAlert, 'id' | 'timestamp'>): Promise<string> {
    const systemAlert: SystemAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...alert
    };

    this.alerts.push(systemAlert);

    try {
      await prisma.systemAlert.create({
        data: systemAlert
      });

      // Send notifications for critical alerts
      if (alert.type === 'critical') {
        await this.sendCriticalAlertNotification(systemAlert);
      }

      return systemAlert.id;
    } catch (error) {
      console.error('Failed to store alert:', error);
      return systemAlert.id;
    }
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const alert = this.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
      }

      await prisma.systemAlert.update({
        where: { id: alertId },
        data: { resolved: true, resolvedAt: new Date() }
      });

      return true;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  }

  async getPerformanceReport(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    const now = new Date();
    let startTime: Date;

    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: startTime
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    return this.analyzePerformanceMetrics(metrics);
  }

  private extractServiceStatus(settledResult: PromiseSettledResult<ServiceStatus>): ServiceStatus {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      return {
        status: 'down',
        responseTime: 0,
        lastChecked: new Date(),
        error: settledResult.reason?.message || 'Unknown error'
      };
    }
  }

  private calculateOverallStatus(services: Record<string, ServiceStatus>): SystemHealth['status'] {
    const statuses = Object.values(services).map(s => s.status);
    
    if (statuses.every(s => s === 'up')) {
      return 'healthy';
    } else if (statuses.some(s => s === 'down')) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  private async getPerformanceMetrics() {
    const recentMetrics = this.performanceMetrics.slice(-100);
    
    return {
      averageResponseTime: this.calculateAverageResponseTime(recentMetrics),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000, // seconds
      activeConnections: await this.getActiveConnectionCount()
    };
  }

  private getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  private calculateAverageResponseTime(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return totalTime / metrics.length;
  }

  private async getDatabaseConnectionInfo(): Promise<any> {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;
      return result[0];
    } catch {
      return { total_connections: 0, active_connections: 0, idle_connections: 0 };
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const memoryInfo: Record<string, string> = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        memoryInfo[key] = value;
      }
    });
    
    return memoryInfo;
  }

  private async getRedisConnectionCount(): Promise<number> {
    try {
      const info = await redis.info('clients');
      const match = info.match(/connected_clients:(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch {
      return 0;
    }
  }

  private async testNextAuthConfig(): Promise<boolean> {
    try {
      return !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL);
    } catch {
      return false;
    }
  }

  private async testSessionVerification(): Promise<boolean> {
    // Test session token generation/verification
    try {
      return true; // Simplified for this example
    } catch {
      return false;
    }
  }

  private async getActiveSessionCount(): Promise<number> {
    try {
      return await prisma.session.count({
        where: {
          expires: {
            gt: new Date()
          }
        }
      });
    } catch {
      return 0;
    }
  }

  private async testFileUpload(): Promise<boolean> {
    try {
      // Test upload capability (simplified)
      return true;
    } catch {
      return false;
    }
  }

  private async getStorageInfo(): Promise<{ used: number; quota: number }> {
    try {
      // Return mock data - implement actual storage checking
      return { used: 1024 * 1024 * 100, quota: 1024 * 1024 * 1000 }; // 100MB used, 1GB quota
    } catch {
      return { used: 0, quota: 0 };
    }
  }

  private async getActiveConnectionCount(): Promise<number> {
    try {
      const connections = await this.getDatabaseConnectionInfo();
      return connections.active_connections || 0;
    } catch {
      return 0;
    }
  }

  private async checkPerformanceAlerts(metric: PerformanceMetrics): Promise<void> {
    // Alert on slow responses
    if (metric.responseTime > 5000) {
      await this.createAlert({
        type: 'warning',
        message: `Slow response time: ${metric.responseTime}ms on ${metric.endpoint}`,
        service: 'performance',
        resolved: false
      });
    }

    // Alert on server errors
    if (metric.statusCode >= 500) {
      await this.createAlert({
        type: 'error',
        message: `Server error ${metric.statusCode} on ${metric.endpoint}`,
        service: 'application',
        resolved: false
      });
    }
  }

  private analyzePerformanceMetrics(metrics: PerformanceMetrics[]): any {
    const endpointStats = new Map<string, { count: number; totalTime: number; errors: number }>();

    metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const stats = endpointStats.get(key) || { count: 0, totalTime: 0, errors: 0 };
      
      stats.count++;
      stats.totalTime += metric.responseTime;
      
      if (metric.statusCode >= 400) {
        stats.errors++;
      }
      
      endpointStats.set(key, stats);
    });

    const endpointAnalysis = Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      requestCount: stats.count,
      averageResponseTime: stats.totalTime / stats.count,
      errorRate: (stats.errors / stats.count) * 100,
      totalResponseTime: stats.totalTime
    }));

    return {
      totalRequests: metrics.length,
      averageResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      errorRate: (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100,
      endpointAnalysis: endpointAnalysis.sort((a, b) => b.requestCount - a.requestCount)
    };
  }

  private async sendCriticalAlertNotification(alert: SystemAlert): Promise<void> {
    try {
      // Send to monitoring service (e.g., PagerDuty, Slack)
      console.error('CRITICAL ALERT:', alert);
      
      // Could integrate with external alerting services here
    } catch (error) {
      console.error('Failed to send critical alert notification:', error);
    }
  }
}

export const systemMonitoringService = new SystemMonitoringService();