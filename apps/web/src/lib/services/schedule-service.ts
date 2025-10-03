/**
 * Schedule Service
 * Provides schedule difficulty analysis for players and teams
 */

export interface ScheduleDifficulty {
  week: number
  opponent: string
  difficulty: number // 0-1, higher is more difficult
  rating: 'EASY' | 'MODERATE' | 'HARD' | 'VERY_HARD'
  positionRankings: Record<string, number> // Opponent's defensive ranking by position
}

export interface UpcomingSchedule {
  playerId: string
  playerName: string
  team: string
  position: string
  nextThreeWeeks: ScheduleDifficulty[]
  restOfSeason: ScheduleDifficulty[]
  averageDifficulty: number
  favorableMatchups: number
  toughMatchups: number
}

export interface StrengthOfSchedule {
  teamId: string
  teamName: string
  overallSOS: number // 0-1, higher is harder
  remainingSOS: number
  playoffSOS: number // Weeks 15-17
  byPosition: Record<string, number>
  ranking: number // 1-32
}

export class ScheduleService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 86400000 // 24 hours

  /**
   * Get upcoming schedule for a player
   */
  async getUpcomingSchedule(
    playerId: string,
    playerName: string,
    team: string,
    position: string,
    currentWeek: number
  ): Promise<UpcomingSchedule> {
    const cacheKey = `schedule-${playerId}-${currentWeek}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    // Generate schedule (in production, fetch from database)
    const schedule = await this.generateSchedule(team, position, currentWeek)
    
    const nextThreeWeeks = schedule.slice(0, 3)
    const restOfSeason = schedule.slice(3)
    
    const averageDifficulty = schedule.reduce((sum, game) => sum + game.difficulty, 0) / schedule.length
    const favorableMatchups = schedule.filter(g => g.difficulty < 0.4).length
    const toughMatchups = schedule.filter(g => g.difficulty > 0.7).length
    
    const result: UpcomingSchedule = {
      playerId,
      playerName,
      team,
      position,
      nextThreeWeeks,
      restOfSeason,
      averageDifficulty: Math.round(averageDifficulty * 100) / 100,
      favorableMatchups,
      toughMatchups
    }
    
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
    
    return result
  }

  /**
   * Calculate strength of schedule for a team
   */
  async calculateSOS(
    teamId: string,
    teamName: string,
    currentWeek: number
  ): Promise<StrengthOfSchedule> {
    const cacheKey = `sos-${teamId}-${currentWeek}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    // Calculate SOS (in production, use actual opponent data)
    const overallSOS = 0.5 + (Math.random() * 0.3 - 0.15) // 0.35-0.65
    const remainingSOS = 0.5 + (Math.random() * 0.3 - 0.15)
    const playoffSOS = 0.5 + (Math.random() * 0.3 - 0.15)
    
    const byPosition: Record<string, number> = {
      QB: 0.5 + (Math.random() * 0.2 - 0.1),
      RB: 0.5 + (Math.random() * 0.2 - 0.1),
      WR: 0.5 + (Math.random() * 0.2 - 0.1),
      TE: 0.5 + (Math.random() * 0.2 - 0.1),
      K: 0.5 + (Math.random() * 0.2 - 0.1),
      DEF: 0.5 + (Math.random() * 0.2 - 0.1)
    }
    
    const result: StrengthOfSchedule = {
      teamId,
      teamName,
      overallSOS: Math.round(overallSOS * 100) / 100,
      remainingSOS: Math.round(remainingSOS * 100) / 100,
      playoffSOS: Math.round(playoffSOS * 100) / 100,
      byPosition: Object.fromEntries(
        Object.entries(byPosition).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
      ranking: Math.floor(Math.random() * 32) + 1
    }
    
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
    
    return result
  }

  /**
   * Get position-specific SOS
   */
  async getPositionSOS(
    position: string,
    currentWeek: number
  ): Promise<Record<string, number>> {
    // Returns SOS for each NFL team against this position
    const teams = this.getNFLTeams()
    const sos: Record<string, number> = {}
    
    teams.forEach(team => {
      // In production, calculate based on actual defensive stats
      sos[team] = 0.5 + (Math.random() * 0.4 - 0.2) // 0.3-0.7
    })
    
    return sos
  }

  /**
   * Generate schedule for a team
   */
  private async generateSchedule(
    team: string,
    position: string,
    currentWeek: number
  ): Promise<ScheduleDifficulty[]> {
    const schedule: ScheduleDifficulty[] = []
    const opponents = this.getOpponents(team)
    
    // Generate remaining schedule (weeks currentWeek to 18)
    for (let week = currentWeek; week <= 18; week++) {
      const opponent = opponents[(week - currentWeek) % opponents.length]
      const difficulty = this.calculateMatchupDifficulty(opponent, position)
      
      schedule.push({
        week,
        opponent,
        difficulty: Math.round(difficulty * 100) / 100,
        rating: this.getDifficultyRating(difficulty),
        positionRankings: this.getOpponentRankings(opponent)
      })
    }
    
    return schedule
  }

  /**
   * Calculate matchup difficulty
   */
  private calculateMatchupDifficulty(opponent: string, position: string): number {
    // In production, use actual defensive rankings
    // For now, simulate based on team strength
    const strongDefenses = ['SF', 'BAL', 'BUF', 'DAL', 'CLE', 'NYJ']
    const weakDefenses = ['ARI', 'CAR', 'DEN', 'LV', 'NYG', 'WAS']
    
    let baseDifficulty = 0.5
    
    if (strongDefenses.includes(opponent)) {
      baseDifficulty = 0.7 + Math.random() * 0.2
    } else if (weakDefenses.includes(opponent)) {
      baseDifficulty = 0.2 + Math.random() * 0.2
    } else {
      baseDifficulty = 0.4 + Math.random() * 0.3
    }
    
    return Math.min(1, Math.max(0, baseDifficulty))
  }

  /**
   * Get difficulty rating
   */
  private getDifficultyRating(difficulty: number): ScheduleDifficulty['rating'] {
    if (difficulty < 0.3) return 'EASY'
    if (difficulty < 0.5) return 'MODERATE'
    if (difficulty < 0.7) return 'HARD'
    return 'VERY_HARD'
  }

  /**
   * Get opponent defensive rankings by position
   */
  private getOpponentRankings(opponent: string): Record<string, number> {
    return {
      QB: Math.floor(Math.random() * 32) + 1,
      RB: Math.floor(Math.random() * 32) + 1,
      WR: Math.floor(Math.random() * 32) + 1,
      TE: Math.floor(Math.random() * 32) + 1,
      K: Math.floor(Math.random() * 32) + 1,
      DEF: Math.floor(Math.random() * 32) + 1
    }
  }

  /**
   * Get opponents for a team (simplified)
   */
  private getOpponents(team: string): string[] {
    const allTeams = this.getNFLTeams().filter(t => t !== team)
    return allTeams.slice(0, 17) // 17 game schedule
  }

  /**
   * Get all NFL teams
   */
  private getNFLTeams(): string[] {
    return [
      'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
      'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
      'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
      'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'
    ]
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService()
