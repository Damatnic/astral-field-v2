import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateFromRequest } from '@/lib/auth';
import { TradeAnalyzer } from '@/services/tradeAnalyzer';
import { ApiResponse, TradeAnalysis } from '@/types/fantasy';


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/trades/[id]/analyze - Analyze trade value and fairness
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

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
            members: {
              where: { userId: user.id },
              select: { role: true }
            }
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

    // Verify user is in the league
    if (trade.league.members.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Access denied. User not in league.' },
        { status: 403 }
      );
    }

    // Check if we have a cached analysis and it's recent (within 1 hour)
    let cachedAnalysis = null;
    if (!refreshCache) {
      const cacheKey = `trade_analysis_${tradeId}`;
      // In a production system, you'd use Redis or similar for caching
      // For now, we'll store in a simple database table or skip caching
    }

    // Create trade analyzer
    const analyzer = new TradeAnalyzer(
      trade.league.id,
      trade.league.currentWeek || 1,
      trade.league.season
    );

    // Perform analysis
    const analysis = await analyzer.analyzeTrade(tradeId);

    // Add additional analysis for commissioners/admins
    if (includeAdvanced && trade.league.members[0]?.role === 'COMMISSIONER') {
      // Add commissioner-specific insights
      await addCommissionerInsights(analysis, trade);
    }

    // Store analysis for caching (in production, use proper cache)
    // await cacheAnalysis(tradeId, analysis);

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
    const user = await authenticateFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

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
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            season: true,
            members: {
              where: { userId: user.id },
              select: { role: true, userId: true }
            }
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
                status: true,
                age: true,
                byeWeek: true
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

    // Verify user access
    if (trade.league.members.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Create analyzer with custom parameters
    const analyzer = new TradeAnalyzer(
      trade.league.id,
      trade.league.currentWeek || 1,
      trade.league.season
    );

    // Perform comprehensive analysis
    const analysis = await analyzer.analyzeTrade(tradeId);

    // Apply custom analysis parameters
    const enhancedAnalysis = await enhanceAnalysis(analysis, {
      includeSimilarTrades,
      includeInjuryAnalysis,
      includeScheduleAnalysis,
      includePlayoffImpact,
      timeHorizon,
      focusTeamId,
      customWeights,
      trade
    });

    // Generate team-specific recommendations if requested
    if (focusTeamId) {
      const teamSpecificAnalysis = await generateTeamSpecificAnalysis(
        enhancedAnalysis,
        focusTeamId,
        trade
      );
      enhancedAnalysis.teamAnalyses = enhancedAnalysis.teamAnalyses.map(ta =>
        ta.teamId === focusTeamId ? { ...ta, ...teamSpecificAnalysis } : ta
      );
    }

    const response: ApiResponse<TradeAnalysis> = {
      success: true,
      data: enhancedAnalysis,
      message: 'Detailed trade analysis completed'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error performing detailed trade analysis:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function addCommissionerInsights(analysis: TradeAnalysis, trade: any) {
  // Add insights only available to commissioners
  analysis.riskFactors.push({
    type: 'TEAM_SITUATION',
    severity: 'LOW',
    description: 'Commissioner oversight: Trade appears within normal parameters',
    affectedPlayerIds: [],
    mitigation: 'Regular monitoring of team balance',
    probability: 0.1
  });

  // Add league balance considerations
  const leagueBalance = await analyzeLeagueBalance(trade.league.id);
  if (leagueBalance.isImbalanced) {
    analysis.riskFactors.push({
      type: 'TEAM_SITUATION',
      severity: 'MEDIUM',
      description: 'Trade may increase league competitive imbalance',
      affectedPlayerIds: [],
      mitigation: 'Consider impact on overall league competitiveness',
      probability: 0.3
    });
  }
}

async function analyzeLeagueBalance(leagueId: string) {
  // Analyze overall league competitive balance
  const teams = await prisma.team.findMany({
    where: { leagueId },
    select: {
      id: true,
      name: true,
      wins: true,
      losses: true,
      pointsFor: true,
      pointsAgainst: true
    }
  });

  const winPercentages = teams.map(team => 
    team.wins / Math.max(team.wins + team.losses, 1)
  );

  const stdDev = calculateStandardDeviation(winPercentages);
  const isImbalanced = stdDev > 0.3; // Threshold for concerning imbalance

  return { isImbalanced, competitiveBalance: 1 - stdDev };
}

function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

async function enhanceAnalysis(
  analysis: TradeAnalysis,
  params: any
): Promise<TradeAnalysis> {
  const enhanced = { ...analysis };

  if (params.includeScheduleAnalysis) {
    // Add schedule strength analysis
    await addScheduleAnalysis(enhanced, params.trade);
  }

  if (params.includeInjuryAnalysis) {
    // Enhanced injury risk analysis
    await addDetailedInjuryAnalysis(enhanced, params.trade);
  }

  if (params.timeHorizon === 'DYNASTY') {
    // Add dynasty-specific considerations
    await addDynastyAnalysis(enhanced, params.trade);
  }

  return enhanced;
}

async function addScheduleAnalysis(analysis: TradeAnalysis, trade: any) {
  // Analyze strength of schedule for players' teams
  for (const teamAnalysis of analysis.teamAnalyses) {
    const upcomingGames = await getUpcomingGames(trade.league.id, teamAnalysis.teamId);
    
    teamAnalysis.playoffImpact.strengthOfSchedule = calculateScheduleStrength(upcomingGames);
    teamAnalysis.playoffImpact.keyMatchups = identifyKeyMatchups(upcomingGames);
  }
}

async function addDetailedInjuryAnalysis(analysis: TradeAnalysis, trade: any) {
  // Enhanced injury analysis using recent injury reports
  const playerIds = trade.items
    .filter((item: any) => item.playerId)
    .map((item: any) => item.playerId);

  const injuryReports = await prisma.injuryReport.findMany({
    where: {
      playerId: { in: playerIds },
      season: trade.league.season,
      week: { gte: trade.league.currentWeek - 4 }
    },
    include: {
      player: {
        select: { name: true, position: true }
      }
    }
  });

  // Add detailed injury risk factors
  injuryReports.forEach(report => {
    if (report.status !== 'HEALTHY') {
      analysis.riskFactors.push({
        type: 'INJURY',
        severity: report.status === 'OUT' ? 'HIGH' : 'MEDIUM',
        description: `${report.player.name} has recent injury history: ${report.description}`,
        affectedPlayerIds: [report.playerId],
        mitigation: 'Monitor injury status and have contingency plans',
        probability: report.status === 'OUT' ? 0.7 : 0.4
      });
    }
  });
}

async function addDynastyAnalysis(analysis: TradeAnalysis, trade: any) {
  // Add dynasty-specific considerations like age, contract status, development potential
  for (const teamAnalysis of analysis.teamAnalyses) {
    // Analyze age distribution and future value
    const avgAge = await calculateAverageAge(teamAnalysis.teamId);
    const developmentPotential = await assessDevelopmentPotential(teamAnalysis.teamId);
    
    teamAnalysis.rosterBalance.ageDistribution = Math.max(0, 100 - (avgAge - 25) * 5);
    
    // Add dynasty-specific recommendations
    analysis.recommendations.push({
      type: 'MODIFY',
      confidence: 65,
      reasoning: [
        'Consider long-term value and age distribution',
        'Evaluate development potential of younger players',
        'Balance win-now vs. future value'
      ],
      timeline: 'WAIT'
    });
  }
}

async function calculateAverageAge(teamId: string): Promise<number> {
  const roster = await prisma.rosterPlayer.findMany({
    where: { teamId },
    include: {
      player: {
        select: { age: true }
      }
    }
  });

  const ages = roster
    .map(rp => rp.player.age)
    .filter(age => age !== null) as number[];

  return ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 26;
}

async function assessDevelopmentPotential(teamId: string): Promise<number> {
  // Simplified development potential calculation
  const youngPlayers = await prisma.rosterPlayer.count({
    where: {
      teamId,
      player: {
        age: { lte: 24 }
      }
    }
  });

  const totalPlayers = await prisma.rosterPlayer.count({
    where: { teamId }
  });

  return totalPlayers > 0 ? (youngPlayers / totalPlayers) * 100 : 0;
}

async function generateTeamSpecificAnalysis(
  analysis: TradeAnalysis,
  focusTeamId: string,
  trade: any
) {
  // Generate team-specific insights and recommendations
  const teamAnalysis = analysis.teamAnalyses.find(ta => ta.teamId === focusTeamId);
  if (!teamAnalysis) return {};

  // Analyze specific team context
  const teamContext = await getTeamContext(focusTeamId, trade.league.id);
  
  return {
    customRecommendations: await generateCustomRecommendations(teamAnalysis, teamContext),
    teamSpecificRisks: await identifyTeamSpecificRisks(teamAnalysis, teamContext),
    alternativeTargets: await suggestAlternativeTargets(teamAnalysis, teamContext)
  };
}

async function getTeamContext(teamId: string, leagueId: string) {
  return await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      roster: {
        include: {
          player: {
            select: {
              id: true,
              name: true,
              position: true,
              age: true,
              status: true
            }
          }
        }
      },
      homeMatchups: {
        where: { leagueId },
        select: { week: true, awayTeam: { select: { name: true } } }
      },
      awayMatchups: {
        where: { leagueId },
        select: { week: true, homeTeam: { select: { name: true } } }
      }
    }
  });
}

async function generateCustomRecommendations(teamAnalysis: any, teamContext: any) {
  // Generate recommendations specific to this team's situation
  return [];
}

async function identifyTeamSpecificRisks(teamAnalysis: any, teamContext: any) {
  // Identify risks specific to this team
  return [];
}

async function suggestAlternativeTargets(teamAnalysis: any, teamContext: any) {
  // Suggest alternative trade targets that might be better fits
  return [];
}

async function getUpcomingGames(leagueId: string, teamId: string) {
  // Get upcoming matchups for schedule analysis
  return [];
}

function calculateScheduleStrength(upcomingGames: any[]): number {
  // Calculate strength of upcoming schedule
  return 0.5; // Placeholder
}

function identifyKeyMatchups(upcomingGames: any[]): string[] {
  // Identify key upcoming matchups
  return [];
}