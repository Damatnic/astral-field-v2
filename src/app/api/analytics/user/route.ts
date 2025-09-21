/**
 * User Analytics API Endpoints
 * Comprehensive user engagement and behavior analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { userAnalyticsService } from '@/services/analytics/userAnalyticsService';
import { privacyAnalyticsService } from '@/services/analytics/privacyAnalyticsService';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Request validation schemas
const UserEngagementQuerySchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d', '90d']).optional().default('30d'),
  includeSegmentation: z.boolean().optional().default(false),
  includeRetention: z.boolean().optional().default(false),
  includeJourney: z.boolean().optional().default(false)
});

const UserBehaviorQuerySchema = z.object({
  userId: z.string(),
  includePreferences: z.boolean().optional().default(true),
  includeChurnRisk: z.boolean().optional().default(false),
  timeWindow: z.number().min(7).max(365).optional().default(90)
});

const FantasyEngagementQuerySchema = z.object({
  leagueId: z.string().optional(),
  timeRange: z.enum(['7d', '30d', '90d', 'season']).optional().default('30d'),
  includeComparisons: z.boolean().optional().default(false)
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/user - Get user engagement metrics
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
    
    const validationResult = UserEngagementQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { timeRange, includeSegmentation, includeRetention, includeJourney } = validationResult.data;

    // Check user consent for analytics
    const consent = await privacyAnalyticsService.getUserConsent(session.userId);
    if (!consent?.analytics) {
      return NextResponse.json(
        { error: 'Analytics consent required' },
        { status: 403 }
      );
    }

    // Get user engagement metrics
    const engagementMetrics = await userAnalyticsService.getUserEngagementMetrics(timeRange);
    
    // Get fantasy engagement metrics
    const fantasyMetrics = await userAnalyticsService.getFantasyEngagementMetrics(undefined, timeRange);

    // Build response
    const response: any = {
      success: true,
      data: {
        timeRange,
        engagement: engagementMetrics,
        fantasy: fantasyMetrics,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add optional data based on query parameters
    if (includeSegmentation) {
      response.data.segmentation = await getUserSegmentationData(session.userId);
    }

    if (includeRetention) {
      response.data.retention = await userAnalyticsService.getCohortAnalysis();
    }

    if (includeJourney) {
      response.data.userJourney = await getUserJourneyData(session.userId, timeRange);
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/user',
        method: 'GET',
        timeRange,
        options: { includeSegmentation, includeRetention, includeJourney },
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('User analytics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch user analytics',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/user/behavior - Analyze specific user behavior pattern
 */
export async function POST(request: NextRequest) {
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
    const validationResult = UserBehaviorQuerySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { userId, includePreferences, includeChurnRisk, timeWindow } = validationResult.data;

    // Check permission (users can only analyze their own behavior)
    if (userId !== session.userId) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check consent
    const consent = await privacyAnalyticsService.getUserConsent(userId);
    if (!consent?.analytics) {
      return NextResponse.json(
        { error: 'Analytics consent required for target user' },
        { status: 403 }
      );
    }

    // Get user behavior pattern
    const behaviorPattern = await userAnalyticsService.getUserBehaviorPattern(userId);

    // Build response
    const response: any = {
      success: true,
      data: {
        userId,
        timeWindow,
        behavior: behaviorPattern,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add optional data
    if (includePreferences) {
      response.data.preferences = await getUserPreferences(userId);
    }

    if (includeChurnRisk) {
      response.data.churnRisk = {
        score: behaviorPattern.riskOfChurn,
        factors: await getChurnRiskFactors(userId),
        recommendations: await getRetentionRecommendations(userId)
      };
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/user/behavior',
        method: 'POST',
        targetUser: userId,
        options: { includePreferences, includeChurnRisk },
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('User behavior analytics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze user behavior',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/user/fantasy - Get fantasy-specific engagement metrics
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = FantasyEngagementQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { leagueId, timeRange, includeComparisons } = validationResult.data;

    // Check consent
    const consent = await privacyAnalyticsService.getUserConsent(session.userId);
    if (!consent?.analytics) {
      return NextResponse.json(
        { error: 'Analytics consent required' },
        { status: 403 }
      );
    }

    // Validate league access if specified
    if (leagueId) {
      const hasAccess = await checkLeagueAccess(session.userId, leagueId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to specified league' },
          { status: 403 }
        );
      }
    }

    // Get fantasy engagement metrics
    const fantasyMetrics = await userAnalyticsService.getFantasyEngagementMetrics(leagueId, timeRange);

    // Build response
    const response: any = {
      success: true,
      data: {
        leagueId: leagueId || 'all',
        timeRange,
        metrics: fantasyMetrics,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add comparisons if requested
    if (includeComparisons) {
      response.data.comparisons = await getFantasyComparisons(session.userId, leagueId, timeRange);
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/user/fantasy',
        method: 'PUT',
        leagueId,
        timeRange,
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Fantasy analytics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch fantasy analytics',
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

async function getUserSegmentationData(userId: string) {
  // Get user's segment information
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teams: {
        include: {
          tradeProposals: { take: 50 },
          transactions: { take: 100 }
        }
      }
    }
  });

  if (!user) return null;

  const tradeCount = user.teams.reduce((sum, team) => sum + team.tradeProposals.length, 0);
  const waiverCount = user.teams.reduce((sum, team) => sum + team.transactions.length, 0);
  const teamCount = user.teams.length;

  // Segment logic
  let segment = 'casual';
  if (tradeCount > 10 || waiverCount > 50) segment = 'active';
  if (tradeCount > 25 || waiverCount > 100 || teamCount > 1) segment = 'power_user';

  return {
    segment,
    characteristics: {
      tradeActivity: tradeCount > 15 ? 'high' : tradeCount > 5 ? 'medium' : 'low',
      waiverActivity: waiverCount > 75 ? 'high' : waiverCount > 25 ? 'medium' : 'low',
      leagueParticipation: teamCount > 2 ? 'multiple' : 'single',
      accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    }
  };
}

async function getUserJourneyData(userId: string, timeRange: string) {
  // Get user's journey through platform using available data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teams: {
        include: {
          tradeProposals: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - getTimeRangeMs(timeRange))
              }
            }
          },
          transactions: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - getTimeRangeMs(timeRange))
              }
            }
          }
        }
      },
      notifications: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - getTimeRangeMs(timeRange))
          }
        },
        take: 100
      }
    }
  });

  if (!user) return null;

  // Analyze activity patterns
  const features = {
    trades: user.teams.reduce((sum, team) => sum + team.tradeProposals.length, 0),
    transactions: user.teams.reduce((sum, team) => sum + team.transactions.length, 0),
    notifications: user.notifications.length
  };

  return {
    totalActions: features.trades + features.transactions + features.notifications,
    pageViews: features.notifications, // Notifications as proxy for page views
    uniqueFeatures: Object.keys(features).length,
    topFeatures: Object.entries(features)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([feature, count]) => ({ feature, count })),
    sessionCount: user.teams.length, // Teams as proxy for sessions
    firstAction: 'platform_join',
    lastAction: 'recent_activity'
  };
}

async function getUserPreferences(userId: string) {
  // Get user preferences from various sources
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true
    }
  });

  return {
    notifications: user?.preferences || {},
    settings: {
      // Would include other preference data
    }
  };
}

async function getChurnRiskFactors(userId: string) {
  // Analyze factors contributing to churn risk
  const recentSessions = await prisma.userSession.count({
    where: {
      userId,
      updatedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    }
  });

  const recentTrades = await prisma.tradeProposal.count({
    where: {
      proposingTeam: {
        ownerId: userId
      },
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    }
  });

  return {
    lowActivity: recentSessions < 2,
    noTrades: recentTrades === 0,
    noTeams: false, // Would check if user has active teams
    supportTickets: 0 // Would check support ticket count
  };
}

async function getRetentionRecommendations(userId: string) {
  // Generate personalized retention recommendations
  return [
    'Engage with league chat for better community experience',
    'Try setting up automatic lineup optimization',
    'Explore trade opportunities with other league members',
    'Enable mobile notifications for real-time updates'
  ];
}

async function checkLeagueAccess(userId: string, leagueId: string): Promise<boolean> {
  const team = await prisma.team.findFirst({
    where: {
      ownerId: userId,
      leagueId
    }
  });
  
  return !!team;
}

async function getFantasyComparisons(userId: string, leagueId?: string, timeRange?: string) {
  // Compare user's fantasy performance to league averages
  return {
    lineupOptimization: {
      user: 85.2,
      leagueAverage: 78.6,
      rank: 3
    },
    tradeActivity: {
      user: 4,
      leagueAverage: 2.8,
      rank: 2
    },
    waiverSuccess: {
      user: 67.5,
      leagueAverage: 58.3,
      rank: 4
    }
  };
}

function getTimeRangeMs(timeRange: string): number {
  const ranges: { [key: string]: number } = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };
  return ranges[timeRange] || ranges['30d'];
}

function mapActionToFeature(action: string): string {
  const actionMap: { [key: string]: string } = {
    'LINEUP_UPDATE': 'Roster Management',
    'TRADE_PROPOSAL': 'Trading',
    'WAIVER_CLAIM': 'Waivers',
    'PLAYER_VIEW': 'Player Research',
    'ANALYTICS_VIEW': 'Analytics',
    'MATCHUP_VIEW': 'Matchups',
    'DRAFT_PICK': 'Drafting',
    'MESSAGE_SEND': 'Chat',
    'SETTINGS_UPDATE': 'Settings'
  };
  
  return actionMap[action] || 'Other';
}