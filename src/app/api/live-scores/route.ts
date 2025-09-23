import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Live Scores API
 * GET /api/live-scores - Get current week live scores for all leagues
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week');
    const season = searchParams.get('season') || '2025';

    // Get current week if not specified
    const currentWeek = week ? parseInt(week) : await getCurrentWeek();

    // Build where clause
    const whereClause: any = {
      week: currentWeek,
      season: season,
    };

    if (leagueId) {
      whereClause.leagueId = leagueId;
    }

    // Get live matchups with scores
    const matchups = await prisma.matchup.findMany({
      where: whereClause,
      include: {
        homeTeam: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            },
            rosterPlayers: {
              include: {
                player: {
                  include: {
                    stats: {
                      where: {
                        week: currentWeek,
                        season: season,
                      },
                      orderBy: {
                        createdAt: 'desc'
                      },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        },
        awayTeam: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            },
            rosterPlayers: {
              include: {
                player: {
                  include: {
                    stats: {
                      where: {
                        week: currentWeek,
                        season: season,
                      },
                      orderBy: {
                        createdAt: 'desc'
                      },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        },
        league: {
          select: {
            id: true,
            name: true,
            currentWeek: true,
            scoringSettings: true,
          }
        }
      },
      orderBy: [
        { isComplete: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculate live scores for each team
    const liveScores = matchups.map(matchup => {
      const homeScore = calculateTeamScore(matchup.homeTeam, matchup.league.scoringSettings);
      const awayScore = calculateTeamScore(matchup.awayTeam, matchup.league.scoringSettings);

      return {
        id: matchup.id,
        leagueId: matchup.leagueId,
        leagueName: matchup.league.name,
        week: matchup.week,
        season: matchup.season,
        isComplete: matchup.isComplete,
        isPlayoff: matchup.isPlayoff,
        homeTeam: {
          id: matchup.homeTeam.id,
          name: matchup.homeTeam.name,
          owner: matchup.homeTeam.owner,
          projectedScore: homeScore.projected,
          actualScore: homeScore.actual,
          liveScore: homeScore.live,
          completedPlayers: homeScore.completedPlayers,
          totalPlayers: homeScore.totalPlayers,
        },
        awayTeam: {
          id: matchup.awayTeam.id,
          name: matchup.awayTeam.name,
          owner: matchup.awayTeam.owner,
          projectedScore: awayScore.projected,
          actualScore: awayScore.actual,
          liveScore: awayScore.live,
          completedPlayers: awayScore.completedPlayers,
          totalPlayers: awayScore.totalPlayers,
        },
        lastUpdated: new Date().toISOString(),
      };
    });

    // Get NFL game status for context
    const nflGames = await getNFLGameStatus(currentWeek, season);

    return NextResponse.json({
      success: true,
      data: {
        week: currentWeek,
        season: season,
        matchups: liveScores,
        nflGames: nflGames,
        lastUpdated: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Live scores API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch live scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to get current NFL week
async function getCurrentWeek(): Promise<number> {
  try {
    // Check if we have any leagues with current week set
    const league = await prisma.league.findFirst({
      where: { isActive: true },
      select: { currentWeek: true }
    });

    if (league?.currentWeek) {
      return league.currentWeek;
    }

    // Fallback to calculating based on date
    const now = new Date();
    const seasonStart = new Date('2025-09-04'); // NFL 2025 season start
    const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    return Math.min(Math.max(diffWeeks, 1), 18); // NFL has 18 weeks
  } catch (error) {
    console.error('Error getting current week:', error);
    return 1; // Default to week 1
  }
}

// Helper function to calculate team scores
function calculateTeamScore(team: any, scoringSettings: any) {
  let projected = 0;
  let actual = 0;
  let live = 0;
  let completedPlayers = 0;
  const totalPlayers = team.rosterPlayers.filter((rp: any) => rp.isStarter).length;

  // Get starting lineup only
  const starters = team.rosterPlayers.filter((rp: any) => rp.isStarter);

  starters.forEach((rosterPlayer: any) => {
    const player = rosterPlayer.player;
    const latestStats = player.stats[0]; // Most recent stats

    if (latestStats) {
      actual += latestStats.fantasyPoints || 0;
      live += latestStats.fantasyPoints || 0;
      
      // Check if player's game is complete
      if (latestStats.stats?.gameStatus === 'FINAL') {
        completedPlayers++;
      }
    }

    // Add projected points if no actual stats yet
    // This would come from player projections in a real implementation
    if (!latestStats || latestStats.fantasyPoints === 0) {
      projected += getPlayerProjection(player);
    }
  });

  return {
    projected: Math.round(projected * 100) / 100,
    actual: Math.round(actual * 100) / 100,
    live: Math.round(live * 100) / 100,
    completedPlayers,
    totalPlayers,
  };
}

// Helper function to get player projection
function getPlayerProjection(player: any): number {
  // This would integrate with ESPN/Yahoo APIs for projections
  // For now, return a reasonable projection based on position
  const projectionMap: { [key: string]: number } = {
    'QB': 18.5,
    'RB': 12.8,
    'WR': 11.2,
    'TE': 8.5,
    'K': 7.2,
    'DEF': 8.0,
    'DST': 8.0,
  };

  return projectionMap[player.position] || 0;
}

// Helper function to get NFL game status
async function getNFLGameStatus(week: number, season: string) {
  try {
    // This would integrate with ESPN API for live game data
    // For now, return mock data structure
    return {
      week: week,
      season: season,
      games: [
        {
          id: 'example-game-1',
          homeTeam: 'KC',
          awayTeam: 'BUF',
          status: 'IN_PROGRESS',
          quarter: 2,
          timeRemaining: '8:45',
          homeScore: 14,
          awayScore: 10,
        }
      ],
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching NFL game status:', error);
    return {
      week: week,
      season: season,
      games: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Update live scores (typically called by webhook or cron job)
 * POST /api/live-scores
 */
export async function POST(request: Request) {
  try {
    const { week, season = '2025', forceUpdate = false } = await request.json();

    if (!week) {
      return NextResponse.json(
        { success: false, error: 'Week parameter is required' },
        { status: 400 }
      );
    }

    // This would trigger updates from ESPN/Yahoo APIs
    // For now, just return success
    console.log(`Updating live scores for Week ${week}, Season ${season}`);

    return NextResponse.json({
      success: true,
      message: `Live scores update triggered for Week ${week}, Season ${season}`,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Live scores update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update live scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}