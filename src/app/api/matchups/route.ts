import { NextRequest, NextResponse } from 'next/server';
import { handleComponentError } from '@/lib/error-handling';
import { cookies } from 'next/headers';
import { sleeperRealTimeScoringService } from '@/services/sleeper/realTimeScoringService';
import { getMatchupsOptimized, prisma } from '@/lib/db-optimized';
import { redisCache, fantasyKeys } from '@/lib/redis-cache';
import { CACHE_TAGS, getCacheHeaders } from '@/lib/cache';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
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
    
    // Verify session and get user (with caching)
    const sessionCacheKey = `session:${sessionId}`;
    let session = await redisCache.get(sessionCacheKey);
    
    if (!session) {
      session = await prisma.userSession.findUnique({
        where: { sessionId },
        include: { user: true }
      });
      
      if (session) {
        // Cache session for 5 minutes
        await redisCache.set(sessionCacheKey, session, 300);
      }
    }
    
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
    
    // Get league info (with caching)
    const leagueCacheKey = fantasyKeys.leagueInfo(targetLeagueId);
    let league = await redisCache.get(leagueCacheKey);
    
    if (!league) {
      league = await prisma.league.findUnique({
        where: { id: targetLeagueId },
        select: { currentWeek: true, season: true, settings: true }
      });
      
      if (league) {
        await redisCache.set(leagueCacheKey, league, 600); // 10 min cache
      }
    }
    
    const currentWeek = week ? parseInt(week) : (league?.currentWeek || 15);
    const currentSeason = league?.season || 2024;
    
    // Validate week
    if (currentWeek < 1 || currentWeek > 17) {
      return NextResponse.json(
        { success: false, message: 'Invalid week number' },
        { status: 400 }
      );
    }
    
    // Try to get matchups from cache first
    const matchupsCacheKey = fantasyKeys.matchups(targetLeagueId, currentWeek, currentSeason);
    let matchups = await redisCache.get(matchupsCacheKey, [CACHE_TAGS.MATCHUPS]);
    
    if (!matchups) {
      console.log('❌ Matchups cache miss, fetching from database');
      
      // Get matchups from optimized database function
      matchups = await getMatchupsOptimized(targetLeagueId, currentWeek, currentSeason);
      
      // If no matchups exist, create them
      if (matchups.length === 0) {
        matchups = await createWeekMatchups(targetLeagueId, currentWeek, currentSeason);
      }
      
      // Cache matchups (shorter TTL for live games)
      const ttl = currentWeek <= league?.currentWeek ? 60 : 900; // 1 min for live, 15 min for future
      await redisCache.set(matchupsCacheKey, matchups, ttl, [CACHE_TAGS.MATCHUPS]);
    } else {
      console.log('✅ Matchups cache hit');
    }
    
    // Get live scores from SleeperRealTimeScoringService
    let liveScoreUpdate = null;
    try {
      liveScoreUpdate = await sleeperRealTimeScoringService.getLiveScores(targetLeagueId);
      
      // If live scores are available but stale (older than 10 minutes), try to refresh
      if (liveScoreUpdate && liveScoreUpdate.lastUpdated) {
        const lastUpdate = new Date(liveScoreUpdate.lastUpdated);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        if (lastUpdate < tenMinutesAgo) {
          try {
            liveScoreUpdate = await sleeperRealTimeScoringService.updateLeagueScores(targetLeagueId);
          } catch (refreshError) {
            handleComponentError(refreshError as Error, 'matchups-api-refresh-scores');
            // Keep using the stale data if refresh fails
          }
        }
      }
    } catch (error) {
      handleComponentError(error as Error, 'matchups-api-live-scores');
      // Continue without live scores - will fall back to database/mock data
    }

    // Calculate scores for each matchup
    const formattedMatchups = await Promise.all(matchups.map(async (matchup) => {
      let homeScore = 0;
      let awayScore = 0;
      let homeProjected = 0;
      let awayProjected = 0;
      
      // Try to get scores from live data first
      if (liveScoreUpdate) {
        const liveMatchup = liveScoreUpdate.matchups.find(m => m.matchupId === matchup.id);
        if (liveMatchup) {
          homeScore = liveMatchup.homeScore;
          awayScore = liveMatchup.awayScore;
          homeProjected = liveMatchup.homeProjectedScore;
          awayProjected = liveMatchup.awayProjectedScore;
        }
      }
      
      // Fallback to calculated scores if live data unavailable
      if (homeScore === 0 && awayScore === 0) {
        try {
          // Use Promise.race to add timeout protection
          const scoreCalculations = Promise.all([
            calculateTeamScore(matchup.homeTeam.roster, currentWeek, currentSeason),
            calculateTeamScore(matchup.awayTeam.roster, currentWeek, currentSeason),
            calculateProjectedScore(matchup.homeTeam.roster, currentWeek, currentSeason),
            calculateProjectedScore(matchup.awayTeam.roster, currentWeek, currentSeason)
          ]);
          
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Score calculation timeout')), 10000)
          );
          
          const [homeCalc, awayCalc, homeProj, awayProj] = await Promise.race([
            scoreCalculations,
            timeout
          ]) as [number, number, number, number];
          
          homeScore = homeCalc;
          awayScore = awayCalc;
          homeProjected = homeProj;
          awayProjected = awayProj;
        } catch (error) {
          handleComponentError(error as Error, 'matchups-api-score-calculation');
          // Use basic fallback scores
          homeScore = 0;
          awayScore = 0;
          homeProjected = 0;
          awayProjected = 0;
        }
      }
      
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
          roster: await formatRoster(matchup.homeTeam.roster, currentWeek, currentSeason, liveScoreUpdate)
        },
        awayTeam: {
          id: matchup.awayTeam.id,
          name: matchup.awayTeam.name,
          owner: matchup.awayTeam.owner.name,
          score: awayScore,
          projectedScore: awayProjected,
          roster: await formatRoster(matchup.awayTeam.roster, currentWeek, currentSeason, liveScoreUpdate)
        },
        status: matchup.isComplete ? 'completed' : 'in_progress',
        isPlayoffs: currentWeek >= 15,
        isChampionship: currentWeek === 17
      };
    }));

    const response = {
      success: true,
      data: formattedMatchups,
      week: currentWeek,
      isPlayoffs: currentWeek >= 15,
      message: `Matchups for Week ${currentWeek}`,
      meta: {
        requestTime: Date.now() - startTime,
        cached: !!matchups,
        timestamp: Date.now(),
      }
    };

    // Set cache headers for real-time data
    const headers = getCacheHeaders('realtime');
    
    return NextResponse.json(response, { headers });

  } catch (error) {
    handleComponentError(error as Error, 'matchups-api');
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        requestTime: Date.now() - startTime,
      },
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

async function calculateTeamScore(roster: any[], week: number, season: number): Promise<number> {
  let totalScore = 0;
  
  for (const rosterPlayer of roster) {
    // Only count starters
    if (rosterPlayer.position !== 'BENCH' && rosterPlayer.position !== 'IR') {
      try {
        // Get player stats from database
        const playerStats = await prisma.playerStats.findFirst({
          where: {
            playerId: rosterPlayer.player.id,
            week,
            season,
          },
        });
        
        if (playerStats && playerStats.fantasyPoints) {
          totalScore += Number(playerStats.fantasyPoints);
        } else {
          // Fallback to mock scoring if no real data
          const positionScores: { [key: string]: number } = {
            'QB': 15,
            'RB': 10,
            'WR': 8,
            'TE': 6,
            'K': 5,
            'DST': 7
          };
          totalScore += positionScores[rosterPlayer.player.position] || 0;
        }
      } catch (error) {
        handleComponentError(error as Error, 'calculateTeamScore');
        // Fallback to base score on error
        const positionScores: { [key: string]: number } = {
          'QB': 15,
          'RB': 10,
          'WR': 8,
          'TE': 6,
          'K': 5,
          'DST': 7
        };
        totalScore += positionScores[rosterPlayer.player.position] || 0;
      }
    }
  }
  
  return Math.round(totalScore * 100) / 100;
}

async function calculateProjectedScore(roster: any[], week: number, season: number): Promise<number> {
  let totalProjected = 0;
  
  for (const rosterPlayer of roster) {
    // Only count starters
    if (rosterPlayer.position !== 'BENCH' && rosterPlayer.position !== 'IR') {
      try {
        // Get player projections from database
        const projection = await prisma.playerProjection.findFirst({
          where: {
            playerId: rosterPlayer.player.id,
            week,
            season,
          },
        });
        
        if (projection && projection.projectedPoints) {
          totalProjected += Number(projection.projectedPoints);
        } else {
          // Fallback to reasonable projections if no real data
          const positionProjections: { [key: string]: number } = {
            'QB': 18,
            'RB': 12,
            'WR': 10,
            'TE': 8,
            'K': 6,
            'DST': 8
          };
          totalProjected += positionProjections[rosterPlayer.player.position] || 0;
        }
      } catch (error) {
        handleComponentError(error as Error, 'calculateProjectedScore');
        // Fallback to base projection on error
        const positionProjections: { [key: string]: number } = {
          'QB': 18,
          'RB': 12,
          'WR': 10,
          'TE': 8,
          'K': 6,
          'DST': 8
        };
        totalProjected += positionProjections[rosterPlayer.player.position] || 0;
      }
    }
  }
  
  return Math.round(totalProjected * 100) / 100;
}

async function formatRoster(roster: any[], week: number, season: number, liveScoreUpdate: any): Promise<any[]> {
  const formattedRoster = [];
  
  for (const rp of roster) {
    let points = 0;
    let projected = 0;
    
    try {
      // Try to get points from live data first
      if (liveScoreUpdate) {
        const livePlayer = liveScoreUpdate.matchups
          .flatMap((m: any) => m.playerScores)
          .find((p: any) => p.playerId === rp.player.id);
        
        if (livePlayer) {
          points = livePlayer.actualPoints;
          projected = livePlayer.projectedPoints;
        }
      }
      
      // Fallback to database if live data unavailable
      if (points === 0) {
        const playerStats = await prisma.playerStats.findFirst({
          where: {
            playerId: rp.player.id,
            week,
            season,
          },
        });
        
        if (playerStats && playerStats.fantasyPoints) {
          points = Number(playerStats.fantasyPoints);
        }
      }
      
      if (projected === 0) {
        const projection = await prisma.playerProjection.findFirst({
          where: {
            playerId: rp.player.id,
            week,
            season,
          },
        });
        
        if (projection && projection.projectedPoints) {
          projected = Number(projection.projectedPoints);
        } else {
          // Fallback projections
          const positionProjections: { [key: string]: number } = {
            'QB': 18,
            'RB': 12,
            'WR': 10,
            'TE': 8,
            'K': 6,
            'DST': 8
          };
          projected = positionProjections[rp.player.position] || 0;
        }
      }
    } catch (error) {
      handleComponentError(error as Error, 'formatRoster');
      // Keep default values on error
    }
    
    formattedRoster.push({
      playerId: rp.player.id,
      playerName: rp.player.name,
      position: rp.player.position,
      rosterSlot: rp.position,
      points: Math.round(points * 100) / 100,
      projected: Math.round(projected * 100) / 100
    });
  }
  
  return formattedRoster;
}