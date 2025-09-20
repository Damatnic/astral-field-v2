/**
 * Real-Time Analytics API Endpoints
 * Live metrics, streaming data, and real-time insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { realTimeAnalyticsService } from '@/services/analytics/realTimeAnalyticsService';
import { privacyAnalyticsService } from '@/services/analytics/privacyAnalyticsService';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Request validation schemas
const RealTimeMetricsQuerySchema = z.object({
  category: z.enum(['all', 'users', 'system', 'fantasy', 'business']).optional().default('all'),
  timeWindow: z.number().min(1).max(1440).optional().default(60), // minutes
  includeTrends: z.boolean().optional().default(false)
});

const EventTrackingSchema = z.object({
  event: z.string().min(1).max(100),
  data: z.record(z.any()).optional().default({}),
  metadata: z.object({
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    location: z.string().optional(),
    referrer: z.string().optional()
  }).optional()
});

const AlertRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  metric: z.string().min(1),
  operator: z.enum(['>', '<', '=', '>=', '<=', '!=']),
  threshold: z.number(),
  timeWindow: z.number().min(1).max(1440).optional().default(15),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  enabled: z.boolean().optional().default(true),
  notifications: z.object({
    email: z.boolean().optional().default(false),
    webhook: z.boolean().optional().default(false),
    sms: z.boolean().optional().default(false)
  }).optional().default({}),
  conditions: z.object({
    minSamples: z.number().min(1).optional().default(1),
    consecutiveAlerts: z.number().min(1).optional().default(1)
  }).optional().default({})
});

const DashboardQuerySchema = z.object({
  refresh: z.boolean().optional().default(false),
  components: z.array(z.enum(['overview', 'charts', 'alerts', 'events'])).optional().default(['overview', 'charts', 'alerts'])
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/realtime - Get real-time metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = RealTimeMetricsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { category, timeWindow, includeTrends } = validationResult.data;

    // Check permissions (admin or analytics access)
    if (!await hasAnalyticsAccess(session.userId)) {
      return NextResponse.json(
        { error: 'Analytics access required' },
        { status: 403 }
      );
    }

    // Get current real-time metrics
    const currentMetrics = await realTimeAnalyticsService.getCurrentMetrics();

    // Filter by category if specified
    const filteredMetrics = filterMetricsByCategory(currentMetrics, category);

    // Build response
    const response: any = {
      success: true,
      data: {
        category,
        timeWindow,
        metrics: filteredMetrics,
        timestamp: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add trends if requested
    if (includeTrends) {
      const metricsHistory = await realTimeAnalyticsService.getMetricsHistory(timeWindow);
      response.data.trends = calculateTrends(metricsHistory, category);
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/realtime',
        method: 'GET',
        category,
        timeWindow,
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Real-time analytics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch real-time metrics',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/realtime/events - Track real-time events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication (optional for anonymous events)
    const session = await getSession(request);

    // Parse request body
    const body = await request.json();
    const validationResult = EventTrackingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid event data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { event, data, metadata } = validationResult.data;

    // Check rate limiting for event tracking
    const rateLimitKey = `event_rate:${session?.userId || 'anonymous'}`;
    const rateLimitResult = await checkEventRateLimit(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded for event tracking' },
        { status: 429 }
      );
    }

    // Create streaming data object
    const streamingData = {
      userId: session?.userId,
      sessionId: session ? `session_${session.userId}` : undefined,
      event,
      data,
      timestamp: new Date(),
      metadata: {
        userAgent: metadata?.userAgent || request.headers.get('user-agent') || '',
        ip: getClientIP(request),
        location: metadata?.location,
        referrer: metadata?.referrer || request.headers.get('referer') || ''
      }
    };

    // Track the event
    await realTimeAnalyticsService.trackEvent(streamingData);

    // Build response
    const response = {
      success: true,
      data: {
        eventId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tracked: true,
        timestamp: streamingData.timestamp,
        requestDuration: Date.now() - startTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Event tracking API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to track event',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/analytics/realtime/dashboard - Get live dashboard data
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validationResult = DashboardQuerySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid dashboard query',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { refresh, components } = validationResult.data;

    // Check analytics access
    if (!await hasAnalyticsAccess(session.userId)) {
      return NextResponse.json(
        { error: 'Dashboard access required' },
        { status: 403 }
      );
    }

    // Get live dashboard data
    const dashboardData = await realTimeAnalyticsService.getLiveDashboardData();

    // Filter components if specified
    const filteredData = filterDashboardComponents(dashboardData, components);

    // Build response
    const response = {
      success: true,
      data: {
        dashboard: filteredData,
        components,
        refreshed: refresh,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/realtime/dashboard',
        method: 'PUT',
        components,
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Dashboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analytics/realtime/alerts - Manage alert rules
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin access for alert management
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required for alert management' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const action = body.action; // 'create', 'update', 'delete', 'list'

    let response: any = {
      success: true,
      requestDuration: Date.now() - startTime
    };

    switch (action) {
      case 'create':
      case 'update':
        const validationResult = AlertRuleSchema.safeParse(body.rule);
        if (!validationResult.success) {
          return NextResponse.json(
            { 
              error: 'Invalid alert rule',
              details: validationResult.error.errors
            },
            { status: 400 }
          );
        }

        const rule = {
          ...validationResult.data,
          id: validationResult.data.id || `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        await realTimeAnalyticsService.setAlertRule(rule);
        response.data = { rule, action };
        break;

      case 'delete':
        if (!body.ruleId) {
          return NextResponse.json(
            { error: 'Rule ID required for deletion' },
            { status: 400 }
          );
        }
        
        await realTimeAnalyticsService.removeAlertRule(body.ruleId);
        response.data = { ruleId: body.ruleId, action };
        break;

      case 'list':
        const rules = realTimeAnalyticsService.getAlertRules();
        response.data = { rules, count: rules.length };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, update, delete, or list' },
          { status: 400 }
        );
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/realtime/alerts',
        method: 'PATCH',
        action,
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Alert management API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to manage alerts',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function getSession(request: NextRequest) {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('session')?.value;
  
  if (!sessionId) return null;
  
  const session = await prisma.userSession.findUnique({
    where: { sessionId },
    include: { user: true }
  });
  
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  
  return {
    userId: session.userId,
    user: session.user
  };
}

async function hasAnalyticsAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  // Allow admin users and commissioners to access analytics
  return user?.role === 'ADMIN' || user?.role === 'COMMISSIONER';
}

function filterMetricsByCategory(metrics: any, category: string) {
  if (category === 'all') return metrics;
  
  const filteredMetrics = { ...metrics };
  
  switch (category) {
    case 'users':
      return {
        timestamp: metrics.timestamp,
        activeUsers: metrics.activeUsers,
        userActivity: metrics.userActivity
      };
    
    case 'system':
      return {
        timestamp: metrics.timestamp,
        systemHealth: metrics.systemHealth
      };
    
    case 'fantasy':
      return {
        timestamp: metrics.timestamp,
        fantasyActivity: metrics.fantasyActivity
      };
    
    case 'business':
      return {
        timestamp: metrics.timestamp,
        businessMetrics: metrics.businessMetrics
      };
    
    default:
      return metrics;
  }
}

function calculateTrends(metricsHistory: any[], category: string) {
  if (metricsHistory.length < 2) {
    return { trend: 'insufficient_data' };
  }

  const latest = metricsHistory[metricsHistory.length - 1];
  const previous = metricsHistory[metricsHistory.length - 2];

  const trends: any = {};

  // Calculate trends based on category
  switch (category) {
    case 'users':
    case 'all':
      if (latest.activeUsers && previous.activeUsers) {
        trends.activeUsers = {
          current: latest.activeUsers.current,
          previous: previous.activeUsers.current,
          change: latest.activeUsers.current - previous.activeUsers.current,
          changePercent: previous.activeUsers.current > 0 
            ? ((latest.activeUsers.current - previous.activeUsers.current) / previous.activeUsers.current) * 100 
            : 0,
          trend: latest.activeUsers.trend
        };
      }
      break;

    case 'system':
      if (latest.systemHealth && previous.systemHealth) {
        trends.responseTime = {
          current: latest.systemHealth.responseTime,
          previous: previous.systemHealth.responseTime,
          change: latest.systemHealth.responseTime - previous.systemHealth.responseTime,
          trend: latest.systemHealth.responseTime > previous.systemHealth.responseTime ? 'degrading' : 'improving'
        };
      }
      break;
  }

  return trends;
}

function filterDashboardComponents(dashboardData: any, components: string[]) {
  const filtered: any = {};
  
  components.forEach(component => {
    if (dashboardData[component]) {
      filtered[component] = dashboardData[component];
    }
  });
  
  return filtered;
}

async function checkEventRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
  // Simple rate limiting implementation
  // In production, use Redis-based rate limiting
  return { allowed: true, remaining: 100 };
}

function getClientIP(request: NextRequest): string {
  // Extract client IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}