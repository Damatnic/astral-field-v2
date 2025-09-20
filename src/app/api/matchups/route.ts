import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const leagueId = searchParams.get('leagueId');
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session and get user
    const session = await prisma.userSession.findUnique({
      where: { sessionId },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get user's league if not specified
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    // Get league to find current week
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { currentWeek: true, season: true, settings: true }
    });
    
    const currentWeek = week ? parseInt(week) : (league?.currentWeek || 15);
    const currentSeason = league?.season || 2024;
    
    // Validate week
    if (currentWeek < 1 || currentWeek > 17) {
      return NextResponse.json(
        { success: false, message: 'Invalid week number' },
        { status: 400 }
      );
    }
    
    // Get matchups from database
    let matchups = await prisma.matchup.findMany({
      where: {
        leagueId: targetLeagueId,
        week: currentWeek,
        season: currentSeason
      },
      include: {
        homeTeam: {
          include: {
            owner: true,
            roster: {
              include: {
                player: true
              }
            }
          }
        },
        awayTeam: {
          include: {
            owner: true,
            roster: {
              include: {
                player: true
              }
            }
          }
        }
      }
    });
    
    // If no matchups exist, create them
    if (matchups.length === 0) {
      matchups = await createWeekMatchups(targetLeagueId, currentWeek, currentSeason);
    }
    
    // Calculate scores for each matchup
    const formattedMatchups = await Promise.all(matchups.map(async (matchup) => {
      const homeScore = calculateTeamScore(matchup.homeTeam.roster);
      const awayScore = calculateTeamScore(matchup.awayTeam.roster);
      const homeProjected = calculateProjectedScore(matchup.homeTeam.roster);
      const awayProjected = calculateProjectedScore(matchup.awayTeam.roster);
      
      // Update matchup scores in database
      if (homeScore > 0 || awayScore > 0) {
        await prisma.matchup.update({
          where: { id: matchup.id },
          data: {
            homeScore,
            awayScore,
            isComplete: currentWeek < (league?.currentWeek || 15)
          }
        });
      }
      
      return {
        id: matchup.id,
        week: matchup.week,
        homeTeam: {
          id: matchup.homeTeam.id,
          name: matchup.homeTeam.name,
          owner: matchup.homeTeam.owner.name,
          score: homeScore,
          projectedScore: homeProjected,
          roster: formatRoster(matchup.homeTeam.roster)
        },
        awayTeam: {
          id: matchup.awayTeam.id,
          name: matchup.awayTeam.name,
          owner: matchup.awayTeam.owner.name,
          score: awayScore,
          projectedScore: awayProjected,
          roster: formatRoster(matchup.awayTeam.roster)
        },
        status: matchup.isComplete ? 'completed' : 'in_progress',
        isPlayoffs: currentWeek >= 15,
        isChampionship: currentWeek === 17
      };
    }));

    return NextResponse.json({
      success: true,
      data: formattedMatchups,
      week: currentWeek,
      isPlayoffs: currentWeek >= 15,
      message: `Matchups for Week ${currentWeek}`
    });

  } catch (error) {
    handleComponentError(error as Error, 'matchups-api');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}

async function createWeekMatchups(leagueId: string, week: number, season: number) {
  // Get all teams in the league
  const teams = await prisma.team.findMany({
    where: { leagueId },
    include: { owner: true }
  });
  
  if (teams.length < 2) {
    return [];
  }
  
  // Simple round-robin matchup creation
  // In a real app, this would follow the league's schedule
  const matchups = [];
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
    const matchup = await prisma.matchup.create({
      data: {
        leagueId,
        week,
        season,
        homeTeamId: shuffledTeams[i].id,
        awayTeamId: shuffledTeams[i + 1].id,
        homeScore: 0,
        awayScore: 0,
        isComplete: false
      },
      include: {
        homeTeam: {
          include: {
            owner: true,
            roster: {
              include: {
                player: true
              }
            }
          }
        },
        awayTeam: {
          include: {
            owner: true,
            roster: {
              include: {
                player: true
              }
            }
          }
        }
      }
    });
    matchups.push(matchup);
  }
  
  return matchups;
}

function calculateTeamScore(roster: any[]): number {
  // For now, return mock scores since we don't have playerStats in the schema
  // In production, this would pull from an external stats API
  let totalScore = 0;
  
  roster.forEach(rosterPlayer => {
    // Only count starters
    if (rosterPlayer.position !== 'BENCH' && rosterPlayer.position !== 'IR') {
      // Mock scoring based on player position
      const positionScores: { [key: string]: number } = {
        'QB': 18 + Math.random() * 15,
        'RB': 12 + Math.random() * 10,
        'WR': 10 + Math.random() * 12,
        'TE': 8 + Math.random() * 8,
        'K': 7 + Math.random() * 6,
        'DST': 5 + Math.random() * 10
      };
      const score = positionScores[rosterPlayer.player.position] || 0;
      totalScore += score;
    }
  });
  
  return Math.round(totalScore * 10) / 10;
}

function calculateProjectedScore(roster: any[]): number {
  // For now, return mock projections since we don't have projections in the schema
  // In production, this would pull from an external projections API
  let totalProjected = 0;
  
  roster.forEach(rosterPlayer => {
    // Only count starters
    if (rosterPlayer.position !== 'BENCH' && rosterPlayer.position !== 'IR') {
      // Mock projections based on player position
      const positionProjections: { [key: string]: number } = {
        'QB': 20 + Math.random() * 10,
        'RB': 14 + Math.random() * 8,
        'WR': 12 + Math.random() * 8,
        'TE': 9 + Math.random() * 6,
        'K': 8 + Math.random() * 4,
        'DST': 7 + Math.random() * 8
      };
      const projection = positionProjections[rosterPlayer.player.position] || 0;
      totalProjected += projection;
    }
  });
  
  return Math.round(totalProjected * 10) / 10;
}

function formatRoster(roster: any[]): any[] {
  return roster.map(rp => ({
    playerId: rp.player.id,
    playerName: rp.player.name,
    position: rp.player.position,
    rosterSlot: rp.position,
    points: 0, // Would come from external stats API
    projected: 0 // Would come from external projections API
  }));
}