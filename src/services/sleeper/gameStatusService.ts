/**
 * Enhanced NFL Game Status Detection Service
 * Provides detailed game status information for optimal scoring timing
 * 
 * Features:
 * - Real-time game status detection
 * - Multiple time zone support
 * - Game schedule integration
 * - Smart caching with automatic invalidation
 * - Detailed game timing information
 */

import { SleeperApiService } from './sleeperApiService';
import { nflStateService } from './nflStateService';
import { sleeperCache } from './core/cacheManager';
import { handleComponentError } from '@/lib/error-handling';

export interface GameInfo {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  estimatedEndTime: Date;
  status: GameStatus;
  quarter: number | null;
  timeRemaining: string | null;
  isRedZone: boolean;
  score: {
    home: number;
    away: number;
  };
}

export interface GameStatus {
  state: 'not_started' | 'pregame' | 'in_progress' | 'halftime' | 'final' | 'postponed' | 'cancelled';
  isLive: boolean;
  isScoringTime: boolean;
  priority: 'high' | 'medium' | 'low';
  nextStatusCheck: Date;
}

export interface GameDay {
  date: Date;
  dayType: 'thursday' | 'sunday_early' | 'sunday_late' | 'sunday_night' | 'monday' | 'tuesday' | 'other';
  games: GameInfo[];
  totalGames: number;
  activeGames: number;
  completedGames: number;
  isScoringActive: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface WeekSchedule {
  week: number;
  season: number;
  seasonType: 'pre' | 'regular' | 'post';
  startDate: Date;
  endDate: Date;
  gameDays: GameDay[];
  totalGames: number;
  isActive: boolean;
  completionPercentage: number;
}

export class GameStatusService {
  private sleeperApi: SleeperApiService;
  private cachedSchedule: WeekSchedule | null = null;
  private lastScheduleUpdate: number = 0;
  private scheduleRefreshInterval = 3600000; // 1 hour

  constructor() {
    this.sleeperApi = new SleeperApiService();
  }

  /**
   * Get current week's game schedule with status
   */
  async getCurrentWeekSchedule(forceRefresh = false): Promise<WeekSchedule> {
    const cacheKey = 'week_schedule:current';
    const now = Date.now();

    // Check cache first
    if (!forceRefresh && this.cachedSchedule && (now - this.lastScheduleUpdate) < this.scheduleRefreshInterval) {
      return this.cachedSchedule;
    }

    try {
      // Get from cache if available
      const cached = await sleeperCache.get<WeekSchedule>(cacheKey);
      if (cached && !forceRefresh) {
        this.cachedSchedule = cached;
        return cached;
      }

      // Fetch fresh data
      const nflState = await nflStateService.getCurrentState();
      const schedule = await this.buildWeekSchedule(nflState.week, parseInt(nflState.season), nflState.season_type);

      // Cache the result
      this.cachedSchedule = schedule;
      this.lastScheduleUpdate = now;
      await sleeperCache.set(cacheKey, schedule, 1800000); // 30 minutes

      return schedule;

    } catch (error) {
      handleComponentError(error as Error, 'gameStatusService');
      
      // Return cached data if available
      if (this.cachedSchedule) {
        return this.cachedSchedule;
      }
      
      throw error;
    }
  }

  /**
   * Get current game status for all active games
   */
  async getCurrentGameStatus(): Promise<{
    isAnyGameActive: boolean;
    activeGames: GameInfo[];
    nextGameTime: Date | null;
    scoringPriority: 'high' | 'medium' | 'low';
    recommendedUpdateInterval: number;
  }> {
    try {
      const schedule = await this.getCurrentWeekSchedule();
      const now = new Date();
      
      let activeGames: GameInfo[] = [];
      let nextGameTime: Date | null = null;
      let isAnyGameActive = false;

      // Check all games today
      for (const gameDay of schedule.gameDays) {
        const isToday = this.isSameDay(gameDay.date, now);
        
        if (isToday) {
          for (const game of gameDay.games) {
            if (game.status.isLive) {
              activeGames.push(game);
              isAnyGameActive = true;
            }
          }
        }

        // Find next game time
        for (const game of gameDay.games) {
          if (game.startTime > now && (!nextGameTime || game.startTime < nextGameTime)) {
            nextGameTime = game.startTime;
          }
        }
      }

      // Determine scoring priority
      let scoringPriority: 'high' | 'medium' | 'low' = 'low';
      let recommendedUpdateInterval = 300000; // 5 minutes default

      if (isAnyGameActive) {
        scoringPriority = 'high';
        recommendedUpdateInterval = 60000; // 1 minute during active games
      } else if (this.isGameDay(now, schedule)) {
        scoringPriority = 'medium';
        recommendedUpdateInterval = 120000; // 2 minutes on game days
      }

      return {
        isAnyGameActive,
        activeGames,
        nextGameTime,
        scoringPriority,
        recommendedUpdateInterval
      };

    } catch (error) {
      handleComponentError(error as Error, 'gameStatusService');
      
      // Fallback response
      return {
        isAnyGameActive: false,
        activeGames: [],
        nextGameTime: null,
        scoringPriority: 'low',
        recommendedUpdateInterval: 300000
      };
    }
  }

  /**
   * Check if we're currently in a high-scoring period
   */
  async isHighScoringPeriod(): Promise<boolean> {
    try {
      const gameStatus = await this.getCurrentGameStatus();
      
      // High scoring period if any games are active
      if (gameStatus.isAnyGameActive) {
        return true;
      }

      // Also consider pre-game and immediate post-game periods
      const now = new Date();
      for (const game of gameStatus.activeGames) {
        const timeToGame = game.startTime.getTime() - now.getTime();
        const gameEnded = now.getTime() - game.estimatedEndTime.getTime();
        
        // 1 hour before game or 30 minutes after
        if ((timeToGame > 0 && timeToGame < 3600000) || (gameEnded > 0 && gameEnded < 1800000)) {
          return true;
        }
      }

      return false;

    } catch (error) {
      handleComponentError(error as Error, 'gameStatusService');
      return false;
    }
  }

  /**
   * Get detailed game information for a specific game
   */
  async getGameDetails(gameId: string): Promise<GameInfo | null> {
    try {
      const schedule = await this.getCurrentWeekSchedule();
      
      for (const gameDay of schedule.gameDays) {
        for (const game of gameDay.games) {
          if (game.gameId === gameId) {
            return game;
          }
        }
      }

      return null;

    } catch (error) {
      handleComponentError(error as Error, 'gameStatusService');
      return null;
    }
  }

  /**
   * Get games happening within a time window
   */
  async getGamesInTimeWindow(windowStart: Date, windowEnd: Date): Promise<GameInfo[]> {
    try {
      const schedule = await this.getCurrentWeekSchedule();
      const games: GameInfo[] = [];

      for (const gameDay of schedule.gameDays) {
        for (const game of gameDay.games) {
          if (game.startTime >= windowStart && game.startTime <= windowEnd) {
            games.push(game);
          }
        }
      }

      return games.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    } catch (error) {
      handleComponentError(error as Error, 'gameStatusService');
      return [];
    }
  }

  /**
   * Build week schedule from NFL data
   */
  private async buildWeekSchedule(week: number, season: number, seasonType: 'pre' | 'regular' | 'post'): Promise<WeekSchedule> {
    try {
      // This would integrate with an external NFL API to get game schedules
      // For now, we'll build a mock schedule based on typical NFL scheduling patterns
      const weekSchedule = this.buildMockWeekSchedule(week, season, seasonType);
      
      // Update game statuses with real data if available
      await this.updateGameStatuses(weekSchedule);
      
      return weekSchedule;

    } catch (error) {
      handleComponentError(error as Error, 'gameStatusService');
      throw error;
    }
  }

  /**
   * Build mock week schedule (to be replaced with real API integration)
   */
  private buildMockWeekSchedule(week: number, season: number, seasonType: 'pre' | 'regular' | 'post'): WeekSchedule {
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const gameDays: GameDay[] = [];

    // Thursday Night Football
    if (week > 1 && seasonType === 'regular') {
      const thursday = new Date(weekStart);
      thursday.setDate(weekStart.getDate() + 4); // Thursday
      thursday.setHours(20, 15, 0, 0); // 8:15 PM ET

      const thursdayGames = this.createMockGames(thursday, 1, 'thursday');
      gameDays.push(this.createGameDay(thursday, 'thursday', thursdayGames));
    }

    // Sunday games
    const sunday = new Date(weekStart);
    sunday.setDate(weekStart.getDate() + 7); // Next Sunday
    
    // Early games (1 PM ET)
    const earlyGames = this.createMockGames(new Date(sunday.setHours(13, 0, 0, 0)), 8, 'sunday_early');
    
    // Late games (4:05/4:25 PM ET)
    const lateGames = this.createMockGames(new Date(sunday.setHours(16, 5, 0, 0)), 4, 'sunday_late');
    
    // Sunday Night Football (8:20 PM ET)
    const snfGames = this.createMockGames(new Date(sunday.setHours(20, 20, 0, 0)), 1, 'sunday_night');

    const allSundayGames = [...earlyGames, ...lateGames, ...snfGames];
    gameDays.push(this.createGameDay(sunday, 'sunday_early', allSundayGames));

    // Monday Night Football
    if (seasonType === 'regular') {
      const monday = new Date(weekStart);
      monday.setDate(weekStart.getDate() + 8); // Monday after Sunday
      monday.setHours(20, 15, 0, 0); // 8:15 PM ET

      const mondayGames = this.createMockGames(monday, 1, 'monday');
      gameDays.push(this.createGameDay(monday, 'monday', mondayGames));
    }

    const totalGames = gameDays.reduce((sum, day) => sum + day.totalGames, 0);
    const completedGames = gameDays.reduce((sum, day) => sum + day.completedGames, 0);

    return {
      week,
      season,
      seasonType,
      startDate: weekStart,
      endDate: weekEnd,
      gameDays,
      totalGames,
      isActive: true,
      completionPercentage: totalGames > 0 ? (completedGames / totalGames) * 100 : 0
    };
  }

  /**
   * Create mock games for testing
   */
  private createMockGames(startTime: Date, count: number, timeSlot: string): GameInfo[] {
    const teams = ['KC', 'BUF', 'MIA', 'NE', 'CIN', 'BAL', 'CLE', 'PIT', 'HOU', 'IND', 'TEN', 'JAX', 'DEN', 'LV', 'LAC', 'KC'];
    const games: GameInfo[] = [];

    for (let i = 0; i < count; i++) {
      const gameStartTime = new Date(startTime);
      gameStartTime.setMinutes(startTime.getMinutes() + (i * 5)); // Stagger slightly

      const homeTeam = teams[i * 2] || 'HOME';
      const awayTeam = teams[i * 2 + 1] || 'AWAY';

      games.push({
        gameId: `${timeSlot}_game_${i}`,
        homeTeam,
        awayTeam,
        startTime: gameStartTime,
        estimatedEndTime: new Date(gameStartTime.getTime() + 3.5 * 60 * 60 * 1000), // 3.5 hours
        status: this.determineGameStatus(gameStartTime),
        quarter: null,
        timeRemaining: null,
        isRedZone: false,
        score: {
          home: Math.floor(Math.random() * 30),
          away: Math.floor(Math.random() * 30)
        }
      });
    }

    return games;
  }

  /**
   * Create a game day object
   */
  private createGameDay(date: Date, dayType: GameDay['dayType'], games: GameInfo[]): GameDay {
    const activeGames = games.filter(g => g.status.isLive).length;
    const completedGames = games.filter(g => g.status.state === 'final').length;
    const isScoringActive = activeGames > 0;

    return {
      date,
      dayType,
      games,
      totalGames: games.length,
      activeGames,
      completedGames,
      isScoringActive,
      priority: activeGames > 0 ? 'high' : (games.length > 0 ? 'medium' : 'low')
    };
  }

  /**
   * Determine game status based on current time
   */
  private determineGameStatus(gameTime: Date): GameStatus {
    const now = new Date();
    const timeToGame = gameTime.getTime() - now.getTime();
    const timeSinceStart = now.getTime() - gameTime.getTime();

    let state: GameStatus['state'];
    let isLive = false;
    let isScoringTime = false;
    let priority: GameStatus['priority'] = 'low';

    if (timeToGame > 3600000) { // More than 1 hour before
      state = 'not_started';
    } else if (timeToGame > 0) { // Pre-game
      state = 'pregame';
      priority = 'medium';
      isScoringTime = timeToGame < 1800000; // 30 minutes before
    } else if (timeSinceStart < 3.5 * 60 * 60 * 1000) { // Within game window
      state = 'in_progress';
      isLive = true;
      isScoringTime = true;
      priority = 'high';
    } else {
      state = 'final';
    }

    return {
      state,
      isLive,
      isScoringTime,
      priority,
      nextStatusCheck: new Date(now.getTime() + (isLive ? 60000 : 300000))
    };
  }

  /**
   * Update game statuses with real data
   */
  private async updateGameStatuses(schedule: WeekSchedule): Promise<void> {
    // This would integrate with real NFL APIs to get current game status
    // For now, we'll update based on current time
    const now = new Date();

    for (const gameDay of schedule.gameDays) {
      for (const game of gameDay.games) {
        game.status = this.determineGameStatus(game.startTime);
      }
    }
  }

  /**
   * Get the start of the current week (Sunday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday is 0
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Check if today is a game day
   */
  private isGameDay(date: Date, schedule: WeekSchedule): boolean {
    return schedule.gameDays.some(gameDay => 
      this.isSameDay(gameDay.date, date) && gameDay.totalGames > 0
    );
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    healthy: boolean;
    lastUpdate: Date | null;
    cacheAge: number;
    hasSchedule: boolean;
  } {
    const now = Date.now();
    const cacheAge = this.lastScheduleUpdate ? (now - this.lastScheduleUpdate) / 1000 : 0;

    return {
      healthy: !!this.cachedSchedule && cacheAge < 7200, // 2 hours
      lastUpdate: this.lastScheduleUpdate ? new Date(this.lastScheduleUpdate) : null,
      cacheAge,
      hasSchedule: !!this.cachedSchedule
    };
  }
}

// Export singleton instance
export const gameStatusService = new GameStatusService();

export default GameStatusService;