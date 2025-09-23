import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Injuries API
 * GET /api/injuries - Get current injury report for all players
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');
    const team = searchParams.get('team');
    const severity = searchParams.get('severity'); // all, high, medium, low
    const status = searchParams.get('status'); // all, out, doubtful, questionable, probable
    const limit = parseInt(searchParams.get('limit') || '100');
    const week = searchParams.get('week');
    const includeProjections = searchParams.get('includeProjections') === 'true';

    // Build where clause
    const whereClause: any = {
      isActive: true,
      OR: [
        { injuryStatus: { not: null } },
        { status: { in: ['injured', 'ir', 'out', 'doubtful', 'questionable'] } }
      ]
    };

    if (position) {
      whereClause.position = position;
    }

    if (team) {
      whereClause.nflTeam = team;
    }

    if (status && status !== 'all') {
      whereClause.injuryStatus = status;
    }

    // Get injured players
    const injuredPlayers = await prisma.player.findMany({
      where: whereClause,
      include: {
        stats: {
          orderBy: { week: 'desc' },
          take: 3,
          where: {
            season: '2025'
          }
        },
        playerProjections: includeProjections ? {
          orderBy: { week: 'desc' },
          take: 1,
          where: {
            season: 2025,
            ...(week && { week: parseInt(week) })
          }
        } : false,
        news: {
          orderBy: { publishedAt: 'desc' },
          take: 2,
          where: {
            headline: {
              contains: 'injury',
              mode: 'insensitive'
            }
          }
        }
      },
      orderBy: [
        { lastUpdated: 'desc' },
        { name: 'asc' }
      ],
      take: limit
    });

    // Transform and categorize injuries
    const injuries = injuredPlayers
      .map(player => {
        const injuryData = analyzeInjury(player);
        return {
          id: player.id,
          name: player.name,
          position: player.position,
          team: player.nflTeam,
          jerseyNumber: player.jerseyNumber,
          
          // Injury details
          injuryStatus: player.injuryStatus,
          injuryDetails: player.injuryDetails,
          status: player.status,
          severity: injuryData.severity,
          impact: injuryData.impact,
          timelineEstimate: injuryData.timeline,
          
          // Fantasy impact
          fantasyImpact: {
            playability: injuryData.playability,
            riskLevel: injuryData.riskLevel,
            projectedPoints: injuryData.projectedPoints,
            replacementValue: injuryData.replacementValue,
          },

          // Recent performance
          recentStats: player.stats.map(stat => ({
            week: stat.week,
            fantasyPoints: stat.fantasyPoints,
            gameDate: stat.gameDate,
            opponent: stat.opponent
          })),

          // Projections if requested
          ...(includeProjections && player.playerProjections?.length > 0 && {
            projection: {
              week: player.playerProjections[0].week,
              points: player.playerProjections[0].points,
              confidence: player.playerProjections[0].confidence,
              source: player.playerProjections[0].source
            }
          }),

          // Related news
          relatedNews: player.news.map(news => ({
            headline: news.headline,
            body: news.body.substring(0, 200) + '...',
            source: news.source,
            publishedAt: news.publishedAt,
            url: news.url
          })),

          lastUpdated: player.lastUpdated,
        };
      })
      .filter(injury => {
        // Filter by severity if specified
        if (severity && severity !== 'all') {
          return injury.severity === severity;
        }
        return true;
      });

    // Generate injury report summary
    const summary = generateInjuryReportSummary(injuries);

    // Get week context
    const currentWeek = week ? parseInt(week) : await getCurrentWeek();

    return NextResponse.json({
      success: true,
      data: {
        week: currentWeek,
        injuries: injuries,
        summary: summary,
        lastUpdated: new Date().toISOString(),
        pagination: {
          limit: limit,
          total: injuries.length,
          hasMore: injuredPlayers.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Injuries API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch injury report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Update injury information
 * POST /api/injuries - Update injury status for players
 */
export async function POST(request: Request) {
  try {
    const { playerId, injuryStatus, injuryDetails, status, source = 'manual' } = await request.json();

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Update player injury information
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        ...(injuryStatus !== undefined && { injuryStatus }),
        ...(injuryDetails !== undefined && { injuryDetails }),
        ...(status !== undefined && { status }),
        lastUpdated: new Date()
      },
      include: {
        news: {
          orderBy: { publishedAt: 'desc' },
          take: 1
        }
      }
    });

    // Log the injury update
    console.log(`Injury update for ${updatedPlayer.name}:`, {
      injuryStatus,
      injuryDetails,
      status,
      source
    });

    // Create audit log entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: 'system', // This would be the actual user ID in production
          action: 'injury_update',
          details: {
            playerId: playerId,
            playerName: updatedPlayer.name,
            changes: {
              injuryStatus,
              injuryDetails,
              status
            },
            source
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return NextResponse.json({
      success: true,
      message: `Injury status updated for ${updatedPlayer.name}`,
      data: {
        playerId: updatedPlayer.id,
        name: updatedPlayer.name,
        injuryStatus: updatedPlayer.injuryStatus,
        injuryDetails: updatedPlayer.injuryDetails,
        status: updatedPlayer.status,
        lastUpdated: updatedPlayer.lastUpdated
      }
    });

  } catch (error) {
    console.error('Injury update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update injury status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions

function analyzeInjury(player: any) {
  const injuryStatus = player.injuryStatus?.toLowerCase() || '';
  const status = player.status?.toLowerCase() || '';
  
  // Determine severity
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (['out', 'ir', 'suspended'].includes(injuryStatus) || ['injured', 'ir'].includes(status)) {
    severity = 'high';
  } else if (['doubtful'].includes(injuryStatus)) {
    severity = 'medium';
  } else if (['questionable', 'probable'].includes(injuryStatus)) {
    severity = 'low';
  }

  // Determine fantasy impact
  let playability: 'start' | 'sit' | 'risky' | 'avoid' = 'start';
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  switch (severity) {
    case 'high':
      playability = 'avoid';
      riskLevel = 'high';
      break;
    case 'medium':
      playability = 'sit';
      riskLevel = 'medium';
      break;
    case 'low':
      playability = 'risky';
      riskLevel = 'low';
      break;
  }

  // Estimate timeline
  let timeline = 'Unknown';
  if (injuryStatus.includes('out') || status.includes('ir')) {
    timeline = 'Multiple weeks';
  } else if (injuryStatus.includes('doubtful')) {
    timeline = '1-2 weeks';
  } else if (injuryStatus.includes('questionable')) {
    timeline = 'Game-time decision';
  }

  // Calculate projected impact
  const recentStats = player.stats || [];
  const averagePoints = recentStats.length > 0 
    ? recentStats.reduce((sum: number, stat: any) => sum + (stat.fantasyPoints || 0), 0) / recentStats.length
    : getPositionAverage(player.position);

  const projectedPoints = severity === 'high' ? 0 : 
                         severity === 'medium' ? averagePoints * 0.6 : 
                         averagePoints * 0.8;

  return {
    severity,
    impact: `${severity} impact on fantasy performance`,
    timeline,
    playability,
    riskLevel,
    projectedPoints: Math.round(projectedPoints * 100) / 100,
    replacementValue: getReplacementValue(player.position, averagePoints)
  };
}

function getPositionAverage(position: string): number {
  const averages: { [key: string]: number } = {
    'QB': 18.5,
    'RB': 12.8,
    'WR': 11.2,
    'TE': 8.5,
    'K': 7.2,
    'DEF': 8.0,
    'DST': 8.0,
  };
  return averages[position] || 10.0;
}

function getReplacementValue(position: string, playerAverage: number): number {
  // Replacement value is typically 75% of position average
  const posAverage = getPositionAverage(position);
  const replacementLevel = posAverage * 0.75;
  return Math.max(0, playerAverage - replacementLevel);
}

function generateInjuryReportSummary(injuries: any[]) {
  const byPosition = injuries.reduce((acc, injury) => {
    acc[injury.position] = (acc[injury.position] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const bySeverity = injuries.reduce((acc, injury) => {
    acc[injury.severity] = (acc[injury.severity] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const byStatus = injuries.reduce((acc, injury) => {
    acc[injury.injuryStatus || 'unknown'] = (acc[injury.injuryStatus || 'unknown'] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const highImpactPlayers = injuries.filter(injury => 
    injury.severity === 'high' || injury.fantasyImpact.playability === 'avoid'
  );

  return {
    totalInjuries: injuries.length,
    highImpactCount: highImpactPlayers.length,
    byPosition,
    bySeverity,
    byStatus,
    keyInjuries: highImpactPlayers.slice(0, 5).map(injury => ({
      name: injury.name,
      position: injury.position,
      team: injury.team,
      status: injury.injuryStatus,
      impact: injury.impact
    })),
    lastUpdated: new Date().toISOString()
  };
}

async function getCurrentWeek(): Promise<number> {
  try {
    const league = await prisma.league.findFirst({
      where: { isActive: true },
      select: { currentWeek: true }
    });
    return league?.currentWeek || 1;
  } catch (error) {
    console.error('Error getting current week:', error);
    return 1;
  }
}