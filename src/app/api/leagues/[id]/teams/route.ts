import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * League Teams API
 * GET /api/leagues/[id]/teams - Get all teams in a league
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRoster = searchParams.get('includeRoster') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const week = parseInt(searchParams.get('week') || '0');
    const season = searchParams.get('season') || '2025';

    const leagueId = params.id;

    // Validate league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        currentWeek: true,
        season: true,
        rosterSettings: true,
        scoringSettings: true
      }
    });

    if (!league) {
      return NextResponse.json(
        { success: false, error: 'League not found' },
        { status: 404 }
      );
    }

    const currentWeek = week || league.currentWeek;

    // Get teams in the league
    const teams = await prisma.team.findMany({
      where: { leagueId: leagueId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        rosterPlayers: includeRoster ? {
          include: {
            player: {
              include: {
                stats: includeStats ? {
                  where: {
                    week: currentWeek,
                    season: season
                  },
                  take: 1
                } : false,
                playerProjections: includeStats ? {
                  where: {
                    week: currentWeek,
                    season: parseInt(season)
                  },
                  orderBy: { confidence: 'desc' },
                  take: 1
                } : false
              }
            }
          },
          orderBy: [
            { isStarter: 'desc' },
            { position: 'asc' }
          ]
        } : false,
        homeMatchups: {
          where: {
            week: currentWeek,
            season: season
          },
          include: {
            awayTeam: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        awayMatchups: {
          where: {
            week: currentWeek,
            season: season
          },
          include: {
            homeTeam: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        }
      },
      orderBy: [
        { standing: 'asc' },
        { pointsFor: 'desc' }
      ]
    });

    // Transform team data
    const teamsData = await Promise.all(
      teams.map(async (team: any) => {
        // Calculate current week projected points
        let projectedPoints = 0;
        let actualPoints = 0;
        
        if (includeRoster && team.rosterPlayers) {
          const starters = team.rosterPlayers.filter(rp => rp.isStarter);
          
          for (const rosterPlayer of starters) {
            const player = rosterPlayer.player;
            
            // Get actual points from stats
            if (player.stats && player.stats.length > 0) {
              actualPoints += player.stats[0].fantasyPoints || 0;
            }
            
            // Get projected points
            if (player.playerProjections && player.playerProjections.length > 0) {
              projectedPoints += player.playerProjections[0].points || 0;
            } else {
              // Fallback to position average
              projectedPoints += getPositionAverage(player.position);
            }
          }
        }

        // Get current matchup
        const currentMatchup = team.homeMatchups[0] || team.awayMatchups[0];
        
        return {
          id: team.id,
          name: team.name,
          logo: team.logo,
          owner: team.owner,
          
          // Record and standings
          record: {
            wins: team.wins,
            losses: team.losses,
            ties: team.ties,
            winPercentage: team.wins + team.losses + team.ties > 0 
              ? Math.round((team.wins / (team.wins + team.losses + team.ties)) * 1000) / 1000
              : 0
          },
          
          points: {
            for: Math.round(team.pointsFor * 100) / 100,
            against: Math.round(team.pointsAgainst * 100) / 100,
            projected: Math.round(projectedPoints * 100) / 100,
            actual: Math.round(actualPoints * 100) / 100
          },
          
          standings: {
            position: team.standing,
            playoffSeed: team.playoffSeed
          },
          
          // Waiver and transaction info
          waiver: {
            priority: team.waiverPriority,
            faabBudget: team.faabBudget,
            faabSpent: team.faabSpent,
            faabRemaining: team.faabBudget - team.faabSpent
          },
          
          // Current week matchup
          ...(currentMatchup && {
            currentMatchup: {
              id: currentMatchup.id,
              week: currentMatchup.week,
              opponent: currentMatchup.homeTeamId === team.id 
                ? (currentMatchup as any).awayTeam 
                : (currentMatchup as any).homeTeam,
              isHome: currentMatchup.homeTeamId === team.id,
              score: {
                team: currentMatchup.homeTeamId === team.id 
                  ? currentMatchup.homeScore 
                  : currentMatchup.awayScore,
                opponent: currentMatchup.homeTeamId === team.id 
                  ? currentMatchup.awayScore 
                  : currentMatchup.homeScore
              },
              isComplete: currentMatchup.isComplete,
              isPlayoff: currentMatchup.isPlayoff
            }
          }),
          
          // Roster if requested
          ...(includeRoster && {
            roster: {
              starters: team.rosterPlayers
                ?.filter(rp => rp.isStarter)
                ?.map(rp => ({
                  id: rp.id,
                  position: rp.position,
                  player: {
                    id: rp.player.id,
                    name: rp.player.name,
                    position: rp.player.position,
                    team: rp.player.nflTeam,
                    status: rp.player.status,
                    injuryStatus: rp.player.injuryStatus,
                    projectedPoints: rp.player.playerProjections?.[0]?.points || getPositionAverage(rp.player.position),
                    actualPoints: rp.player.stats?.[0]?.fantasyPoints || 0
                  }
                })) || [],
              
              bench: team.rosterPlayers
                ?.filter(rp => !rp.isStarter)
                ?.map(rp => ({
                  id: rp.id,
                  player: {
                    id: rp.player.id,
                    name: rp.player.name,
                    position: rp.player.position,
                    team: rp.player.nflTeam,
                    status: rp.player.status,
                    injuryStatus: rp.player.injuryStatus,
                    projectedPoints: rp.player.playerProjections?.[0]?.points || getPositionAverage(rp.player.position),
                    actualPoints: rp.player.stats?.[0]?.fantasyPoints || 0
                  }
                })) || []
            }
          }),
          
          lastUpdated: team.updatedAt
        };
      })
    );

    // Calculate league summary
    const summary = {
      totalTeams: teamsData.length,
      averagePointsFor: Math.round((teamsData.reduce((sum, team) => sum + team.points.for, 0) / teamsData.length) * 100) / 100,
      highestScorer: teamsData.reduce((max, team) => team.points.for > max.points.for ? team : max, teamsData[0]),
      standings: teamsData.map(team => ({
        teamId: team.id,
        teamName: team.name,
        position: team.standings.position,
        record: team.record,
        pointsFor: team.points.for
      }))
    };

    return NextResponse.json({
      success: true,
      data: {
        league: {
          id: league.id,
          name: league.name,
          currentWeek: currentWeek,
          season: league.season
        },
        teams: teamsData,
        summary: summary,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('League teams API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch league teams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Update team in league
 * PUT /api/leagues/[id]/teams - Update team information
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { teamId, updates } = await request.json();
    const leagueId = params.id;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Validate team belongs to league
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        leagueId: leagueId
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found in this league' },
        { status: 404 }
      );
    }

    // Apply updates (filter allowed fields)
    const allowedUpdates = {
      ...(updates.name && { name: updates.name }),
      ...(updates.logo && { logo: updates.logo }),
      ...(updates.waiverPriority !== undefined && { waiverPriority: updates.waiverPriority }),
      ...(updates.standing !== undefined && { standing: updates.standing }),
      ...(updates.playoffSeed !== undefined && { playoffSeed: updates.playoffSeed })
    };

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...allowedUpdates,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`Team ${updatedTeam.name} updated in league ${leagueId}`);

    return NextResponse.json({
      success: true,
      message: `Team ${updatedTeam.name} updated successfully`,
      data: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        logo: updatedTeam.logo,
        owner: updatedTeam.owner,
        waiverPriority: updatedTeam.waiverPriority,
        standing: updatedTeam.standing,
        playoffSeed: updatedTeam.playoffSeed,
        updatedAt: updatedTeam.updatedAt
      }
    });

  } catch (error) {
    console.error('Team update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update team',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Create new team in league
 * POST /api/leagues/[id]/teams - Add a new team to the league
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { ownerId, teamName, logo } = await request.json();
    const leagueId = params.id;

    if (!ownerId || !teamName) {
      return NextResponse.json(
        { success: false, error: 'Owner ID and team name are required' },
        { status: 400 }
      );
    }

    // Validate league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        teams: true
      }
    });

    if (!league) {
      return NextResponse.json(
        { success: false, error: 'League not found' },
        { status: 404 }
      );
    }

    // Check if user already has a team in this league
    const existingTeam = await prisma.team.findFirst({
      where: {
        leagueId: leagueId,
        ownerId: ownerId
      }
    });

    if (existingTeam) {
      return NextResponse.json(
        { success: false, error: 'User already has a team in this league' },
        { status: 409 }
      );
    }

    // Create new team
    const newTeam = await prisma.team.create({
      data: {
        name: teamName,
        logo: logo,
        ownerId: ownerId,
        leagueId: leagueId,
        waiverPriority: league.teams.length + 1, // Set to last
        standing: league.teams.length + 1,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        league: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`New team ${newTeam.name} created in league ${league.name}`);

    return NextResponse.json({
      success: true,
      message: `Team ${newTeam.name} created successfully`,
      data: {
        id: newTeam.id,
        name: newTeam.name,
        logo: newTeam.logo,
        owner: newTeam.owner,
        league: newTeam.league,
        waiverPriority: newTeam.waiverPriority,
        standing: newTeam.standing,
        createdAt: newTeam.createdAt
      }
    });

  } catch (error) {
    console.error('Team creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create team',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions

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