import { prisma } from '@/lib/db';

// NFL Game Time Management Utilities
export interface NFLGameTime {
  gameId: string;
  week: number;
  season: number;
  homeTeam: string;
  awayTeam: string;
  gameTime: Date;
  isCompleted: boolean;
  isLive: boolean;
}

export interface PlayerLockStatus {
  playerId: string;
  playerName: string;
  nflTeam: string;
  isLocked: boolean;
  gameTime?: Date;
  gameStatus: 'PRE' | 'LIVE' | 'POST';
  timeUntilLock?: number; // minutes until lock
}

// Standard NFL game times (EST)
const NFL_GAME_TIMES = {
  THURSDAY: { hour: 20, minute: 20 }, // 8:20 PM Thursday Night Football
  SUNDAY_EARLY: { hour: 13, minute: 0 }, // 1:00 PM Sunday games
  SUNDAY_LATE: { hour: 16, minute: 25 }, // 4:25 PM Sunday games
  SUNDAY_NIGHT: { hour: 20, minute: 20 }, // 8:20 PM Sunday Night Football
  MONDAY: { hour: 20, minute: 15 }, // 8:15 PM Monday Night Football
  LONDON: { hour: 9, minute: 30 }, // 9:30 AM London games
  PLAYOFFS: { hour: 13, minute: 0 } // Varies, but default to 1:00 PM
};

// NFL team abbreviations
const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
  'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
  'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
  'TEN', 'WAS'
];

/**
 * Get lock status for multiple players
 */
export async function getPlayersLockStatus(playerIds: string[], week: number, season: number = 2024): Promise<PlayerLockStatus[]> {
  try {
    // Get players with their NFL teams
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds }
      },
      select: {
        id: true,
        name: true,
        nflTeam: true,
        position: true
      }
    });

    const lockStatuses: PlayerLockStatus[] = [];
    const now = new Date();

    for (const player of players) {
      // Get game time for this player's team
      const gameTime = await getTeamGameTime(player.nflTeam || '', week, season);
      
      if (!gameTime) {
        // No game found, player is not locked
        lockStatuses.push({
          playerId: player.id,
          playerName: player.name,
          nflTeam: player.nflTeam || 'FA',
          isLocked: false,
          gameStatus: 'PRE'
        });
        continue;
      }

      const isLocked = now >= gameTime;
      const isLive = isLocked && now < new Date(gameTime.getTime() + (4 * 60 * 60 * 1000)); // Game + 4 hours
      const timeUntilLock = isLocked ? 0 : Math.floor((gameTime.getTime() - now.getTime()) / (1000 * 60));

      let gameStatus: 'PRE' | 'LIVE' | 'POST' = 'PRE';
      if (isLive) gameStatus = 'LIVE';
      else if (isLocked) gameStatus = 'POST';

      lockStatuses.push({
        playerId: player.id,
        playerName: player.name,
        nflTeam: player.nflTeam || 'FA',
        isLocked,
        gameTime,
        gameStatus,
        timeUntilLock: timeUntilLock > 0 ? timeUntilLock : undefined
      });
    }

    return lockStatuses;
  } catch (error) {
    console.error('Error getting player lock status:', error);
    return playerIds.map(id => ({
      playerId: id,
      playerName: 'Unknown',
      nflTeam: 'UNK',
      isLocked: false,
      gameStatus: 'PRE' as const
    }));
  }
}

/**
 * Get game time for a specific NFL team in a given week
 */
export async function getTeamGameTime(nflTeam: string, week: number, season: number = 2024): Promise<Date | null> {
  try {
    // In a production environment, this would query an NFL schedule database
    // For now, we'll use a mock schedule based on typical NFL game times
    
    if (!NFL_TEAMS.includes(nflTeam)) {
      return null; // Free agent or invalid team
    }

    // Mock schedule logic - in production, replace with actual NFL API
    const weekStartDate = getWeekStartDate(week, season);
    
    // Determine game day and time based on team and week
    const gameDateTime = calculateGameTime(nflTeam, week, weekStartDate);
    
    return gameDateTime;
  } catch (error) {
    console.error('Error getting team game time:', error);
    return null;
  }
}

/**
 * Check if a specific week's lineups are locked (any games have started)
 */
export async function isWeekLocked(week: number, season: number = 2024): Promise<boolean> {
  try {
    const now = new Date();
    const weekStartDate = getWeekStartDate(week, season);
    
    // Get the earliest game time for this week (usually Thursday 8:20 PM)
    const earliestGameTime = new Date(weekStartDate);
    earliestGameTime.setHours(NFL_GAME_TIMES.THURSDAY.hour, NFL_GAME_TIMES.THURSDAY.minute, 0, 0);
    
    return now >= earliestGameTime;
  } catch (error) {
    console.error('Error checking week lock status:', error);
    return false;
  }
}

/**
 * Get all locked players for a specific week
 */
export async function getLockedPlayersForWeek(week: number, season: number = 2024): Promise<string[]> {
  try {
    const now = new Date();
    const lockedPlayers: string[] = [];
    
    // Get all active players with NFL teams
    const players = await prisma.player.findMany({
      where: {
        isActive: true,
        nflTeam: { not: null }
      },
      select: {
        id: true,
        nflTeam: true
      }
    });

    for (const player of players) {
      const gameTime = await getTeamGameTime(player.nflTeam || '', week, season);
      if (gameTime && now >= gameTime) {
        lockedPlayers.push(player.id);
      }
    }

    return lockedPlayers;
  } catch (error) {
    console.error('Error getting locked players for week:', error);
    return [];
  }
}

/**
 * Get detailed game information for a week
 */
export async function getWeekGameInfo(week: number, season: number = 2024): Promise<NFLGameTime[]> {
  try {
    // Mock game schedule - in production, integrate with NFL API
    const games: NFLGameTime[] = [];
    const weekStartDate = getWeekStartDate(week, season);
    
    // Generate mock games for the week
    const gameSlots = [
      { day: 4, time: NFL_GAME_TIMES.THURSDAY }, // Thursday
      { day: 0, time: NFL_GAME_TIMES.SUNDAY_EARLY }, // Sunday early
      { day: 0, time: NFL_GAME_TIMES.SUNDAY_LATE }, // Sunday late
      { day: 0, time: NFL_GAME_TIMES.SUNDAY_NIGHT }, // Sunday night
      { day: 1, time: NFL_GAME_TIMES.MONDAY } // Monday
    ];

    let gameId = 1;
    for (const slot of gameSlots) {
      const gameDate = new Date(weekStartDate);
      gameDate.setDate(gameDate.getDate() + slot.day);
      gameDate.setHours(slot.time.hour, slot.time.minute, 0, 0);
      
      // Mock matchups (in production, get from NFL API)
      const homeTeam = NFL_TEAMS[gameId % NFL_TEAMS.length];
      const awayTeam = NFL_TEAMS[(gameId + 1) % NFL_TEAMS.length];
      
      const now = new Date();
      const isCompleted = now > new Date(gameDate.getTime() + (3 * 60 * 60 * 1000)); // 3 hours after start
      const isLive = now >= gameDate && !isCompleted;

      games.push({
        gameId: `${season}_${week}_${gameId}`,
        week,
        season,
        homeTeam,
        awayTeam,
        gameTime: gameDate,
        isCompleted,
        isLive
      });
      
      gameId++;
    }

    return games;
  } catch (error) {
    console.error('Error getting week game info:', error);
    return [];
  }
}

/**
 * Calculate the start date for a given NFL week
 */
function getWeekStartDate(week: number, season: number): Date {
  // NFL season typically starts first Thursday of September
  // This is a simplified calculation - in production, use actual NFL calendar
  const seasonStart = new Date(season, 8, 7); // September 7th as approximate start
  
  // Find first Thursday
  while (seasonStart.getDay() !== 4) {
    seasonStart.setDate(seasonStart.getDate() + 1);
  }
  
  // Add weeks
  const weekStart = new Date(seasonStart);
  weekStart.setDate(weekStart.getDate() + ((week - 1) * 7));
  
  return weekStart;
}

/**
 * Calculate game time for a specific team and week
 */
function calculateGameTime(nflTeam: string, week: number, weekStartDate: Date): Date {
  // Mock logic for assigning teams to time slots
  // In production, this would come from the NFL schedule API
  
  const teamIndex = NFL_TEAMS.indexOf(nflTeam);
  const gameDate = new Date(weekStartDate);
  
  // Simple logic to distribute teams across different time slots
  if (teamIndex % 16 === 0) {
    // Thursday Night Football
    gameDate.setDate(gameDate.getDate() + 0); // Thursday
    gameDate.setHours(NFL_GAME_TIMES.THURSDAY.hour, NFL_GAME_TIMES.THURSDAY.minute, 0, 0);
  } else if (teamIndex % 16 === 1) {
    // Monday Night Football
    gameDate.setDate(gameDate.getDate() + 4); // Monday
    gameDate.setHours(NFL_GAME_TIMES.MONDAY.hour, NFL_GAME_TIMES.MONDAY.minute, 0, 0);
  } else if (teamIndex % 16 === 2) {
    // Sunday Night Football
    gameDate.setDate(gameDate.getDate() + 3); // Sunday
    gameDate.setHours(NFL_GAME_TIMES.SUNDAY_NIGHT.hour, NFL_GAME_TIMES.SUNDAY_NIGHT.minute, 0, 0);
  } else if (teamIndex % 2 === 0) {
    // Sunday early games
    gameDate.setDate(gameDate.getDate() + 3); // Sunday
    gameDate.setHours(NFL_GAME_TIMES.SUNDAY_EARLY.hour, NFL_GAME_TIMES.SUNDAY_EARLY.minute, 0, 0);
  } else {
    // Sunday late games
    gameDate.setDate(gameDate.getDate() + 3); // Sunday
    gameDate.setHours(NFL_GAME_TIMES.SUNDAY_LATE.hour, NFL_GAME_TIMES.SUNDAY_LATE.minute, 0, 0);
  }
  
  return gameDate;
}

/**
 * Get time until next lineup lock
 */
export async function getTimeUntilNextLock(week: number, season: number = 2024): Promise<{
  minutes: number;
  nextGame: { homeTeam: string; awayTeam: string; gameTime: Date } | null;
}> {
  try {
    const now = new Date();
    const games = await getWeekGameInfo(week, season);
    
    // Find next game that hasn't started
    const upcomingGames = games
      .filter(game => game.gameTime > now)
      .sort((a, b) => a.gameTime.getTime() - b.gameTime.getTime());
    
    if (upcomingGames.length === 0) {
      return { minutes: 0, nextGame: null };
    }
    
    const nextGame = upcomingGames[0];
    const minutesUntilLock = Math.floor((nextGame.gameTime.getTime() - now.getTime()) / (1000 * 60));
    
    return {
      minutes: minutesUntilLock,
      nextGame: {
        homeTeam: nextGame.homeTeam,
        awayTeam: nextGame.awayTeam,
        gameTime: nextGame.gameTime
      }
    };
  } catch (error) {
    console.error('Error getting time until next lock:', error);
    return { minutes: 0, nextGame: null };
  }
}

/**
 * Format time until lock for display
 */
export function formatTimeUntilLock(minutes: number): string {
  if (minutes <= 0) return 'Locked';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  } else if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
}

/**
 * Check if commissioner can override locks
 */
export async function canCommissionerOverride(userId: string, leagueId: string): Promise<boolean> {
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { commissionerId: true }
    });
    
    return league?.commissionerId === userId;
  } catch (error) {
    console.error('Error checking commissioner override:', error);
    return false;
  }
}