import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { 
  getPlayersLockStatus, 
  isWeekLocked, 
  getTimeUntilNextLock,
  getWeekGameInfo,
  formatTimeUntilLock 
} from '@/lib/gameTimeUtils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/lineup/lock-status - Get comprehensive lock status information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');
    const week = searchParams.get('week');
    const playerIds = searchParams.get('playerIds')?.split(',').filter(Boolean);
    
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
    
    // Get league info
    const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
    
    if (!targetLeagueId) {
      return NextResponse.json(
        { error: 'No league found' },
        { status: 404 }
      );
    }
    
    const league = await prisma.league.findUnique({
      where: { id: targetLeagueId },
      select: { currentWeek: true }
    });
    
    const targetWeek = week ? parseInt(week) : (league?.currentWeek || 15);
    
    // Get week lock status
    const weekLocked = await isWeekLocked(targetWeek);
    
    // Get time until next lock
    const timeUntilLock = await getTimeUntilNextLock(targetWeek);
    
    // Get game information for the week
    const games = await getWeekGameInfo(targetWeek);
    
    // Get player lock status if player IDs provided
    let playersLockStatus = null;
    if (playerIds && playerIds.length > 0) {
      playersLockStatus = await getPlayersLockStatus(playerIds, targetWeek);
    } else {
      // If no specific players, get user's roster
      const team = await prisma.team.findFirst({
        where: {
          ownerId: session.userId,
          leagueId: targetLeagueId
        },
        include: {
          roster: {
            select: {
              playerId: true
            }
          }
        }
      });
      
      if (team) {
        const rosterIds = team.roster.map(rp => rp.playerId);
        playersLockStatus = await getPlayersLockStatus(rosterIds, targetWeek);
      }
    }
    
    // Group players by lock status
    const lockedPlayers = playersLockStatus?.filter(p => p.isLocked) || [];
    const unlockedPlayers = playersLockStatus?.filter(p => !p.isLocked) || [];
    
    // Group games by status
    const upcomingGames = games.filter(g => !g.isLive && !g.isCompleted);
    const liveGames = games.filter(g => g.isLive);
    const completedGames = games.filter(g => g.isCompleted);
    
    // Calculate next game time
    const nextGame = upcomingGames.length > 0 
      ? upcomingGames.sort((a, b) => a.gameTime.getTime() - b.gameTime.getTime())[0] 
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        week: targetWeek,
        weekLocked,
        timeUntilNextLock: {
          minutes: timeUntilLock.minutes,
          formatted: formatTimeUntilLock(timeUntilLock.minutes),
          nextGame: timeUntilLock.nextGame
        },
        games: {
          upcoming: upcomingGames.map(g => ({
            gameId: g.gameId,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            gameTime: g.gameTime,
            timeUntilStart: Math.max(0, Math.floor((g.gameTime.getTime() - new Date().getTime()) / (1000 * 60)))
          })),
          live: liveGames.map(g => ({
            gameId: g.gameId,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            gameTime: g.gameTime
          })),
          completed: completedGames.map(g => ({
            gameId: g.gameId,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            gameTime: g.gameTime
          }))
        },
        players: {
          locked: lockedPlayers.map(p => ({
            playerId: p.playerId,
            playerName: p.playerName,
            nflTeam: p.nflTeam,
            gameStatus: p.gameStatus,
            gameTime: p.gameTime
          })),
          unlocked: unlockedPlayers.map(p => ({
            playerId: p.playerId,
            playerName: p.playerName,
            nflTeam: p.nflTeam,
            gameStatus: p.gameStatus,
            gameTime: p.gameTime,
            timeUntilLock: p.timeUntilLock ? {
              minutes: p.timeUntilLock,
              formatted: formatTimeUntilLock(p.timeUntilLock)
            } : null
          }))
        },
        summary: {
          totalPlayers: playersLockStatus?.length || 0,
          lockedPlayers: lockedPlayers.length,
          unlockedPlayers: unlockedPlayers.length,
          percentageLocked: playersLockStatus?.length ? Math.round((lockedPlayers.length / playersLockStatus.length) * 100) : 0,
          nextLockTime: nextGame?.gameTime || null,
          canMakeChanges: !weekLocked || unlockedPlayers.length > 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get lock status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lock status' },
      { status: 500 }
    );
  }
}

// POST /api/lineup/lock-status - Check lock status for specific players/positions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerIds, week, leagueId, includeGameInfo = false } = body;
    
    if (!playerIds || !Array.isArray(playerIds)) {
      return NextResponse.json(
        { error: 'playerIds array is required' },
        { status: 400 }
      );
    }
    
    // Get session from cookies
    const cookieStore = cookies();
    const sessionId = cookieStore.get('session')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Verify session
    const session = await prisma.userSession.findUnique({
      where: { sessionId }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    // Get league info if needed
    let targetWeek = week;
    if (!targetWeek) {
      const targetLeagueId = leagueId || await getDefaultLeagueId(session.userId);
      if (targetLeagueId) {
        const league = await prisma.league.findUnique({
          where: { id: targetLeagueId },
          select: { currentWeek: true }
        });
        targetWeek = league?.currentWeek || 15;
      } else {
        targetWeek = 15; // Default week
      }
    }
    
    // Get lock status for specified players
    const lockStatuses = await getPlayersLockStatus(playerIds, targetWeek);
    
    // Get additional game info if requested
    let gameInfo = null;
    if (includeGameInfo) {
      const games = await getWeekGameInfo(targetWeek);
      gameInfo = games;
    }
    
    // Group by team and lock status
    const teamGroups: { [team: string]: any[] } = {};
    const lockGroups = {
      locked: [] as any[],
      unlocked: [] as any[]
    };
    
    for (const status of lockStatuses) {
      const team = status.nflTeam;
      if (!teamGroups[team]) {
        teamGroups[team] = [];
      }
      teamGroups[team].push(status);
      
      if (status.isLocked) {
        lockGroups.locked.push(status);
      } else {
        lockGroups.unlocked.push(status);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        week: targetWeek,
        players: lockStatuses,
        groupedByTeam: teamGroups,
        groupedByLockStatus: lockGroups,
        summary: {
          totalPlayers: lockStatuses.length,
          lockedPlayers: lockGroups.locked.length,
          unlockedPlayers: lockGroups.unlocked.length,
          teamsRepresented: Object.keys(teamGroups).length,
          earliestLock: lockGroups.unlocked.length > 0 
            ? Math.min(...lockGroups.unlocked.map(p => p.timeUntilLock || Infinity).filter(t => t !== Infinity))
            : null
        },
        gameInfo
      }
    });
    
  } catch (error) {
    console.error('Check player lock status error:', error);
    return NextResponse.json(
      { error: 'Failed to check player lock status' },
      { status: 500 }
    );
  }
}

// Helper Functions

async function getDefaultLeagueId(userId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { ownerId: userId },
    select: { leagueId: true }
  });
  return team?.leagueId || null;
}