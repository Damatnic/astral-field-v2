/**
 * D'Amato Dynasty League API Routes
 * Fetches real league data, standings, and rosters
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@/lib/auth/production-auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(request);
    
    // Get the D'Amato Dynasty League
    const league = await prisma.league.findFirst({
      where: {
        name: 'D\'Amato Dynasty League',
        isActive: true
      },
      include: {
        settings: true,
        commissioner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        teams: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            },
            roster: {
              include: {
                player: {
                  include: {
                    playerStats: {
                      where: {
                        season: 2024,
                        week: { lte: 17 } // Current week
                      },
                      orderBy: {
                        week: 'desc'
                      },
                      take: 5
                    },
                    projections: {
                      where: {
                        season: 2024,
                        week: 18 // Next week
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: [
            { wins: 'desc' },
            { pointsFor: 'desc' }
          ]
        },
        matchups: {
          where: {
            season: 2024,
            week: { lte: 17 } // Up to current week
          },
          include: {
            homeTeam: {
              include: {
                owner: {
                  select: {
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            awayTeam: {
              include: {
                owner: {
                  select: {
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          },
          orderBy: [
            { week: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true
              }
            }
          }
        }
      }
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'League not found. Please run the production seed script.' },
        { status: 404 }
      );
    }
    
    // Calculate additional stats
    const enhancedLeague = {
      ...league,
      stats: {
        totalTeams: league.teams.length,
        currentWeek: league.currentWeek || 17,
        totalMembers: league.members.length,
        averageScore: calculateAverageScore(league.teams),
        highestScore: getHighestScore(league.teams),
        topScorer: getTopScorer(league.teams)
      },
      userTeam: league.teams.find(t => t.ownerId === user.id)
    };
    
    return NextResponse.json(enhancedLeague);
    
  } catch (error) {
    console.error('Error fetching league:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch league data' },
      { status: 500 }
    );
  }
}

// Get standings
// Helper function for standings - call via GET with ?action=standings
async function getStandings(request: NextRequest) {
  try {
    await requireAuth(request);
    
    const league = await prisma.league.findFirst({
      where: {
        name: 'D\'Amato Dynasty League',
        isActive: true
      }
    });
    
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }
    
    const teams = await prisma.team.findMany({
      where: { leagueId: league.id },
      include: {
        owner: {
          select: {
            name: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { wins: 'desc' },
        { pointsFor: 'desc' }
      ]
    });
    
    // Calculate additional standings metrics
    const standings = teams.map((team, index) => ({
      rank: index + 1,
      ...team,
      winPercentage: team.wins / (team.wins + team.losses + team.ties) || 0,
      pointsPerGame: Number(team.pointsFor) / (team.wins + team.losses + team.ties) || 0,
      streak: calculateStreak(team.id, league.id),
      playoffStatus: getPlayoffStatus(index, teams.length)
    }));
    
    return NextResponse.json(standings);
    
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateAverageScore(teams: any[]): number {
  if (teams.length === 0) return 0;
  const total = teams.reduce((sum, team) => sum + Number(team.pointsFor), 0);
  return Math.round(total / teams.length * 100) / 100;
}

function getHighestScore(teams: any[]): any {
  if (teams.length === 0) return null;
  return teams.reduce((highest, team) => 
    Number(team.pointsFor) > Number(highest.pointsFor) ? team : highest
  );
}

function getTopScorer(teams: any[]): any {
  // Find the player with most points across all teams
  let topPlayer = null;
  let topPoints = 0;
  
  teams.forEach(team => {
    team.roster?.forEach((rosterSpot: any) => {
      const totalPoints = rosterSpot.player?.playerStats?.reduce(
        (sum: number, stat: any) => sum + Number(stat.fantasyPoints || 0), 
        0
      ) || 0;
      
      if (totalPoints > topPoints) {
        topPoints = totalPoints;
        topPlayer = {
          ...rosterSpot.player,
          totalPoints,
          team: team.name
        };
      }
    });
  });
  
  return topPlayer;
}

function calculateStreak(teamId: string, leagueId: string): string {
  // This would analyze recent matchups to determine W/L streak
  // Placeholder for now
  return 'W2'; // Example: Won last 2 games
}

function getPlayoffStatus(rank: number, totalTeams: number): string {
  const playoffSpots = Math.floor(totalTeams / 2); // Top 50% make playoffs
  
  if (rank <= playoffSpots) {
    return 'IN';
  } else if (rank <= playoffSpots + 2) {
    return 'BUBBLE';
  } else {
    return 'OUT';
  }
}