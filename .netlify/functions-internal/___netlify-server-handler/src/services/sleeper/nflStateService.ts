/**
 * NFL State Management Service
 * Tracks current season, week, and game status from Sleeper API
 * 
 * Features:
 * - Current NFL season and week tracking
 * - Game day detection and scheduling
 * - Season type management (preseason, regular, playoffs)
 * - Timezone-aware date handling
 * - Automatic state refresh and caching
 */

import { SleeperApiService } from './sleeperApiService';
import { NFLState } from '@/types/sleeper';
import { withRetry, ErrorHandler } from './errorHandler';
import { handleComponentError } from '@/utils/errorHandling';

export interface GameSchedule {
  week: number;
  startDate: Date;
  endDate: Date;
  isGameWeek: boolean;
  daysUntilGames: number;
}

export interface SeasonInfo {
  current: string;
  previous: string;
  isActive: boolean;
  seasonType: 'pre' | 'regular' | 'post';
  weeksRemaining: number;
  playoffWeeks: number[];
}

export class NFLStateService {
  private sleeperApi: SleeperApiService;
  private currentState: NFLState | null = null;
  private lastRefresh: number = 0;
  private refreshInterval: number = 300000; // 5 minutes

  constructor() {
    this.sleeperApi = new SleeperApiService();
    this.startPeriodicRefresh();
  }

  /**
   * Get current NFL state with intelligent caching
   */
  async getCurrentState(forceRefresh: boolean = false): Promise<NFLState> {
    const now = Date.now();
    
    if (!this.currentState || forceRefresh || (now - this.lastRefresh) > this.refreshInterval) {
      try {
        this.currentState = await withRetry(
          () => this.sleeperApi.getNFLState(),
          undefined,
          'Fetching NFL state'
        );
        this.lastRefresh = now;} catch (error) {
        handleComponentError(error as Error, 'nflStateService');
        
        // Return cached state if available, otherwise throw
        if (!this.currentState) {
          throw ErrorHandler.createSleeperError(error, '/state/nfl', 'Failed to get NFL state');
        }}
    }
    
    return this.currentState;
  }

  /**
   * Force refresh state cache
   */
  async refreshState(): Promise<NFLState> {
    return this.getCurrentState(true);
  }

  /**
   * Get current week number
   */
  async getCurrentWeek(): Promise<number> {
    const state = await this.getCurrentState();
    return state.week;
  }

  /**
   * Get current season year
   */
  async getCurrentSeason(): Promise<string> {
    const state = await this.getCurrentState();
    return state.season;
  }

  /**
   * Get previous season year
   */
  async getPreviousSeason(): Promise<string> {
    const state = await this.getCurrentState();
    return state.previous_season;
  }

  /**
   * Check if we're in regular season
   */
  async isRegularSeason(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.season_type === 'regular';
  }

  /**
   * Check if we're in playoffs
   */
  async isPlayoffs(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.season_type === 'post';
  }

  /**
   * Check if we're in preseason
   */
  async isPreseason(): Promise<boolean> {
    const state = await this.getCurrentState();
    return state.season_type === 'pre';
  }

  /**
   * Get current season type
   */
  async getSeasonType(): Promise<'pre' | 'regular' | 'post'> {
    const state = await this.getCurrentState();
    return state.season_type;
  }

  /**
   * Get week start/end dates
   */
  async getWeekDates(week?: number): Promise<{ start: Date; end: Date }> {
    const state = await this.getCurrentState();
    
    if (week && week !== state.week) {
      // Calculate dates for a different week
      const currentWeekStart = new Date(state.week_start_date || Date.now());
      const weekDiff = week - state.week;
      const targetWeekStart = new Date(currentWeekStart.getTime() + (weekDiff * 7 * 24 * 60 * 60 * 1000));
      const targetWeekEnd = new Date(targetWeekStart.getTime() + (7 * 24 * 60 * 60 * 1000) - 1);
      
      return {
        start: targetWeekStart,
        end: targetWeekEnd
      };
    }
    
    return {
      start: new Date(state.week_start_date || Date.now()),
      end: new Date(state.week_end_date || Date.now())
    };
  }

  /**
   * Get season start/end dates
   */
  async getSeasonDates(): Promise<{ start: Date; end: Date }> {
    const state = await this.getCurrentState();
    return {
      start: new Date(state.season_start_date || Date.now()),
      end: new Date(state.season_end_date || Date.now())
    };
  }

  /**
   * Get game schedule information for current week
   */
  async getCurrentGameSchedule(): Promise<GameSchedule> {
    const state = await this.getCurrentState();
    const weekDates = await this.getWeekDates();
    const now = new Date();
    
    const daysUntilGames = Math.max(0, Math.ceil((weekDates.start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    const isGameWeek = now >= weekDates.start && now <= weekDates.end;
    
    return {
      week: state.week,
      startDate: weekDates.start,
      endDate: weekDates.end,
      isGameWeek,
      daysUntilGames
    };
  }

  /**
   * Get comprehensive season information
   */
  async getSeasonInfo(): Promise<SeasonInfo> {
    const state = await this.getCurrentState();
    const seasonDates = await this.getSeasonDates();
    const now = new Date();
    
    const isActive = now >= seasonDates.start && now <= seasonDates.end;
    const weeksRemaining = Math.max(0, this.calculateWeeksRemaining(state, now));
    
    return {
      current: state.season,
      previous: state.previous_season,
      isActive,
      seasonType: state.season_type,
      weeksRemaining,
      playoffWeeks: this.getPlayoffWeeks(state.season_type)
    };
  }

  /**
   * Check if today is an NFL game day
   */
  async isGameDay(): Promise<boolean> {
    const schedule = await this.getCurrentGameSchedule();
    const now = new Date();
    
    // Check if we're within the game week
    if (!schedule.isGameWeek) {
      return false;
    }
    
    // NFL games typically on Thursday, Sunday, Monday
    const dayOfWeek = now.getDay();
    const gamedays = [0, 1, 4]; // Sunday, Monday, Thursday
    
    return gamedays.includes(dayOfWeek);
  }

  /**
   * Get next game day
   */
  async getNextGameDay(): Promise<Date> {
    const schedule = await this.getCurrentGameSchedule();
    const now = new Date();
    
    // If we're in a game week, find the next game day
    if (schedule.isGameWeek) {
      const daysOfWeek = [0, 1, 4]; // Sunday, Monday, Thursday
      const currentDay = now.getDay();
      
      for (const gameDay of daysOfWeek) {
        if (gameDay > currentDay) {
          const nextGame = new Date(now);
          nextGame.setDate(now.getDate() + (gameDay - currentDay));
          nextGame.setHours(13, 0, 0, 0); // Default to 1 PM
          return nextGame;
        }
      }
    }
    
    // If no games this week, return next Thursday
    const nextThursday = new Date(schedule.startDate);
    nextThursday.setDate(nextThursday.getDate() + ((4 - nextThursday.getDay() + 7) % 7));
    nextThursday.setHours(20, 0, 0, 0); // Thursday Night Football at 8 PM
    
    return nextThursday;
  }

  /**
   * Check if we're in scoring period (during games)
   */
  async isScoringPeriod(): Promise<boolean> {
    const isGameDay = await this.isGameDay();
    if (!isGameDay) return false;
    
    const now = new Date();
    const hour = now.getHours();
    
    // Scoring typically happens during game hours (1 PM - 11 PM ET)
    return hour >= 13 && hour <= 23;
  }

  /**
   * Get fantasy week for a given NFL week
   */
  getFantasyWeek(nflWeek: number, seasonType: 'pre' | 'regular' | 'post' = 'regular'): number {
    if (seasonType === 'regular') {
      return nflWeek;
    } else if (seasonType === 'post') {
      return nflWeek + 18; // Playoffs start after week 18
    } else {
      return 0; // Preseason
    }
  }

  /**
   * Calculate weeks remaining in season
   */
  private calculateWeeksRemaining(state: NFLState, currentDate: Date): number {
    const seasonEnd = new Date(state.season_end_date || Date.now());
    const millisecondsRemaining = seasonEnd.getTime() - currentDate.getTime();
    const weeksRemaining = millisecondsRemaining / (7 * 24 * 60 * 60 * 1000);
    
    return Math.max(0, Math.ceil(weeksRemaining));
  }

  /**
   * Get playoff weeks based on season type
   */
  private getPlayoffWeeks(seasonType: 'pre' | 'regular' | 'post'): number[] {
    if (seasonType === 'post') {
      return [19, 20, 21, 22]; // Wild Card, Divisional, Conference, Super Bowl
    }
    return [];
  }

  /**
   * Start periodic state refresh
   */
  private startPeriodicRefresh(): void {
    setInterval(async () => {
      try {
        await this.getCurrentState(true);
      } catch (error) {
        handleComponentError(error as Error, 'nflStateService');
      }
    }, this.refreshInterval);
    
    // eslint-disable-next-line no-console
    console.log(`🕒 NFL state periodic refresh started (every ${this.refreshInterval / 1000}s)`);
  }

  /**
   * Get timing recommendations for different operations
   */
  async getTimingRecommendations(): Promise<{
    playerSync: 'high' | 'medium' | 'low';
    liveScoring: 'active' | 'reduced' | 'minimal';
    cacheRefresh: number; // seconds
  }> {
    const isGameDay = await this.isGameDay();
    const isScoringPeriod = await this.isScoringPeriod();
    const seasonType = await this.getSeasonType();
    
    let playerSync: 'high' | 'medium' | 'low' = 'medium';
    let liveScoring: 'active' | 'reduced' | 'minimal' = 'reduced';
    let cacheRefresh = 300; // 5 minutes default
    
    if (seasonType === 'regular') {
      if (isScoringPeriod) {
        playerSync = 'high';
        liveScoring = 'active';
        cacheRefresh = 30; // 30 seconds during games
      } else if (isGameDay) {
        playerSync = 'medium';
        liveScoring = 'reduced';
        cacheRefresh = 60; // 1 minute on game days
      } else {
        playerSync = 'low';
        liveScoring = 'minimal';
        cacheRefresh = 600; // 10 minutes on non-game days
      }
    } else if (seasonType === 'post') {
      // Playoffs - higher intensity
      playerSync = 'high';
      liveScoring = isScoringPeriod ? 'active' : 'reduced';
      cacheRefresh = isScoringPeriod ? 30 : 120;
    } else {
      // Preseason - lower intensity
      playerSync = 'low';
      liveScoring = 'minimal';
      cacheRefresh = 1800; // 30 minutes
    }
    
    return {
      playerSync,
      liveScoring,
      cacheRefresh
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    healthy: boolean;
    lastRefresh: Date | null;
    cacheAge: number; // seconds
    hasState: boolean;
  } {
    const now = Date.now();
    const cacheAge = this.lastRefresh ? (now - this.lastRefresh) / 1000 : 0;
    
    return {
      healthy: !!this.currentState && cacheAge < (this.refreshInterval / 1000) * 2,
      lastRefresh: this.lastRefresh ? new Date(this.lastRefresh) : null,
      cacheAge,
      hasState: !!this.currentState
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear any timers or resources if needed
  }
}

// Export singleton instance
export const nflStateService = new NFLStateService();