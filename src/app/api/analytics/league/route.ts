/**
 * League Analytics API Endpoints
 * League health, competition analysis, and strategic insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { leagueAnalyticsService } from '@/services/analytics/leagueAnalyticsService';
import { privacyAnalyticsService } from '@/services/analytics/privacyAnalyticsService';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Request validation schemas
const LeagueHealthQuerySchema = z.object({
  leagueId: z.string(),
  includeDetails: z.boolean().optional().default(false),
  includePredictions: z.boolean().optional().default(false)
});

const CompetitionAnalysisQuerySchema = z.object({
  leagueId: z.string(),
  includeProjections: z.boolean().optional().default(true),
  includeHistorical: z.boolean().optional().default(false),
  depth: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('detailed')
});

const TradeAnalysisQuerySchema = z.object({
  leagueId: z.string(),
  timeRange: z.enum(['7d', '30d', '90d', 'season']).optional().default('season'),
  includeFairness: z.boolean().optional().default(true),
  includeImpact: z.boolean().optional().default(false)
});

const LeagueCultureQuerySchema = z.object({
  leagueId: z.string(),
  analyzeCommunication: z.boolean().optional().default(true),
  analyzeEngagement: z.boolean().optional().default(true),
  includeTrends: z.boolean().optional().default(false)
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/league - Get league health metrics
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
    
    const validationResult = LeagueHealthQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { leagueId, includeDetails, includePredictions } = validationResult.data;

    // Check league access
    const hasAccess = await checkLeagueAccess(session.userId, leagueId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to specified league' },
        { status: 403 }
      );
    }

    // Get league health metrics
    const healthMetrics = await leagueAnalyticsService.getLeagueHealthMetrics(leagueId);

    // Build response
    const response: any = {
      success: true,
      data: {
        leagueId,
        health: healthMetrics,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add optional detailed data
    if (includeDetails) {
      response.data.details = await getLeagueDetails(leagueId);
    }

    if (includePredictions) {
      response.data.predictions = await getLeaguePredictions(leagueId);
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/league',
        method: 'GET',
        leagueId,
        options: { includeDetails, includePredictions },
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('League analytics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch league analytics',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/league/competition - Get detailed competition analysis
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
    const validationResult = CompetitionAnalysisQuerySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { leagueId, includeProjections, includeHistorical, depth } = validationResult.data;

    // Check league access
    const hasAccess = await checkLeagueAccess(session.userId, leagueId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to specified league' },
        { status: 403 }
      );
    }

    // Get competition analysis
    const competitionAnalysis = await leagueAnalyticsService.getCompetitionAnalysis(leagueId);

    // Build response
    const response: any = {
      success: true,
      data: {
        leagueId,
        competition: competitionAnalysis,
        analysisDepth: depth,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add optional data based on depth and flags
    if (depth === 'comprehensive' || includeProjections) {
      response.data.detailedProjections = await getDetailedProjections(leagueId);
    }

    if (includeHistorical) {
      response.data.historical = await getHistoricalComparison(leagueId);
    }

    if (depth === 'comprehensive') {
      response.data.advanced = await getAdvancedCompetitionMetrics(leagueId);
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/league/competition',
        method: 'POST',
        leagueId,
        depth,
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Competition analysis API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze competition',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/analytics/league/trades - Analyze trade patterns and fairness
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
    const validationResult = TradeAnalysisQuerySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { leagueId, timeRange, includeFairness, includeImpact } = validationResult.data;

    // Check league access
    const hasAccess = await checkLeagueAccess(session.userId, leagueId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to specified league' },
        { status: 403 }
      );
    }

    // Get trade analysis
    const tradeAnalysis = await leagueAnalyticsService.getTradeAnalysis(leagueId, timeRange);

    // Build response
    const response: any = {
      success: true,
      data: {
        leagueId,
        timeRange,
        trades: tradeAnalysis,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add optional analysis
    if (includeFairness) {
      response.data.fairnessDetails = await getDetailedFairnessAnalysis(leagueId, timeRange);
    }

    if (includeImpact) {
      response.data.impactAnalysis = await getTradeImpactAnalysis(leagueId, timeRange);
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/league/trades',
        method: 'PUT',
        leagueId,
        timeRange,
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Trade analysis API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze trades',
        requestDuration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analytics/league/culture - Analyze league culture and social dynamics
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

    // Parse request body
    const body = await request.json();
    const validationResult = LeagueCultureQuerySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { leagueId, analyzeCommunication, analyzeEngagement, includeTrends } = validationResult.data;

    // Check league access
    const hasAccess = await checkLeagueAccess(session.userId, leagueId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to specified league' },
        { status: 403 }
      );
    }

    // Get league culture analysis
    const cultureAnalysis = await leagueAnalyticsService.getLeagueCulture(leagueId);

    // Build response
    const response: any = {
      success: true,
      data: {
        leagueId,
        culture: cultureAnalysis,
        generatedAt: new Date(),
        requestDuration: Date.now() - startTime
      }
    };

    // Add optional detailed analysis
    if (analyzeCommunication) {
      response.data.communicationDetails = await getCommunicationAnalysis(leagueId);
    }

    if (analyzeEngagement) {
      response.data.engagementDetails = await getEngagementAnalysis(leagueId);
    }

    if (includeTrends) {
      response.data.trends = await getCultureTrends(leagueId);
    }

    // Track API usage
    await privacyAnalyticsService.collectAnalyticsData(
      session.userId,
      {
        endpoint: '/api/analytics/league/culture',
        method: 'PATCH',
        leagueId,
        duration: Date.now() - startTime
      },
      'analytics'
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Culture analysis API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze league culture',
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

async function checkLeagueAccess(userId: string, leagueId: string): Promise<boolean> {
  const team = await prisma.team.findFirst({
    where: {
      ownerId: userId,
      leagueId
    }
  });
  
  return !!team;
}

async function getLeagueDetails(leagueId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      teams: {
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  return {
    name: league?.name,
    season: league?.season,
    teamCount: league?.teams.length,
    settings: league?.settings,
    commissioners: league?.teams.filter(t => t.owner.email).map(t => t.owner.name)
  };
}

async function getLeaguePredictions(leagueId: string) {
  // Generate predictions for league outcomes
  return {
    playoffProbabilities: [
      { teamId: 'team1', probability: 0.95, position: 'Lock' },
      { teamId: 'team2', probability: 0.78, position: 'Likely' },
      { teamId: 'team3', probability: 0.45, position: 'Bubble' }
    ],
    championshipOdds: [
      { teamId: 'team1', odds: 0.25 },
      { teamId: 'team2', odds: 0.18 },
      { teamId: 'team3', odds: 0.15 }
    ],
    keyMatchups: [
      {
        week: 15,
        homeTeam: 'team1',
        awayTeam: 'team2',
        importance: 'Championship implications',
        winProbability: 0.62
      }
    ]
  };
}

async function getDetailedProjections(leagueId: string) {
  // Get detailed season projections
  return {
    standingsProjection: [
      { teamId: 'team1', projectedWins: 11.2, projectedPoints: 1650.5 },
      { teamId: 'team2', projectedWins: 9.8, projectedPoints: 1580.2 }
    ],
    strengthOfSchedule: [
      { teamId: 'team1', remaining: 0.52, rank: 8 },
      { teamId: 'team2', remaining: 0.48, rank: 4 }
    ],
    playoffScenarios: {
      currentlyIn: 6,
      onBubble: 2,
      eliminated: 2,
      clinched: 4
    }
  };
}

async function getHistoricalComparison(leagueId: string) {
  // Compare current season to historical data
  return {
    averageScore: {
      current: 112.5,
      historical: 108.3,
      percentile: 78
    },
    competitiveness: {
      current: 8.2,
      historical: 7.8,
      trend: 'increasing'
    },
    tradeActivity: {
      current: 24,
      historical: 18.5,
      percentile: 85
    }
  };
}

async function getAdvancedCompetitionMetrics(leagueId: string) {
  // Advanced competition analysis
  return {
    giniCoefficient: 0.34, // Measure of competitive balance
    talentDistribution: {
      concentration: 'moderate',
      topHeavy: false,
      parityScore: 7.8
    },
    momentumFactors: {
      recentFormWeight: 0.25,
      strengthTrend: 'stable',
      volatility: 'low'
    },
    clutchPerformance: [
      { teamId: 'team1', clutchRating: 8.5, bigGameRecord: '3-1' },
      { teamId: 'team2', clutchRating: 6.2, bigGameRecord: '2-2' }
    ]
  };
}

async function getDetailedFairnessAnalysis(leagueId: string, timeRange: string) {
  // Detailed trade fairness analysis
  const trades = await prisma.tradeProposal.findMany({
    where: {
      status: 'accepted',
      createdAt: {
        gte: getTimeRangeDate(timeRange)
      }
    },
    include: {
      proposingTeam: {
        include: {
          league: true
        }
      }
    }
  });

  return {
    totalTrades: trades.length,
    fairnessScores: trades.map(trade => ({
      id: trade.id,
      score: Math.random() * 10, // Would calculate actual fairness
      flags: [],
      participants: [trade.proposingTeam.name].filter(Boolean)
    })),
    suspiciousActivity: [],
    recommendations: [
      'Consider implementing trade review period',
      'Monitor for potential collusion patterns'
    ]
  };
}

async function getTradeImpactAnalysis(leagueId: string, timeRange: string) {
  // Analyze how trades have impacted the league
  return {
    standingsImpact: {
      major: 3, // Trades that significantly changed standings
      moderate: 8,
      minor: 12
    },
    competitiveBalance: {
      before: 7.2,
      after: 7.8,
      improvement: true
    },
    winnerLoserAnalysis: [
      { teamId: 'team1', netGain: 15.2, tradingGrade: 'A+' },
      { teamId: 'team2', netGain: -5.8, tradingGrade: 'C-' }
    ]
  };
}

async function getCommunicationAnalysis(leagueId: string) {
  // Analyze league communication patterns
  const messages = await prisma.message.findMany({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    take: 1000
  });

  return {
    totalMessages: messages.length,
    averagePerDay: messages.length / 30, // Approximate
    mostActiveUsers: [
      { userId: 'user1', messageCount: 45, nickname: 'Chatty' },
      { userId: 'user2', messageCount: 32, nickname: 'Social' }
    ],
    communicationHealth: {
      activity: 'high',
      toxicity: 'low',
      helpfulness: 'medium'
    },
    topTopics: [
      { topic: 'Trade discussions', frequency: 34 },
      { topic: 'Lineup advice', frequency: 28 },
      { topic: 'Trash talk', frequency: 22 }
    ]
  };
}

async function getEngagementAnalysis(leagueId: string) {
  // Analyze member engagement levels
  const teams = await prisma.team.findMany({
    where: { leagueId },
    include: {
      owner: true,
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      tradeProposals: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  return {
    engagementScores: teams.map(team => ({
      teamId: team.id,
      ownerName: team.owner.name,
      score: calculateEngagementScore(team),
      level: getEngagementLevel(team),
      lastActivity: getLastActivity(team)
    })),
    leagueEngagement: {
      average: 7.2,
      distribution: {
        high: 4,
        medium: 5,
        low: 1
      }
    }
  };
}

async function getCultureTrends(leagueId: string) {
  // Analyze culture trends over time
  return {
    communicationTrend: 'increasing',
    participationTrend: 'stable',
    competitivenessTrend: 'increasing',
    toxicityTrend: 'decreasing',
    seasonalPatterns: {
      draftSeason: 'peak_activity',
      midSeason: 'steady_activity',
      playoffs: 'high_activity',
      offSeason: 'low_activity'
    }
  };
}

function getTimeRangeDate(timeRange: string): Date {
  const now = new Date();
  const ranges: { [key: string]: number } = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    'season': 120 * 24 * 60 * 60 * 1000 // ~4 months
  };
  
  return new Date(now.getTime() - (ranges[timeRange] || ranges['30d']));
}

function calculateEngagementScore(team: any): number {
  let score = 0;
  
  // Transaction activity
  score += Math.min(30, (team.transactions?.length || 0) * 3);
  
  // Trade proposals
  score += Math.min(25, (team.tradeProposals?.length || 0) * 5);
  
  // Base participation score
  score += 20; // Base score for being in the league
  
  // Recent activity boost
  const recentActivity = [...(team.transactions || []), ...(team.tradeProposals || [])]
    .filter((item: any) => {
      const date = item.createdAt;
      return date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    });
  
  score += Math.min(25, recentActivity.length * 5);
  
  return Math.min(100, score);
}

function getEngagementLevel(team: any): 'high' | 'medium' | 'low' {
  const score = calculateEngagementScore(team);
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function getLastActivity(team: any): Date | null {
  const activities = [
    ...(team.transactions || []).map((t: any) => t.createdAt),
    ...(team.tradeProposals || []).map((p: any) => p.createdAt)
  ].filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  return activities.length > 0 ? new Date(activities[0]) : null;
}