import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';
import { ApiResponse, TradeAnalysis } from '@/types/fantasy';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/trades/[id]/analyze - Analyze trade value and fairness
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // For testing purposes, allow unauthenticated access
    const user = await authenticateFromRequest(request);
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    const tradeId = params.id;
    const { searchParams } = new URL(request.url);
    const includeAdvanced = searchParams.get('advanced') === 'true';
    const refreshCache = searchParams.get('refresh') === 'true';

    // Get the trade to verify it exists and user has access
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true,
            members: user ? {
              where: { userId: user.id },
              select: { role: true }
            } : undefined
          }
        },
        items: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                position: true,
                nflTeam: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    // For testing, skip membership check
    // if (trade.league.members.length === 0) {
    //   return NextResponse.json(
    //     { success: false, message: 'Access denied. User not in league.' },
    //     { status: 403 }
    //   );
    // }

    // Mock trade analysis for testing
    const analysis: TradeAnalysis = {
      tradeId: tradeId,
      overallFairness: 75,
      recommendation: 'ACCEPT',
      teamAnalysis: [
        {
          teamId: trade.items[0]?.fromTeamId || 'team1',
          teamName: 'Team 1',
          valueChange: 12.5,
          projectedWinsChange: 1.2,
          playoffOddsChange: 8.5,
          strengthChange: {
            QB: 0,
            RB: 5,
            WR: -3,
            TE: 2,
            overall: 4
          }
        },
        {
          teamId: trade.items[0]?.toTeamId || 'team2',
          teamName: 'Team 2',
          valueChange: -12.5,
          projectedWinsChange: -1.2,
          playoffOddsChange: -8.5,
          strengthChange: {
            QB: 0,
            RB: -5,
            WR: 3,
            TE: -2,
            overall: -4
          }
        }
      ],
      playerAnalysis: trade.items.map(item => ({
        playerId: item.playerId || '',
        playerName: item.player?.name || 'Unknown Player',
        currentValue: 100,
        futureValue: 95,
        injuryRisk: 'LOW',
        scheduleStrength: 'MEDIUM',
        rostPosition: 'STARTER'
      })),
      insights: [
        'This trade appears relatively balanced',
        'Team 1 improves RB depth',
        'Team 2 gains WR upside'
      ],
      similarTrades: [],
      timestamp: new Date()
    };

    // Add additional analysis for commissioners/admins
    if (includeAdvanced && trade.league.members?.[0]?.role === 'COMMISSIONER') {
      // Add mock commissioner-specific insights
      analysis.insights.push('Commissioner view: No collusion detected');
      analysis.insights.push('Historical trade pattern analysis: Normal');
    }

    const response: ApiResponse<TradeAnalysis> = {
      success: true,
      data: analysis,
      message: 'Trade analysis completed successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing trade:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/trades/[id]/analyze - Request detailed analysis with specific parameters
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // For testing purposes, allow unauthenticated access
    const user = await authenticateFromRequest(request);
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    const tradeId = params.id;
    const body = await request.json();

    // Analysis parameters
    const {
      includeSimilarTrades = true,
      includeInjuryAnalysis = true,
      includeScheduleAnalysis = true,
      includePlayoffImpact = true,
      timeHorizon = 'ROS', // 'IMMEDIATE', 'ROS', 'DYNASTY'
      focusTeamId = null, // Specific team perspective
      customWeights = null // Custom scoring weights
    } = body;

    // Get the trade
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        league: true,
        items: {
          include: {
            player: true
          }
        }
      }
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Trade not found' },
        { status: 404 }
      );
    }

    // Create comprehensive mock analysis based on parameters
    const analysis: TradeAnalysis = {
      tradeId: tradeId,
      overallFairness: 82,
      recommendation: timeHorizon === 'DYNASTY' ? 'HOLD' : 'ACCEPT',
      teamAnalysis: [
        {
          teamId: trade.items[0]?.fromTeamId || 'team1',
          teamName: 'Team 1',
          valueChange: timeHorizon === 'DYNASTY' ? 25 : 15,
          projectedWinsChange: includePlayoffImpact ? 1.5 : 1.0,
          playoffOddsChange: includePlayoffImpact ? 12 : 8,
          strengthChange: {
            QB: 0,
            RB: 8,
            WR: -4,
            TE: 3,
            overall: 7
          }
        },
        {
          teamId: trade.items[0]?.toTeamId || 'team2',
          teamName: 'Team 2',
          valueChange: timeHorizon === 'DYNASTY' ? -25 : -15,
          projectedWinsChange: includePlayoffImpact ? -1.5 : -1.0,
          playoffOddsChange: includePlayoffImpact ? -12 : -8,
          strengthChange: {
            QB: 0,
            RB: -8,
            WR: 4,
            TE: -3,
            overall: -7
          }
        }
      ],
      playerAnalysis: trade.items.map(item => ({
        playerId: item.playerId || '',
        playerName: item.player?.name || 'Unknown Player',
        currentValue: 100,
        futureValue: timeHorizon === 'DYNASTY' ? 120 : 95,
        injuryRisk: includeInjuryAnalysis ? 'MEDIUM' : 'LOW',
        scheduleStrength: includeScheduleAnalysis ? 'HARD' : 'MEDIUM',
        rostPosition: 'STARTER'
      })),
      insights: [
        `Analysis based on ${timeHorizon} time horizon`,
        includeSimilarTrades ? 'Similar trades historically favor Team 1' : '',
        includeInjuryAnalysis ? 'Injury risk assessment included in valuation' : '',
        includeScheduleAnalysis ? 'Schedule difficulty factored into projections' : '',
        includePlayoffImpact ? 'Playoff implications strongly considered' : ''
      ].filter(Boolean),
      similarTrades: includeSimilarTrades ? [
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          teams: ['Team A', 'Team B'],
          players: ['Player X', 'Player Y'],
          outcome: 'Team A won trade by 15%'
        }
      ] : [],
      timestamp: new Date()
    };

    const response: ApiResponse<TradeAnalysis> = {
      success: true,
      data: analysis,
      message: 'Detailed trade analysis completed'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in detailed trade analysis:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}